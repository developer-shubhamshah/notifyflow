import {
    Body,
    Controller,
    Get,
    Delete,
    Patch,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

import { CreateContactGroupDto } from './dto/create-contact-group.dto';
import { ContactGroupsService } from './contact-groups.service';
import { UpdateContactGroupDto } from './dto/update-contact-group.dto';

@Controller('brands/:brandId/contact-groups')
@UseGuards(JwtAuthGuard)
export class ContactGroupsController {
    constructor(
        private readonly contactGroupsService: ContactGroupsService,
    ) { }

    @Post()
    create(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Body() dto: CreateContactGroupDto,
    ) {
        return this.contactGroupsService.create(
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
        return this.contactGroupsService.findAll(
            user.userId,
            brandId,
        );
    }

    @Post(':groupId/contacts/:contactId')
    addContact(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('groupId') groupId: string,
        @Param('contactId') contactId: string,
    ) {
        return this.contactGroupsService.addContact(
            user.userId,
            brandId,
            groupId,
            contactId,
        );
    }

    @Get(':groupId/contacts')
    findGroupContacts(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('groupId') groupId: string,
    ) {
        return this.contactGroupsService.findGroupContacts(
            user.userId,
            brandId,
            groupId,
        );
    }

    @Delete(':groupId/contacts/:contactId')
    removeContact(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('groupId') groupId: string,
        @Param('contactId') contactId: string,
    ) {
        return this.contactGroupsService.removeContact(
            user.userId,
            brandId,
            groupId,
            contactId,
        );
    }

    @Get(':groupId')
    findOne(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('groupId') groupId: string,
    ) {
        return this.contactGroupsService.findOne(
            user.userId,
            brandId,
            groupId,
        );
    }

    @Patch(':groupId')
    update(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('groupId') groupId: string,
        @Body() dto: UpdateContactGroupDto,
    ) {
        return this.contactGroupsService.update(
            user.userId,
            brandId,
            groupId,
            dto,
        );
    }

    @Delete(':groupId')
    remove(
        @CurrentUser() user: AuthenticatedUser,
        @Param('brandId') brandId: string,
        @Param('groupId') groupId: string,
    ) {
        return this.contactGroupsService.remove(
            user.userId,
            brandId,
            groupId,
        );
    }
}