import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health/db')
  async checkDatabase() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      application: 'NotifyFlow API',
      database: 'connected',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}