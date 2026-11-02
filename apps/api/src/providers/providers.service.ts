import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { createHmac } from 'crypto';

import {
    AccountRole,
    Prisma,
    ProviderStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CredentialEncryptionService } from './credential-encryption.service';

import {
    CreateProviderConfigDto,
    ProviderName,
} from './dto/create-provider-config.dto';

import { UpdateProviderConfigDto } from './dto/update-provider-config.dto';
import { EncryptedCredentials } from './credential-encryption.service';
import { MetaWhatsAppAdapter } from './adapters/meta-whatsapp.adapter';
import { ProviderConnectionStatus } from './dto/provider-connection-result.dto';

@Injectable()
export class ProvidersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly encryptionService: CredentialEncryptionService,
        private readonly metaWhatsAppAdapter: MetaWhatsAppAdapter,
    ) { }

    private readonly safeSelect = {
        id: true,
        brandId: true,
        channel: true,
        provider: true,
        status: true,
        senderId: true,
        senderName: true,
        providerAccountId: true,
        lastTestedAt: true,
        connectionStatus: true,
        connectionMessage: true,
        createdAt: true,
        updatedAt: true,
    } satisfies Prisma.BrandProviderConfigSelect;

    private validateProvider(
        channel: CreateProviderConfigDto['channel'],
        provider: ProviderName,
    ) {
        const supportedProviders: Record<string, ProviderName[]> = {
            WHATSAPP: [ProviderName.META],
            SMS: [ProviderName.MSG91, ProviderName.TWILIO],
            EMAIL: [ProviderName.AWS_SES, ProviderName.SENDGRID],
        };

        if (!supportedProviders[channel]?.includes(provider)) {
            throw new BadRequestException(
                `Provider ${provider} is not supported for channel ${channel}.`,
            );
        }
    }

    private async verifyBrandAccess(
        userId: string,
        brandId: string,
        requireAdmin = false,
    ) {
        const brand = await this.prisma.brand.findFirst({
            where: {
                id: brandId,
                account: {
                    members: {
                        some: { userId },
                    },
                },
            },
            select: {
                id: true,
                accountId: true,
                isActive: true,
            },
        });

        if (!brand) {
            throw new NotFoundException('Brand not found.');
        }

        if (!brand.isActive) {
            throw new BadRequestException(
                'Cannot manage provider configurations for an inactive brand.',
            );
        }

        if (requireAdmin) {
            const membership = await this.prisma.accountUser.findUnique({
                where: {
                    accountId_userId: {
                        accountId: brand.accountId,
                        userId,
                    },
                },
                select: { role: true },
            });

            if (
                !membership ||
                (
                    membership.role !== AccountRole.OWNER &&
                    membership.role !== AccountRole.ADMIN
                )
            ) {
                throw new ForbiddenException(
                    'Only account owners and admins can manage provider configurations.',
                );
            }
        }

        return brand;
    }

    private toPrismaJson(
        credentials: EncryptedCredentials,
    ): Prisma.InputJsonObject {
        return {
            version: credentials.version,
            algorithm: credentials.algorithm,
            iv: credentials.iv,
            authTag: credentials.authTag,
            ciphertext: credentials.ciphertext,
        };
    }

    private generateConnectionFingerprint(config: {
        provider: string;
        channel: string;
        credentials: Record<string, string>;
        senderId: string | null;
        senderName: string | null;
        providerAccountId: string | null;
    }): string {
        const secret = process.env.PROVIDER_FINGERPRINT_KEY;

        if (!secret || secret.length < 64) {
            throw new Error(
                'PROVIDER_FINGERPRINT_KEY must be configured with at least 32 bytes of secret material.',
            );
        }

        const fingerprintData = JSON.stringify({
            provider: config.provider,
            channel: config.channel,
            credentials: config.credentials,
            senderId: config.senderId,
            senderName: config.senderName,
            providerAccountId: config.providerAccountId,
        });

        return createHmac('sha256', Buffer.from(secret, 'hex'))
            .update(fingerprintData)
            .digest('hex');
    }

    async create(
        userId: string,
        brandId: string,
        dto: CreateProviderConfigDto,
    ) {
        await this.verifyBrandAccess(userId, brandId, true);

        this.validateProvider(dto.channel, dto.provider);

        if (dto.status === ProviderStatus.ACTIVE) {
            throw new BadRequestException(
                'Provider configuration cannot be activated before connection validation is implemented.',
            );
        }

        const encryptedCredentials = this.encryptionService.encrypt(
            dto.credentials,
        );

        try {
            const config = await this.prisma.brandProviderConfig.create({
                data: {
                    brandId,
                    channel: dto.channel,
                    provider: dto.provider,
                    status: ProviderStatus.INACTIVE,
                    credentials: this.toPrismaJson(encryptedCredentials),
                    senderId: dto.senderId,
                    senderName: dto.senderName,
                    providerAccountId: dto.providerAccountId,
                },
                select: this.safeSelect,
            });

            return {
                message: 'Provider configuration created successfully.',
                config,
            };
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException(
                    `A provider configuration already exists for ${dto.channel} on this brand.`,
                );
            }

            throw error;
        }
    }

    async findAll(userId: string, brandId: string) {
        await this.verifyBrandAccess(userId, brandId);

        const configs = await this.prisma.brandProviderConfig.findMany({
            where: { brandId },
            select: this.safeSelect,
            orderBy: { createdAt: 'desc' },
        });

        return {
            message: 'Provider configurations fetched successfully.',
            count: configs.length,
            configs,
        };
    }

    async findOne(
        userId: string,
        brandId: string,
        providerId: string,
    ) {
        await this.verifyBrandAccess(userId, brandId);

        const config = await this.prisma.brandProviderConfig.findFirst({
            where: {
                id: providerId,
                brandId,
            },
            select: this.safeSelect,
        });

        if (!config) {
            throw new NotFoundException(
                'Provider configuration not found.',
            );
        }

        return {
            message: 'Provider configuration fetched successfully.',
            config,
        };
    }


    async update(
        userId: string,
        brandId: string,
        providerId: string,
        dto: UpdateProviderConfigDto,
    ) {
        await this.verifyBrandAccess(userId, brandId, true);

        const existing = await this.prisma.brandProviderConfig.findFirst({
            where: {
                id: providerId,
                brandId,
            },
        });

        if (!existing) {
            throw new NotFoundException(
                'Provider configuration not found.',
            );
        }

        const provider = dto.provider ?? existing.provider as ProviderName;

        this.validateProvider(
            existing.channel,
            provider,
        );

        // Activation will be handled by a separate endpoint.
        if (dto.status === ProviderStatus.ACTIVE) {
            throw new BadRequestException(
                'Use the provider activation endpoint to activate a provider.',
            );
        }

        const connectionSettingsChanged =
            dto.provider !== undefined ||
            dto.credentials !== undefined ||
            dto.senderId !== undefined ||
            dto.senderName !== undefined ||
            dto.providerAccountId !== undefined;

        const data: Prisma.BrandProviderConfigUpdateInput = {};

        if (dto.provider !== undefined) {
            data.provider = dto.provider;
        }

        if (dto.status !== undefined) {
            data.status = dto.status;
        }

        if (dto.credentials !== undefined) {
            data.credentials = this.toPrismaJson(
                this.encryptionService.encrypt(dto.credentials),
            );
        }

        if (dto.senderId !== undefined) {
            data.senderId = dto.senderId;
        }

        if (dto.senderName !== undefined) {
            data.senderName = dto.senderName;
        }

        if (dto.providerAccountId !== undefined) {
            data.providerAccountId = dto.providerAccountId;
        }

        // Invalidate previous connection test.
        if (connectionSettingsChanged) {
            data.configurationVersion = {
                increment: 1,
            };

            // Invalidate previous connection test.
            data.lastTestedAt = null;
            data.connectionStatus = null;
            data.connectionMessage = null;
            data.connectionFingerprint = null;

            // Require a fresh connection test before activation.
            data.status = ProviderStatus.INACTIVE;
        }

        const config = await this.prisma.brandProviderConfig.update({
            where: { id: providerId },
            data,
            select: this.safeSelect,
        });

        return {
            message: 'Provider configuration updated successfully.',
            config,
        };
    }


    async remove(
        userId: string,
        brandId: string,
        providerId: string,
    ) {
        await this.verifyBrandAccess(userId, brandId, true);

        const existing = await this.prisma.brandProviderConfig.findFirst({
            where: {
                id: providerId,
                brandId,
            },
            select: { id: true },
        });

        if (!existing) {
            throw new NotFoundException(
                'Provider configuration not found.',
            );
        }

        await this.prisma.brandProviderConfig.delete({
            where: { id: providerId },
        });

        return {
            message: 'Provider configuration deleted successfully.',
        };
    }

    async testConnection(
        userId: string,
        brandId: string,
        providerId: string,
    ) {
        await this.verifyBrandAccess(userId, brandId, true);

        const config = await this.prisma.brandProviderConfig.findFirst({
            where: {
                id: providerId,
                brandId,
            },
        });

        if (!config) {
            throw new NotFoundException(
                'Provider configuration not found.',
            );
        }

        const testedConfigurationVersion = config.configurationVersion;

        const testedAt = new Date();


        const credentials = this.encryptionService.decrypt(
            config.credentials as unknown as EncryptedCredentials,
        );

        let result: { success: boolean; message: string };

        if (
            config.channel === 'WHATSAPP' &&
            config.provider === 'META'
        ) {
            result = await this.metaWhatsAppAdapter.testConnection({
                provider: config.provider,
                channel: config.channel,
                credentials,
                senderId: config.senderId,
                senderName: config.senderName,
                providerAccountId: config.providerAccountId,
            });
        } else {
            throw new BadRequestException(
                `Connection testing is not yet implemented for ${config.provider}.`,
            );
        }

        const connectionFingerprint =
            this.generateConnectionFingerprint({
                provider: config.provider,
                channel: config.channel,
                credentials,
                senderId: config.senderId,
                senderName: config.senderName,
                providerAccountId: config.providerAccountId,
            });

        const updateResult =
            await this.prisma.brandProviderConfig.updateMany({
                where: {
                    id: providerId,
                    brandId,
                    configurationVersion: testedConfigurationVersion,
                },
                data: {
                    lastTestedAt: testedAt,
                    connectionStatus: result.success ? 'SUCCESS' : 'FAILED',
                    connectionMessage: result.message,
                    connectionFingerprint,
                },
            });

        if (updateResult.count === 0) {
            throw new ConflictException(
                'Provider configuration changed while connection testing was in progress. Please test the connection again.',
            );
        }

        return {
            status: result.success ? 'SUCCESS' : 'FAILED',
            provider: config.provider,
            channel: config.channel,
            message: result.message,
            testedAt: testedAt.toISOString(),
        };

    }

    async activate(
        userId: string,
        brandId: string,
        providerId: string,
    ) {
        await this.verifyBrandAccess(userId, brandId, true);

        const config = await this.prisma.brandProviderConfig.findFirst({
            where: {
                id: providerId,
                brandId,
            },
        });

        if (!config) {
            throw new NotFoundException(
                'Provider configuration not found.',
            );
        }

        if (config.status === ProviderStatus.ACTIVE) {
            throw new BadRequestException(
                'Provider is already active.',
            );
        }

        if (config.connectionStatus !== 'SUCCESS') {
            throw new BadRequestException(
                'Provider must pass connection validation before activation.',
            );
        }

        if (!config.lastTestedAt || !config.connectionFingerprint) {
            throw new BadRequestException(
                'Provider connection test information is missing. Test the connection again.',
            );
        }

        // Successful test must be recent (within 15 minutes).
        const maxTestAgeMs = 15 * 60 * 1000;
        const testAgeMs = Date.now() - config.lastTestedAt.getTime();

        if (testAgeMs < 0 || testAgeMs > maxTestAgeMs) {
            throw new BadRequestException(
                'Provider connection test has expired. Test the connection again.',
            );
        }

        const credentials = this.encryptionService.decrypt(
            config.credentials as unknown as EncryptedCredentials,
        );

        const currentFingerprint = this.generateConnectionFingerprint({
            provider: config.provider,
            channel: config.channel,
            credentials,
            senderId: config.senderId,
            senderName: config.senderName,
            providerAccountId: config.providerAccountId,
        });

        if (currentFingerprint !== config.connectionFingerprint) {
            throw new BadRequestException(
                'Provider configuration has changed. Test the connection again.',
            );
        }

        const activatedConfig = await this.prisma.brandProviderConfig.update({
            where: {
                id: providerId,
            },
            data: {
                status: ProviderStatus.ACTIVE,
            },
            select: this.safeSelect,
        });

        return {
            message: 'Provider activated successfully.',
            config: activatedConfig,
        };
    }

    async deactivate(
        userId: string,
        brandId: string,
        providerId: string,
    ) {
        await this.verifyBrandAccess(userId, brandId, true);

        const config = await this.prisma.brandProviderConfig.findFirst({
            where: {
                id: providerId,
                brandId,
            },
        });

        if (!config) {
            throw new NotFoundException(
                'Provider configuration not found.',
            );
        }

        if (config.status === ProviderStatus.INACTIVE) {
            throw new BadRequestException(
                'Provider is already inactive.',
            );
        }

        const deactivatedConfig =
            await this.prisma.brandProviderConfig.update({
                where: {
                    id: providerId,
                },
                data: {
                    status: ProviderStatus.INACTIVE,
                },
                select: this.safeSelect,
            });

        return {
            message: 'Provider deactivated successfully.',
            config: deactivatedConfig,
        };
    }
}
