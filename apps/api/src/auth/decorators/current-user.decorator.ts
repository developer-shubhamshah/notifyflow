
import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { PlatformRole } from '@prisma/client';

export interface AuthenticatedUser {
  userId: string;
  name: string;
  email?: string;
  platformRole: PlatformRole;
  mustChangePassword: boolean;
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    context: ExecutionContext,
  ) => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    return data ? user?.[data] : user;
  },
);
