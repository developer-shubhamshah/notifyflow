
import {
  Controller,
  Post,
  Param,
  Body,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';

import { ContactImportService } from './contact-import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Controller('brands/:brandId/contact-import')
@UseGuards(JwtAuthGuard)
export class ContactImportController {
  constructor(
    private readonly contactImportService: ContactImportService,
  ) {}

  private validateFileExtension(file: Express.Multer.File) {
    const allowedExtensions = ['.csv', '.xlsx'];

    const extension = file.originalname
      .toLowerCase()
      .slice(file.originalname.lastIndexOf('.'));

    if (!allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        'Only CSV and XLSX files are supported',
      );
    }
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  async uploadFile(
    @Param('brandId') brandId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('groupId') groupId: string | undefined,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    this.validateFileExtension(file);

    return this.contactImportService.uploadFile(
      user.userId,
      user.platformRole,
      brandId,
      file,
      groupId,
    );
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  async importFile(
    @Param('brandId') brandId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('groupId') groupId: string | undefined,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    this.validateFileExtension(file);

    return this.contactImportService.importFile(
      user.userId,
      user.platformRole,
      brandId,
      file,
      groupId,
    );
  }
}
