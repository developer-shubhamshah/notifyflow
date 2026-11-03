import {
    Injectable,
    ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { randomUUID, createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async login(loginDto: LoginDto) {
        const email = loginDto.email.trim().toLowerCase();

        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new UnauthorizedException(
                'Invalid email or password',
            );
        }

        const isPasswordValid = await bcrypt.compare(
            loginDto.password,
            user.password,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException(
                'Invalid email or password',
            );
        }

        // Generate access token and refresh token
        const tokens = await this.generateTokens(
            user.id,
            user.email,
        );

        return {
            message: 'Login successful',
            ...tokens,
            requiresPasswordChange: user.mustChangePassword,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                platformRole: user.platformRole,
                mustChangePassword: user.mustChangePassword,
            },
        };
    }

    async register(registerDto: RegisterDto) {
        const name = registerDto.name.trim();
        const email = registerDto.email.trim().toLowerCase();

        // Check whether the email already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException('Email is already registered');
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(
            registerDto.password,
            saltRounds,
        );

        // Create user
        try {
            const user = await this.prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    createdAt: true,
                },
            });

            return {
                message: 'User registered successfully',
                user,
            };
        } catch (error) {
            // Handle concurrent duplicate registration attempts
            if (
                error &&
                typeof error === 'object' &&
                'code' in error &&
                error.code === 'P2002'
            ) {
                throw new ConflictException('Email is already registered');
            }

            throw error;
        }
    }

    private hashRefreshToken(token: string): string {
        return createHash('sha256')
            .update(token)
            .digest('hex');
    }

    private getRefreshTokenExpiry(): Date {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7);
        return expiry;
    }

    private async generateTokens(userId: string, email: string) {
        const sessionId = randomUUID();

        const refreshSecret = this.configService.getOrThrow<string>(
            'JWT_REFRESH_SECRET',
        );

        const refreshToken = await this.jwtService.signAsync(
            {
                sub: userId,
                sid: sessionId,
            },
            {
                secret: refreshSecret,
                expiresIn: '7d',
            },
        );

        const accessToken = await this.jwtService.signAsync({
            sub: userId,
            email,
        });

        // Store only the hash of the refresh token
        await this.prisma.refreshSession.create({
            data: {
                id: sessionId,
                tokenHash: this.hashRefreshToken(refreshToken),
                userId,
                expiresAt: this.getRefreshTokenExpiry(),
            },
        });

        return {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: '15m',
        };
    }

    async refresh(refreshToken: string) {
        const refreshSecret = this.configService.getOrThrow<string>(
            'JWT_REFRESH_SECRET',
        );

        let payload: {
            sub: string;
            sid: string;
        };

        // Verify refresh token
        try {
            payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: refreshSecret,
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        if (
            typeof payload.sub !== 'string' ||
            typeof payload.sid !== 'string'
        ) {
            throw new UnauthorizedException('Invalid refresh token payload');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                mustChangePassword: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (user.mustChangePassword) {
            throw new UnauthorizedException(
                'Password change required before refreshing tokens',
            );
        }

        const tokenHash = this.hashRefreshToken(refreshToken);

        // Generate replacement tokens before database transaction
        const nextSessionId = randomUUID();

        const nextRefreshToken = await this.jwtService.signAsync(
            {
                sub: payload.sub,
                sid: nextSessionId,
            },
            {
                secret: refreshSecret,
                expiresIn: '7d',
            },
        );

        const nextAccessToken = await this.jwtService.signAsync({
            sub: payload.sub,
        });

        const nextTokenHash = this.hashRefreshToken(nextRefreshToken);

        try {
            await this.prisma.$transaction(async (tx) => {
                const oldSession = await tx.refreshSession.findUnique({
                    where: { id: payload.sid },
                });

                if (
                    !oldSession ||
                    oldSession.userId !== payload.sub ||
                    oldSession.tokenHash !== tokenHash ||
                    oldSession.revokedAt !== null ||
                    oldSession.expiresAt <= new Date()
                ) {
                    throw new UnauthorizedException(
                        'Refresh token is invalid or has already been used',
                    );
                }

                // Revoke the previous session
                const revoked = await tx.refreshSession.updateMany({
                    where: {
                        id: payload.sid,
                        tokenHash,
                        revokedAt: null,
                    },
                    data: {
                        revokedAt: new Date(),
                    },
                });

                if (revoked.count !== 1) {
                    throw new UnauthorizedException(
                        'Refresh token has already been used',
                    );
                }

                // Create replacement session
                await tx.refreshSession.create({
                    data: {
                        id: nextSessionId,
                        tokenHash: nextTokenHash,
                        userId: payload.sub,
                        expiresAt: this.getRefreshTokenExpiry(),
                    },
                });
            });
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }

            throw error;
        }

        return {
            message: 'Token refreshed successfully',
            accessToken: nextAccessToken,
            refreshToken: nextRefreshToken,
            tokenType: 'Bearer',
            expiresIn: '15m',
        };
    }

    async logout(refreshToken: string) {
        const refreshSecret = this.configService.getOrThrow<string>(
            'JWT_REFRESH_SECRET',
        );

        let payload: {
            sub: string;
            sid: string;
        };

        try {
            payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: refreshSecret,
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const tokenHash = this.hashRefreshToken(refreshToken);

        const result = await this.prisma.refreshSession.updateMany({
            where: {
                id: payload.sid,
                userId: payload.sub,
                tokenHash,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });

        if (result.count !== 1) {
            throw new UnauthorizedException(
                'Refresh session is already revoked or invalid',
            );
        }

        return {
            message: 'Logout successful',
        };
    }

    async changePassword(
        userId: string,
        dto: ChangePasswordDto,
    ) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                password: true,
                mustChangePassword: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const isCurrentPasswordValid = await bcrypt.compare(
            dto.currentPassword,
            user.password,
        );

        if (!isCurrentPasswordValid) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        if (dto.currentPassword === dto.newPassword) {
            throw new ConflictException(
                'New password must be different from the current password',
            );
        }

        const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: {
                    password: hashedPassword,
                    mustChangePassword: false,
                },
            });

            await tx.refreshSession.updateMany({
                where: {
                    userId,
                    revokedAt: null,
                },
                data: {
                    revokedAt: new Date(),
                },
            });
        });

        return {
            message: 'Password changed successfully. Please log in again.',
        };
    }

}