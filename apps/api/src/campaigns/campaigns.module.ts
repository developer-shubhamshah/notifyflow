import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignExecutionService } from './campaign-execution.service';

@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignExecutionService],
})
export class CampaignsModule {}