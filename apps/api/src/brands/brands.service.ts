
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import {
    AccountRole,
    UserRole,
    Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async create(
        userId: string,
        createBrandDto: CreateBrandDto,
    ) {
        const { name, description, logoUrl } = createBrandDto;

        // Generate slug from brand name.
        const slug = name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        if (!slug) {
            throw new BadRequestException(
                'Brand name must contain at least one letter or number.',
            );
        }

        // Find accounts where the user has OWNER or ADMIN access.
        const memberships =
            await this.prisma.accountUser.findMany({
                where: {
                    userId,
                    role: {
                        in: [
                            AccountRole.OWNER,
                            AccountRole.ADMIN,
                        ],
                    },
                },
                include: {
                    account: true,
                },
            });

        if (memberships.length === 0) {
            throw new ForbiddenException(
                'You do not have permission to create a brand.',
            );
        }

        // Avoid silently creating a brand in the wrong account.
        if (memberships.length > 1) {
            throw new BadRequestException(
                'Multiple accounts found. An account must be selected before creating a brand.',
            );
        }

        const accountId = memberships[0].accountId;

        try {
            // Create Brand and BrandUser atomically.
            const brand = await this.prisma.brand.create({
                data: {
                    name: name.trim(),
                    slug,
                    description: description?.trim(),
                    logoUrl,
                    ownerId: userId,
                    accountId,

                    members: {
                        create: {
                            userId,
                            role: UserRole.OWNER,
                        },
                    },
                },
                include: {
                    account: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    members: {
                        select: {
                            userId: true,
                            role: true,
                        },
                    },
                },
            });

            return {
                message: 'Brand created successfully',
                brand,
            };
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException(
                    'A brand with this name already exists in your account.',
                );
            }

            throw error;
        }
    }

    async findAll(userId: string) {
        const memberships =
            await this.prisma.accountUser.findMany({
                where: { userId },
                select: {
                    accountId: true,
                },
            });

        const accountIds = memberships.map(
            (membership) => membership.accountId,
        );

        const brands = await this.prisma.brand.findMany({
            where: {
                accountId: {
                    in: accountIds,
                },
            },
            include: {
                account: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                members: {
                    select: {
                        userId: true,
                        role: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return {
            message: 'Brands fetched successfully',
            count: brands.length,
            brands,
        };
    }

    async findOne(userId: string, brandId: string) {
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
            include: {
                account: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                members: {
                    select: {
                        userId: true,
                        role: true,
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        if (!brand) {
            throw new NotFoundException(
                'Brand not found.',
            );
        }

        return {
            message: 'Brand fetched successfully',
            brand,
        };
    }

    async update(
        userId: string,
        brandId: string,
        updateBrandDto: UpdateBrandDto,
    ) {
        // 1. Find brand and verify account membership
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
                accountId: true,
            },
        });

        if (!brand) {
            throw new NotFoundException('Brand not found.');
        }

        // 2. Verify account OWNER / ADMIN permission
        const membership =
            await this.prisma.accountUser.findUnique({
                where: {
                    accountId_userId: {
                        accountId: brand.accountId,
                        userId,
                    },
                },
                select: {
                    role: true,
                },
            });

        if (
            !membership ||
            (
                membership.role !== AccountRole.OWNER &&
                membership.role !== AccountRole.ADMIN
            )
        ) {
            throw new ForbiddenException(
                'You do not have permission to update this brand.',
            );
        }

        // 3. Prepare update data
        const { name, description, logoUrl, isActive } =
            updateBrandDto;

        const data: Prisma.BrandUpdateInput = {};

        if (name !== undefined) {
            const trimmedName = name.trim();

            const slug = trimmedName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            if (!slug) {
                throw new BadRequestException(
                    'Brand name must contain at least one letter or number.',
                );
            }

            data.name = trimmedName;
            data.slug = slug;
        }

        if (description !== undefined) {
            data.description = description.trim();
        }

        if (logoUrl !== undefined) {
            data.logoUrl = logoUrl;
        }

        if (isActive !== undefined) {
            data.isActive = isActive;
        }

        // 4. Update brand
        try {
            const updatedBrand = await this.prisma.brand.update({
                where: {
                    id: brandId,
                },
                data,
                include: {
                    account: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    members: {
                        select: {
                            userId: true,
                            role: true,
                        },
                    },
                },
            });

            return {
                message: 'Brand updated successfully',
                brand: updatedBrand,
            };
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException(
                    'A brand with this name already exists in your account.',
                );
            }

            throw error;
        }
    }

    async remove(userId: string, brandId: string) {
        // 1. Find brand and verify account membership
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
                accountId: true,
                isActive: true,
            },
        });

        if (!brand) {
            throw new NotFoundException('Brand not found.');
        }

        // 2. Verify account OWNER / ADMIN permission
        const membership =
            await this.prisma.accountUser.findUnique({
                where: {
                    accountId_userId: {
                        accountId: brand.accountId,
                        userId,
                    },
                },
                select: {
                    role: true,
                },
            });

        if (
            !membership ||
            (
                membership.role !== AccountRole.OWNER &&
                membership.role !== AccountRole.ADMIN
            )
        ) {
            throw new ForbiddenException(
                'You do not have permission to deactivate this brand.',
            );
        }

        // 3. Prevent repeated deactivation
        if (!brand.isActive) {
            throw new BadRequestException(
                'Brand is already inactive.',
            );
        }

        // 4. Soft delete: deactivate brand
        await this.prisma.brand.update({
            where: {
                id: brandId,
            },
            data: {
                isActive: false,
            },
        });

        return {
            message: 'Brand deactivated successfully',
        };
    }

    async activate(userId: string, brandId: string) {
        // 1. Find brand and verify account membership
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
                accountId: true,
                isActive: true,
            },
        });

        if (!brand) {
            throw new NotFoundException('Brand not found.');
        }

        // 2. Verify account OWNER / ADMIN permission
        const membership =
            await this.prisma.accountUser.findUnique({
                where: {
                    accountId_userId: {
                        accountId: brand.accountId,
                        userId,
                    },
                },
                select: {
                    role: true,
                },
            });

        if (
            !membership ||
            (
                membership.role !== AccountRole.OWNER &&
                membership.role !== AccountRole.ADMIN
            )
        ) {
            throw new ForbiddenException(
                'You do not have permission to activate this brand.',
            );
        }

        // 3. Prevent repeated activation
        if (brand.isActive) {
            throw new BadRequestException(
                'Brand is already active.',
            );
        }

        // 4. Reactivate brand
        const updatedBrand = await this.prisma.brand.update({
            where: {
                id: brandId,
            },
            data: {
                isActive: true,
            },
        });

        return {
            message: 'Brand activated successfully',
            brand: updatedBrand,
        };
    }
}
