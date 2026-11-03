
import {
    Body,
    Controller,
    Post,
    Get,
    UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AllowPasswordChange } from './decorators/allow-password-change.decorator';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
    ) { }

    @Post('register')
    @UseGuards(JwtAuthGuard, PlatformAdminGuard)
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('refresh')
    async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
        return this.authService.refresh(
            refreshTokenDto.refreshToken,
        );
    }

    @Post('logout')
    async logout(@Body() refreshTokenDto: RefreshTokenDto) {
        return this.authService.logout(
            refreshTokenDto.refreshToken,
        );
    }

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @AllowPasswordChange()
    async changePassword(
        @CurrentUser('userId') userId: string,
        @Body() dto: ChangePasswordDto,
    ) {
        return this.authService.changePassword(userId, dto);
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    getProfile(
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return {
            message: 'Profile fetched successfully',
            user,
        };
    }
}
