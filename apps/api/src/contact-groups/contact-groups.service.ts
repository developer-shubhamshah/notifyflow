import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactGroupDto } from './dto/create-contact-group.dto';
import { UpdateContactGroupDto } from './dto/update-contact-group.dto';

@Injectable()
export class ContactGroupsService {
    constructor(private readonly prisma: PrismaService) { }

    private async verifyBrandAccess(userId: string, brandId: string) {
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
                isActive: true,
            },
        });

        if (!brand) {
            throw new NotFoundException('Brand not found or access denied');
        }

        if (!brand.isActive) {
            throw new BadRequestException('This brand is inactive');
        }

        return brand;
    }

    async create(
        userId: string,
        brandId: string,
        dto: CreateContactGroupDto,
    ) {
        await this.verifyBrandAccess(userId, brandId);

        const name = dto.name.trim();

        if (name.length < 2) {
            throw new BadRequestException(
                'Contact group name must contain at least 2 characters',
            );
        }

        try {
            return await this.prisma.contactGroup.create({
                data: {
                    brandId,
                    name,
                    description: dto.description?.trim() || null,
                },
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException(
                    'A contact group with this name already exists in this brand',
                );
            }

            throw error;
        }
    }

    async findAll(userId: string, brandId: string) {
        await this.verifyBrandAccess(userId, brandId);

        return this.prisma.contactGroup.findMany({
            where: {
                brandId,
                isActive: true,
            },
            include: {
                _count: {
                    select: {
                        members: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async addContact(
        userId: string,
        brandId: string,
        groupId: string,
        contactId: string,
    ) {
        await this.verifyBrandAccess(userId, brandId);

        // Verify that the group belongs to this brand
        const group = await this.prisma.contactGroup.findFirst({
            where: {
                id: groupId,
                brandId,
                isActive: true,
            },
        });

        if (!group) {
            throw new NotFoundException('Contact group not found or inactive');
        }

        // Verify that the contact belongs to the same brand
        const contact = await this.prisma.contact.findFirst({
            where: {
                id: contactId,
                brandId,
                isActive: true,
            },
        });

        if (!contact) {
            throw new NotFoundException(
                'Contact not found, inactive, or does not belong to this brand',
            );
        }

        try {
            return await this.prisma.contactGroupMember.create({
                data: {
                    groupId,
                    contactId,
                },
                include: {
                    contact: true,
                },
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException(
                    'This contact is already a member of this group',
                );
            }

            throw error;
        }
    }

    async findGroupContacts(
        userId: string,
        brandId: string,
        groupId: string,
    ) {
        await this.verifyBrandAccess(userId, brandId);

        // Verify that the group belongs to this brand
        const group = await this.prisma.contactGroup.findFirst({
            where: {
                id: groupId,
                brandId,
                isActive: true,
            },
        });

        if (!group) {
            throw new NotFoundException('Contact group not found or inactive');
        }

        // Return only active contacts
        return this.prisma.contactGroupMember.findMany({
            where: {
                groupId,
                contact: {
                    isActive: true,
                },
            },
            include: {
                contact: true,
            },
            orderBy: {
                addedAt: 'desc',
            },
        });
    }

    async removeContact(
        userId: string,
        brandId: string,
        groupId: string,
        contactId: string,
    ) {
        await this.verifyBrandAccess(userId, brandId);

        const group = await this.prisma.contactGroup.findFirst({
            where: {
                id: groupId,
                brandId,
                isActive: true,
            },
        });

        if (!group) {
            throw new NotFoundException('Contact group not found or inactive');
        }

        const membership = await this.prisma.contactGroupMember.findFirst({
            where: {
                groupId,
                contactId,
            },
        });

        if (!membership) {
            throw new NotFoundException(
                'Contact is not a member of this group',
            );
        }

        await this.prisma.contactGroupMember.delete({
            where: {
                id: membership.id,
            },
        });

        return {
            message: 'Contact removed from group successfully',
            groupId,
            contactId,
        };
    }

    async findOne(
        userId: string,
        brandId: string,
        groupId: string,
    ) {
        await this.verifyBrandAccess(userId, brandId);

        const group = await this.prisma.contactGroup.findFirst({
            where: {
                id: groupId,
                brandId,
                isActive: true,
            },
            include: {
                _count: {
                    select: {
                        members: {
                            where: {
                                contact: {
                                    isActive: true,
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!group) {
            throw new NotFoundException('Contact group not found');
        }

        return group;
    }

    async update(
        userId: string,
        brandId: string,
        groupId: string,
        dto: UpdateContactGroupDto,
    ) {
        await this.verifyBrandAccess(userId, brandId);

        const group = await this.prisma.contactGroup.findFirst({
            where: {
                id: groupId,
                brandId,
                isActive: true,
            },
        });

        if (!group) {
            throw new NotFoundException('Contact group not found');
        }

        if (dto.name === undefined && dto.description === undefined) {
            throw new BadRequestException(
                'At least one field (name or description) is required',
            );
        }

        const data: Prisma.ContactGroupUpdateInput = {};

        if (dto.name !== undefined) {
            const name = dto.name.trim();

            if (name.length < 2) {
                throw new BadRequestException(
                    'Group name must contain at least 2 characters',
                );
            }

            data.name = name;
        }

        if (dto.description !== undefined) {
            data.description = dto.description.trim() || null;
        }

        try {
            return await this.prisma.contactGroup.update({
                where: { id: groupId },
                data,
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException(
                    'A contact group with this name already exists',
                );
            }

            throw error;
        }
    }

    async remove(
        userId: string,
        brandId: string,
        groupId: string,
    ) {
        await this.verifyBrandAccess(userId, brandId);

        const group = await this.prisma.contactGroup.findFirst({
            where: {
                id: groupId,
                brandId,
                isActive: true,
            },
        });

        if (!group) {
            throw new NotFoundException('Contact group not found');
        }

        await this.prisma.contactGroup.update({
            where: { id: groupId },
            data: {
                isActive: false,
            },
        });

        return {
            message: 'Contact group deactivated successfully',
            groupId,
        };
    }
}