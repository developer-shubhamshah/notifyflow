
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Verify that the user belongs to the account
     * that owns the requested brand.
     */
    private async verifyBrandAccess(userId: string, brandId: string) {
        const brand = await this.prisma.brand.findFirst({
            where: {
                id: brandId,
                account: {
                    members: {
                        some: {
                            userId,
                        },
                    },
                },
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
            throw new BadRequestException('Cannot manage contacts for an inactive brand');
        }

        return brand;
    }

    /**
     * Create a contact under a brand.
     */
    async create(userId: string, brandId: string, dto: CreateContactDto) {
        await this.verifyBrandAccess(userId, brandId);

        // Consent requires the corresponding contact information.
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

                    whatsappConsentAt: dto.whatsappConsent ? new Date() : null,
                    smsConsentAt: dto.smsConsent ? new Date() : null,
                    emailConsentAt: dto.emailConsent ? new Date() : null,
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
     * Get all active contacts belonging to a brand.
     */
    async findAll(userId: string, brandId: string) {
        await this.verifyBrandAccess(userId, brandId);

        return this.prisma.contact.findMany({
            where: {
                brandId,
                isActive: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    /**
     * Get one contact belonging to a brand.
     */
    async findOne(
        userId: string,
        brandId: string,
        contactId: string,
    ) {
        await this.verifyBrandAccess(userId, brandId);

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

        return contact;
    }


    /**
     * Update an existing contact.
     */
    async update(
        userId: string,
        brandId: string,
        contactId: string,
        dto: UpdateContactDto,
    ) {
        await this.verifyBrandAccess(userId, brandId);

        const existingContact = await this.prisma.contact.findFirst({
            where: {
                id: contactId,
                brandId,
                isActive: true,
            },
        });

        if (!existingContact) {
            throw new NotFoundException('Contact not found');
        }

        if (dto.whatsappConsent === true && !(dto.mobile ?? existingContact.mobile)) {
            throw new BadRequestException(
                'Mobile number is required for WhatsApp consent',
            );
        }

        if (dto.smsConsent === true && !(dto.mobile ?? existingContact.mobile)) {
            throw new BadRequestException(
                'Mobile number is required for SMS consent',
            );
        }

        if (dto.emailConsent === true && !(dto.email ?? existingContact.email)) {
            throw new BadRequestException(
                'Email address is required for email consent',
            );
        }

        const data: Prisma.ContactUpdateInput = {};

        if (dto.firstName !== undefined) {
            data.firstName = dto.firstName.trim();
        }

        if (dto.lastName !== undefined) {
            data.lastName = dto.lastName.trim();
        }

        if (dto.email !== undefined) {
            data.email = dto.email.trim().toLowerCase();
        }

        if (dto.mobile !== undefined) {
            data.mobile = dto.mobile;
        }

        if (dto.whatsappConsent !== undefined) {
            data.whatsappConsent = dto.whatsappConsent;
            data.whatsappConsentAt = dto.whatsappConsent
                ? existingContact.whatsappConsent
                    ? existingContact.whatsappConsentAt
                    : new Date()
                : null;
        }

        if (dto.smsConsent !== undefined) {
            data.smsConsent = dto.smsConsent;
            data.smsConsentAt = dto.smsConsent
                ? existingContact.smsConsent
                    ? existingContact.smsConsentAt
                    : new Date()
                : null;
        }

        if (dto.emailConsent !== undefined) {
            data.emailConsent = dto.emailConsent;
            data.emailConsentAt = dto.emailConsent
                ? existingContact.emailConsent
                    ? existingContact.emailConsentAt
                    : new Date()
                : null;
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
    async remove(userId: string, brandId: string, contactId: string) {
        await this.verifyBrandAccess(userId, brandId);

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

}
