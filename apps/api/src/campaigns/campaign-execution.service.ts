
import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import {
    CampaignStatus,
    MessageStatus,
    MessagingChannel,
    Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CampaignExecutionService {
    constructor(private readonly prisma: PrismaService) { }

    async createRecipientSnapshot(
        userId: string,
        brandId: string,
        campaignId: string,
    ) {
        // 1. Verify brand access and fetch campaign.
        const campaign = await this.prisma.campaign.findFirst({
            where: {
                id: campaignId,
                brandId,
                brand: {
                    isActive: true,
                    account: {
                        members: {
                            some: { userId },
                        },
                    },
                },
            },
            include: {
                channels: true,
                groups: {
                    include: {
                        group: {
                            select: {
                                id: true,
                                isActive: true,
                            },
                        },
                    },
                },
            },
        });

        if (!campaign) {
            throw new NotFoundException(
                'Campaign not found or you do not have access',
            );
        }

        if (campaign.status !== CampaignStatus.DRAFT) {
            throw new BadRequestException(
                'Recipient snapshot can only be created for draft campaigns',
            );
        }

        if (campaign.channels.length === 0) {
            throw new BadRequestException(
                'Campaign must have at least one channel',
            );
        }

        if (campaign.groups.length === 0) {
            throw new BadRequestException(
                'Campaign must have at least one contact group',
            );
        }

        if (campaign.groups.some((item) => !item.group.isActive)) {
            throw new BadRequestException(
                'One or more campaign contact groups are inactive',
            );
        }

        // 2. Fetch active contacts from all selected groups.
        // A Set ensures a contact in multiple groups appears only once.
        const memberships = await this.prisma.contactGroupMember.findMany({
            where: {
                groupId: {
                    in: campaign.groups.map((item) => item.groupId),
                },
                contact: {
                    brandId,
                    isActive: true,
                },
            },
            select: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        mobile: true,
                        whatsappConsent: true,
                        smsConsent: true,
                        emailConsent: true,
                    },
                },
            },
        });

        const contacts = Array.from(
            new Map(
                memberships.map((membership) => [
                    membership.contact.id,
                    membership.contact,
                ]),
            ).values(),
        );

        if (contacts.length === 0) {
            throw new BadRequestException(
                'No active contacts found in the selected groups',
            );
        }

        // 3. Create one recipient snapshot per contact.
        // Create one message record for every selected channel.
        const result = await this.prisma.$transaction(
            async (tx) => {
                const recipients = await tx.campaignRecipient.createMany({
                    data: contacts.map((contact) => ({
                        campaignId,
                        contactId: contact.id,
                        firstName: contact.firstName,
                        lastName: contact.lastName,
                        email: contact.email,
                        mobile: contact.mobile,
                    })),
                    skipDuplicates: true,
                });

                // Fetch persisted snapshots, including existing ones.
                const savedRecipients = await tx.campaignRecipient.findMany({
                    where: { campaignId },
                    select: {
                        id: true,
                        contactId: true,
                        email: true,
                        mobile: true,
                    },
                });

                const recipientByContactId = new Map(
                    savedRecipients
                        .filter((recipient) => recipient.contactId !== null)
                        .map((recipient) => [
                            recipient.contactId!,
                            recipient,
                        ]),
                );

                const messageData: Prisma.MessageCreateManyInput[] = [];

                const counts: Record<
                    string,
                    { eligible: number; skipped: number }
                > = {};

                for (const channelConfig of campaign.channels) {
                    const channel = channelConfig.channel;

                    counts[channel] = {
                        eligible: 0,
                        skipped: 0,
                    };

                    for (const contact of contacts) {
                        const recipient = recipientByContactId.get(contact.id);

                        if (!recipient) {
                            continue;
                        }

                        let skipReason: string | null = null;

                        switch (channel) {
                            case MessagingChannel.WHATSAPP:
                                if (!recipient.mobile) {
                                    skipReason = 'MISSING_MOBILE';
                                } else if (!contact.whatsappConsent) {
                                    skipReason = 'WHATSAPP_CONSENT_NOT_GRANTED';
                                }
                                break;

                            case MessagingChannel.SMS:
                                if (!recipient.mobile) {
                                    skipReason = 'MISSING_MOBILE';
                                } else if (!contact.smsConsent) {
                                    skipReason = 'SMS_CONSENT_NOT_GRANTED';
                                }
                                break;

                            case MessagingChannel.EMAIL:
                                if (!recipient.email) {
                                    skipReason = 'MISSING_EMAIL';
                                } else if (!contact.emailConsent) {
                                    skipReason = 'EMAIL_CONSENT_NOT_GRANTED';
                                }
                                break;
                        }

                        if (skipReason) {
                            counts[channel].skipped++;
                        } else {
                            counts[channel].eligible++;
                        }

                        messageData.push({
                            recipientId: recipient.id,
                            campaignChannelId: channelConfig.id,
                            status: skipReason
                                ? MessageStatus.SKIPPED
                                : MessageStatus.PENDING,
                            skipReason,
                        });
                    }
                }

                // Unique constraint prevents duplicate messages for a
                // recipient and campaign channel.
                const messages = await tx.message.createMany({
                    data: messageData,
                    skipDuplicates: true,
                });

                return {
                    recipientCount: recipients.count,
                    messageCount: messages.count,
                    channelCounts: counts,
                };
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            },
        );

        return {
            message: 'Campaign recipient snapshot created successfully',
            campaignId,
            ...result,
        };
    }

    async getCampaignPreview(
        userId: string,
        brandId: string,
        campaignId: string,
    ) {
        const campaign = await this.prisma.campaign.findFirst({
            where: {
                id: campaignId,
                brandId,
                brand: {
                    isActive: true,
                    account: {
                        members: {
                            some: { userId },
                        },
                    },
                },
            },
            select: {
                id: true,
                name: true,
                status: true,
                channels: {
                    select: {
                        channel: true,
                    },
                },
                recipients: {
                    select: {
                        id: true,
                        messages: {
                            select: {
                                status: true,
                                skipReason: true,
                                campaignChannel: {
                                    select: {
                                        channel: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!campaign) {
            throw new NotFoundException(
                'Campaign not found or you do not have access',
            );
        }

        const channels = campaign.channels.map((item) => {
            const channelMessages = campaign.recipients.flatMap((recipient) =>
                recipient.messages.filter(
                    (message) => message.campaignChannel.channel === item.channel,
                ),
            );

            const statusCounts: Record<string, number> = {};
            const skipReasons: Record<string, number> = {};

            let eligible = 0;
            let skipped = 0;

            for (const message of channelMessages) {
                const status = message.status;

                statusCounts[status] = (statusCounts[status] ?? 0) + 1;

                if (
                    status === MessageStatus.PENDING ||
                    status === MessageStatus.QUEUED
                ) {
                    eligible++;
                }

                if (status === MessageStatus.SKIPPED) {
                    skipped++;

                    if (message.skipReason) {
                        skipReasons[message.skipReason] =
                            (skipReasons[message.skipReason] ?? 0) + 1;
                    }
                }
            }

            return {
                channel: item.channel,
                prepared: channelMessages.length > 0,
                total: channelMessages.length,
                eligible,
                skipped,
                other: channelMessages.length - eligible - skipped,
                statusCounts,
                skipReasons,
            };
        });

        return {
            campaignId: campaign.id,
            campaignName: campaign.name,
            status: campaign.status,
            prepared: channels.length > 0 && channels.every((item) => item.prepared),
            totalRecipients: campaign.recipients.length,
            channels,
            previewNote:
                'Eligibility reflects checks performed when the recipient snapshot was prepared. Consent and suppression must be checked again before sending.',
        };
    }

    async getCampaignReadiness(
        userId: string,
        brandId: string,
        campaignId: string,
    ) {
        const campaign = await this.prisma.campaign.findFirst({
            where: {
                id: campaignId,
                brandId,
                brand: {
                    isActive: true,
                    account: {
                        members: {
                            some: { userId },
                        },
                    },
                },
            },
            select: {
                id: true,
                name: true,
                status: true,
                channels: {
                    select: {
                        channel: true,
                        content: true,
                    },
                },
                recipients: {
                    select: {
                        messages: {
                            select: {
                                status: true,
                                campaignChannel: {
                                    select: {
                                        channel: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!campaign) {
            throw new NotFoundException(
                'Campaign not found or you do not have access',
            );
        }

        const blockers: string[] = [];

        if (campaign.status !== CampaignStatus.DRAFT) {
            blockers.push('CAMPAIGN_MUST_BE_IN_DRAFT_STATUS');
        }

        if (campaign.channels.length === 0) {
            blockers.push('NO_CHANNELS_CONFIGURED');
        }

        if (campaign.recipients.length === 0) {
            blockers.push('RECIPIENTS_NOT_PREPARED');
        }

        const channelResults = campaign.channels.map((channelConfig) => {
            const messages = campaign.recipients.flatMap((recipient) =>
                recipient.messages.filter(
                    (message) =>
                        message.campaignChannel.channel === channelConfig.channel,
                ),
            );

            const eligible = messages.filter(
                (message) =>
                    message.status === MessageStatus.PENDING ||
                    message.status === MessageStatus.QUEUED,
            ).length;

            const skipped = messages.filter(
                (message) => message.status === MessageStatus.SKIPPED,
            ).length;

            const content = channelConfig.content;

            const hasContent =
                content !== null &&
                typeof content === 'object' &&
                !Array.isArray(content) &&
                Object.keys(content).length > 0;

            const channelBlockers: string[] = [];

            if (messages.length === 0) {
                channelBlockers.push('RECIPIENTS_NOT_PREPARED_FOR_CHANNEL');
            }

            if (eligible === 0) {
                channelBlockers.push('NO_ELIGIBLE_RECIPIENTS');
            }

            if (!hasContent) {
                channelBlockers.push('CHANNEL_CONTENT_MISSING');
            }

            // Provider configuration is not implemented in the current schema.
            channelBlockers.push('PROVIDER_CONFIGURATION_NOT_IMPLEMENTED');

            return {
                channel: channelConfig.channel,
                total: messages.length,
                eligible,
                skipped,
                contentConfigured: hasContent,
                providerConfiguration: 'NOT_IMPLEMENTED',
                ready: channelBlockers.length === 0,
                blockers: channelBlockers,
            };
        });

        const totalEligible = channelResults.reduce(
            (total, channel) => total + channel.eligible,
            0,
        );

        if (totalEligible === 0) {
            blockers.push('NO_ELIGIBLE_RECIPIENTS_ACROSS_CHANNELS');
        }

        if (
            channelResults.some((channel) =>
                channel.blockers.includes('CHANNEL_CONTENT_MISSING'),
            )
        ) {
            blockers.push('ONE_OR_MORE_CHANNELS_HAVE_MISSING_CONTENT');
        }

        // Provider configuration is a known missing feature.
        blockers.push('PROVIDER_CONFIGURATION_NOT_IMPLEMENTED');

        return {
            campaignId: campaign.id,
            campaignName: campaign.name,
            status: campaign.status,
            ready: blockers.length === 0,
            totalRecipients: campaign.recipients.length,
            totalEligible,
            channels: channelResults,
            blockers: [...new Set(blockers)],
            note:
                'Readiness validation is read-only. Provider configuration checks will become available after provider configuration is implemented. Consent and suppression must be rechecked before sending.',
        };
    }
}
