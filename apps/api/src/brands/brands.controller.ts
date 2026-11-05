import {
    Body,
    Controller,
    Delete,
    Post,
    Get,
    Patch,
    UseGuards,
    Param,
} from '@nestjs/common';

import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Controller('brands')
@UseGuards(JwtAuthGuard)
export class BrandsController {
    constructor(
        private readonly brandsService: BrandsService,
    ) {}

    @Post()
    @UseGuards(PlatformAdminGuard)
    async create(
        @CurrentUser() user: AuthenticatedUser,
        @Body() createBrandDto: CreateBrandDto,
    ) {
        return this.brandsService.create(
            user.userId,
            createBrandDto,
        );
    }

    @Get()
    async findAll(
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.brandsService.findAll(
            user.userId,
            user.platformRole,
        );
    }

    @Get(':brandId')
    async findOne(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
    ) {
        return this.brandsService.findOne(
            user.userId,
            brandId,
            user.platformRole,
        );
    }

    @Patch(':brandId')
    async update(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Body() updateBrandDto: UpdateBrandDto,
    ) {
        return this.brandsService.update(
            user.userId,
            brandId,
            updateBrandDto,
            user.platformRole,
        );
    }

    @Delete(':brandId')
    async remove(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
    ) {
        return this.brandsService.remove(
            user.userId,
            brandId,
            user.platformRole,
        );
    }

    @Patch(':brandId/activate')
    async activate(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
    ) {
        return this.brandsService.activate(
            user.userId,
            brandId,
            user.platformRole,
        );
    }
}