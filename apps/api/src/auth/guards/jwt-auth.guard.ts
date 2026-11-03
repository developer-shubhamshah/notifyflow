
import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { ALLOW_PASSWORD_CHANGE } from '../decorators/allow-password-change.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  handleRequest<TUser = AuthenticatedUser>(
    err: any,
    user: TUser,
    info: any,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }

    const allowPasswordChange = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE,
      [context.getHandler(), context.getClass()],
    );

    const authenticatedUser = user as unknown as AuthenticatedUser;

    if (
      authenticatedUser.mustChangePassword &&
      !allowPasswordChange
    ) {
      throw new ForbiddenException(
        'You must change your temporary password before accessing this resource.',
      );
    }

    return user;
  }
}
