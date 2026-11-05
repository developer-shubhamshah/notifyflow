
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PlatformRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactQueryDto } from './dto/contact-query.dto';

@Injectable()
export class ContactsService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Verify that the user belongs to the account
     * that owns the requested brand.
     */
    private async verifyBrandAccess(
        userId: string,
        brandId: string,
        platformRole: PlatformRole,
    ) {
        const brand = await this.prisma.brand.findFirst({
            where: {
                id: brandId,
                ...(platformRole === PlatformRole.ADMIN
                    ? {}
                    : {
                          account: {
                              members: {
                                  some: { userId },
                              },
                          },
                      }),
            },
            select: {
                id: true,
                isActive: true,
            },
        });

        if (!brand) {
            throw new NotFoundException('Brand not found');
        }

        if (!brand.isActive) {
            throw new BadRequestException(
                'Cannot manage contacts for an inactive brand',
            );
        }

        return brand;
    }

    /**
     * Create a contact under a brand.
     */
    async create(
        userId: string,
        platformRole: PlatformRole,
        brandId: string,
        dto: CreateContactDto,
    ) {
        await this.verifyBrandAccess(userId, brandId, platformRole);

        if (dto.whatsappConsent && !dto.mobile) {
            throw new BadRequestException(
                'Mobile number is required for WhatsApp consent',
            );
        }

        if (dto.smsConsent && !dto.mobile) {
            throw new BadRequestException(
                'Mobile number is required for SMS consent',
            );
        }

        if (dto.emailConsent && !dto.email) {
            throw new BadRequestException(
                'Email address is required for email consent',
            );
        }

        try {
            return await this.prisma.contact.create({
                data: {
                    brandId,
                    firstName: dto.firstName.trim(),
                    lastName: dto.lastName?.trim(),
                    email: dto.email?.trim().toLowerCase(),
                    mobile: dto.mobile,

                    whatsappConsent: dto.whatsappConsent ?? false,
                    smsConsent: dto.smsConsent ?? false,
                    emailConsent: dto.emailConsent ?? false,

                    whatsappConsentAt: dto.whatsappConsent
                        ? new Date()
                        : null,
                    smsConsentAt: dto.smsConsent
                        ? new Date()
                        : null,
                    emailConsentAt: dto.emailConsent
                        ? new Date()
                        : null,
                },
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException(
                    'A contact with this mobile number already exists in this brand',
                );
            }

            throw error;
        }
    }

    /**
     * Get contacts belonging to a brand.
     */
    async findAll(
        userId: string,
        platformRole: PlatformRole,
        brandId: string,
        query: ContactQueryDto,
    ) {
        await this.verifyBrandAccess(userId, brandId, platformRole);

        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;

        const where: Prisma.ContactWhereInput = {
            brandId,
            ...(query.isActive !== undefined && {
                isActive: query.isActive,
            }),
            ...(query.search && {
                OR: [
                    {
                        firstName: {
                            contains: query.search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        lastName: {
                            contains: query.search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        email: {
                            contains: query.search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        mobile: {
                            contains: query.search,
                        },
                    },
                ],
            }),
        };

        const [contacts, total] = await this.prisma.$transaction([
            this.prisma.contact.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            this.prisma.contact.count({ where }),
        ]);

        return {
            data: contacts,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPreviousPage: page > 1,
            },
        };
    }

    /**
     * Get one contact belonging to a brand.
     */
    async findOne(
        userId: string,
        platformRole: PlatformRole,
        brandId: string,
        contactId: string,
    ) {
        await this.verifyBrandAccess(userId, brandId, platformRole);

        const contact = await this.prisma.contact.findFirst({
            where: {
                id: contactId,
                brandId,
            },
        });

        if (!contact) {
            throw new NotFoundException('Contact not found');
        }

        return contact;
    }

    /**
     * Update an existing contact.
     * Supports editing both active and inactive contacts.
     */
    async update(
        userId: string,
        platformRole: PlatformRole,
        brandId: string,
        contactId: string,
        dto: UpdateContactDto,
    ) {
        await this.verifyBrandAccess(userId, brandId, platformRole);

        // Do not filter by isActive here.
        // Inactive contacts must also be editable.
        const existingContact = await this.prisma.contact.findFirst({
            where: {
                id: contactId,
                brandId,
            },
        });

        if (!existingContact) {
            throw new NotFoundException('Contact not found');
        }

        // Calculate the final values after applying the update.
        const finalMobile =
            dto.mobile !== undefined
                ? dto.mobile
                : existingContact.mobile;

        const finalEmail =
            dto.email !== undefined
                ? dto.email
                : existingContact.email;

        const finalWhatsappConsent =
            dto.whatsappConsent !== undefined
                ? dto.whatsappConsent
                : existingContact.whatsappConsent;

        const finalSmsConsent =
            dto.smsConsent !== undefined
                ? dto.smsConsent
                : existingContact.smsConsent;

        const finalEmailConsent =
            dto.emailConsent !== undefined
                ? dto.emailConsent
                : existingContact.emailConsent;

        // Validate final contact information against consent.
        if (finalWhatsappConsent && !finalMobile) {
            throw new BadRequestException(
                'Mobile number is required for WhatsApp consent',
            );
        }

        if (finalSmsConsent && !finalMobile) {
            throw new BadRequestException(
                'Mobile number is required for SMS consent',
            );
        }

        if (finalEmailConsent && !finalEmail) {
            throw new BadRequestException(
                'Email address is required for email consent',
            );
        }

        const data: Prisma.ContactUpdateInput = {};

        if (dto.firstName !== undefined) {
            data.firstName = dto.firstName.trim();
        }

        if (dto.lastName !== undefined) {
            data.lastName = dto.lastName?.trim() ?? null;
        }

        if (dto.email !== undefined) {
            data.email = dto.email
                ? dto.email.trim().toLowerCase()
                : null;
        }

        if (dto.mobile !== undefined) {
            data.mobile = dto.mobile || null;
        }

        // Update WhatsApp consent and timestamp.
        if (dto.whatsappConsent !== undefined) {
            data.whatsappConsent = dto.whatsappConsent;

            data.whatsappConsentAt = dto.whatsappConsent
                ? existingContact.whatsappConsent
                    ? existingContact.whatsappConsentAt
                    : new Date()
                : null;
        }

        // Update SMS consent and timestamp.
        if (dto.smsConsent !== undefined) {
            data.smsConsent = dto.smsConsent;

            data.smsConsentAt = dto.smsConsent
                ? existingContact.smsConsent
                    ? existingContact.smsConsentAt
                    : new Date()
                : null;
        }

        // Update Email consent and timestamp.
        if (dto.emailConsent !== undefined) {
            data.emailConsent = dto.emailConsent;

            data.emailConsentAt = dto.emailConsent
                ? existingContact.emailConsent
                    ? existingContact.emailConsentAt
                    : new Date()
                : null;
        }

        // Update Active / Inactive status.
        if (dto.isActive !== undefined) {
            data.isActive = dto.isActive;
        }

        try {
            return await this.prisma.contact.update({
                where: {
                    id: contactId,
                },
                data,
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException(
                    'A contact with this mobile number already exists in this brand',
                );
            }

            throw error;
        }
    }

    /**
     * Soft-delete a contact.
     */
    async remove(
        userId: string,
        platformRole: PlatformRole,
        brandId: string,
        contactId: string,
    ) {
        await this.verifyBrandAccess(userId, brandId, platformRole);

        const contact = await this.prisma.contact.findFirst({
            where: {
                id: contactId,
                brandId,
                isActive: true,
            },
        });

        if (!contact) {
            throw new NotFoundException('Contact not found');
        }

        return this.prisma.contact.update({
            where: {
                id: contactId,
            },
            data: {
                isActive: false,
            },
        });
    }

    /**
     * Get contact statistics.
     */
    async getStats(
        userId: string,
        platformRole: PlatformRole,
        brandId: string,
    ) {
        await this.verifyBrandAccess(userId, brandId, platformRole);

        const [
            total,
            active,
            inactive,
            whatsappConsent,
            smsConsent,
            emailConsent,
        ] = await this.prisma.$transaction([
            this.prisma.contact.count({
                where: { brandId },
            }),

            this.prisma.contact.count({
                where: { brandId, isActive: true },
            }),

            this.prisma.contact.count({
                where: { brandId, isActive: false },
            }),

            this.prisma.contact.count({
                where: {
                    brandId,
                    isActive: true,
                    whatsappConsent: true,
                },
            }),

            this.prisma.contact.count({
                where: {
                    brandId,
                    isActive: true,
                    smsConsent: true,
                },
            }),

            this.prisma.contact.count({
                where: {
                    brandId,
                    isActive: true,
                    emailConsent: true,
                },
            }),
        ]);

        return {
            total,
            active,
            inactive,
            consent: {
                whatsapp: whatsappConsent,
                sms: smsConsent,
                email: emailConsent,
            },
        };
    }
}
