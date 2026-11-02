import { Module } from '@nestjs/common';
import { ContactImportController } from './contact-import.controller';
import { ContactImportService } from './contact-import.service';

@Module({
  controllers: [ContactImportController],
  providers: [ContactImportService],
})
export class ContactImportModule {}