
import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';

import { ContactsService } from './contacts.service';
import { Query } from '@nestjs/common';
import { ContactQueryDto } from './dto/contact-query.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Controller('brands/:brandId/contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
    constructor(
        private readonly contactsService: ContactsService,
    ) { }

    @Post()
    create(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Body() createContactDto: CreateContactDto,
    ) {
        return this.contactsService.create(
            user.userId,
            user.platformRole,
            brandId,
            createContactDto,
        );
    }

    @Get()
    findAll(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Query() query: ContactQueryDto,
    ) {
        return this.contactsService.findAll(
            user.userId,
            user.platformRole,
            brandId,
            query,
        );
    }

    @Get('stats')
    getStats(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
    ) {
        return this.contactsService.getStats(
            user.userId,
            user.platformRole,
            brandId,
        );
    }

    @Get(':contactId')
    findOne(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('contactId') contactId: string,
    ) {
        return this.contactsService.findOne(
            user.userId,
            user.platformRole,
            brandId,
            contactId,
        );
    }

    @Patch(':contactId')
    update(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('contactId') contactId: string,
        @Body() updateContactDto: UpdateContactDto,
    ) {
        return this.contactsService.update(
            user.userId,
            user.platformRole,
            brandId,
            contactId,
            updateContactDto,
        );
    }

    @Delete(':contactId')
    remove(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('contactId') contactId: string,
    ) {
        return this.contactsService.remove(
            user.userId,
            user.platformRole,
            brandId,
            contactId,
        );
    }

}
