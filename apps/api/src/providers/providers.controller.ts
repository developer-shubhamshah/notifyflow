
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';

import { ProvidersService } from './providers.service';

import { CreateProviderConfigDto } from './dto/create-provider-config.dto';
import { UpdateProviderConfigDto } from './dto/update-provider-config.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Controller('brands/:brandId/providers')
@UseGuards(JwtAuthGuard)
export class ProvidersController {
    constructor(
        private readonly providersService: ProvidersService,
    ) { }

    // Create provider configuration
    @Post()
    async create(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Body() dto: CreateProviderConfigDto,
    ) {
        return this.providersService.create(
            user.userId,
            brandId,
            dto,
        );
    }

    // Get all provider configurations for a brand
    @Get()
    async findAll(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
    ) {
        return this.providersService.findAll(
            user.userId,
            brandId,
        );
    }

    // Get one provider configuration
    @Get(':providerId')
    async findOne(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('providerId') providerId: string,
    ) {
        return this.providersService.findOne(
            user.userId,
            brandId,
            providerId,
        );
    }

    // Update provider configuration
    @Patch(':providerId')
    async update(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('providerId') providerId: string,
        @Body() dto: UpdateProviderConfigDto,
    ) {
        return this.providersService.update(
            user.userId,
            brandId,
            providerId,
            dto,
        );
    }

    // Delete provider configuration
    @Delete(':providerId')
    async remove(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('providerId') providerId: string,
    ) {
        return this.providersService.remove(
            user.userId,
            brandId,
            providerId,
        );
    }

    // Test provider connection
    @Post(':providerId/test-connection')
    async testConnection(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('providerId') providerId: string,
    ) {
        return this.providersService.testConnection(
            user.userId,
            brandId,
            providerId,
        );
    }

    @Patch(':providerId/activate')
    async activate(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('providerId') providerId: string,
    ) {
        return this.providersService.activate(
            user.userId,
            brandId,
            providerId,
        );
    }

    @Patch(':providerId/deactivate')
    async deactivate(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('providerId') providerId: string,
    ) {
        return this.providersService.deactivate(
            user.userId,
            brandId,
            providerId,
        );
    }
}
