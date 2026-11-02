import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';

import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CampaignExecutionService } from './campaign-execution.service';

@Controller('brands/:brandId/campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
    constructor(
        private readonly campaignsService: CampaignsService,
        private readonly campaignExecutionService: CampaignExecutionService,
    ) { }

    @Post()
    create(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Body() dto: CreateCampaignDto,
    ) {
        return this.campaignsService.create(
            user.userId,
            brandId,
            dto,
        );
    }

    @Get()
    findAll(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
    ) {
        return this.campaignsService.findAll(
            user.userId,
            brandId,
        );
    }

    @Get(':campaignId')
    findOne(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('campaignId') campaignId: string,
    ) {
        return this.campaignsService.findOne(
            user.userId,
            brandId,
            campaignId,
        );
    }

    @Patch(':campaignId')
    update(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('campaignId') campaignId: string,
        @Body() dto: UpdateCampaignDto,
    ) {
        return this.campaignsService.update(
            user.userId,
            brandId,
            campaignId,
            dto,
        );
    }

    @Post(':campaignId/recipients/prepare')
    prepareRecipients(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('campaignId') campaignId: string,
    ) {
        return this.campaignExecutionService.createRecipientSnapshot(
            user.userId,
            brandId,
            campaignId,
        );
    }

    @Get(':campaignId/preview')
    getCampaignPreview(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('campaignId') campaignId: string,
    ) {
        return this.campaignExecutionService.getCampaignPreview(
            user.userId,
            brandId,
            campaignId,
        );
    }

    @Get(':campaignId/readiness')
    getCampaignReadiness(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('campaignId') campaignId: string,
    ) {
        return this.campaignExecutionService.getCampaignReadiness(
            user.userId,
            brandId,
            campaignId,
        );
    }
}