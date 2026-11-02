import { Module } from '@nestjs/common';
import { ContactGroupsController } from './contact-groups.controller';
import { ContactGroupsService } from './contact-groups.service';

@Module({
  controllers: [ContactGroupsController],
  providers: [ContactGroupsService]
})
export class ContactGroupsModule {}
