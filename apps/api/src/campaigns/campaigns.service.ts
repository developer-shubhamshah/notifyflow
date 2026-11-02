import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignStatus } from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  // Verify that the user belongs to the account owning this brand.
  private async verifyBrandAccess(userId: string, brandId: string) {
    const brand = await this.prisma.brand.findFirst({
      where: {
        id: brandId,
        isActive: true,
        account: {
          members: {
            some: { userId },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!brand) {
      throw new NotFoundException(
        'Brand not found or you do not have access to it',
      );
    }

    return brand;
  }

  // Create a campaign.
  async create(
    userId: string,
    brandId: string,
    dto: CreateCampaignDto,
  ) {
    await this.verifyBrandAccess(userId, brandId);

    // Prevent duplicate channels.
    const channelNames = dto.channels.map((item) => item.channel);

    if (new Set(channelNames).size !== channelNames.length) {
      throw new BadRequestException(
        'Duplicate campaign channels are not allowed',
      );
    }

    // Prevent duplicate group IDs.
    const groupIds = dto.groupIds ?? [];

    if (new Set(groupIds).size !== groupIds.length) {
      throw new BadRequestException(
        'Duplicate contact group IDs are not allowed',
      );
    }

    // Validate that all selected groups belong to this brand.
    if (groupIds.length > 0) {
      const groups = await this.prisma.contactGroup.findMany({
        where: {
          id: { in: groupIds },
          brandId,
          isActive: true,
        },
        select: { id: true },
      });

      if (groups.length !== groupIds.length) {
        throw new BadRequestException(
          'One or more contact groups are invalid or inactive',
        );
      }
    }

    // Validate the scheduled date.
    let scheduledAt: Date | null = null;

    if (dto.scheduledAt) {
      scheduledAt = new Date(dto.scheduledAt);

      if (
        Number.isNaN(scheduledAt.getTime()) ||
        scheduledAt.getTime() <= Date.now()
      ) {
        throw new BadRequestException(
          'Scheduled date must be in the future',
        );
      }
    }

    return this.prisma.campaign.create({
      data: {
        brandId,
        createdById: userId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        status: scheduledAt
          ? CampaignStatus.SCHEDULED
          : CampaignStatus.DRAFT,
        scheduledAt,

        channels: {
          create: dto.channels.map((item) => ({
            channel: item.channel,
            content: item.content ?? {},
          })),
        },

        groups: {
          create: groupIds.map((groupId) => ({
            groupId,
          })),
        },
      },
      include: {
        channels: true,
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  // Get all campaigns for a brand.
  async findAll(userId: string, brandId: string) {
    await this.verifyBrandAccess(userId, brandId);

    return this.prisma.campaign.findMany({
      where: { brandId },
      include: {
        channels: true,
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Get one campaign.
  async findOne(
    userId: string,
    brandId: string,
    campaignId: string,
  ) {
    await this.verifyBrandAccess(userId, brandId);

    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        brandId,
      },
      include: {
        channels: true,
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  // Update campaign details while it is still a draft.
  async update(
    userId: string,
    brandId: string,
    campaignId: string,
    dto: UpdateCampaignDto,
  ) {
    await this.findOne(userId, brandId, campaignId);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });

    if (campaign?.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft campaigns can be updated',
      );
    }

    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...(dto.name !== undefined && {
          name: dto.name.trim(),
        }),
        ...(dto.description !== undefined && {
          description: dto.description.trim(),
        }),
      },
      include: {
        channels: true,
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }
}