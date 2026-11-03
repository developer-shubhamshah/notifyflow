import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PlatformRole } from "@prisma/client";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }

    if (user.platformRole !== PlatformRole.ADMIN) {
      throw new ForbiddenException("Platform admin access required");
    }

    return true;
  }
}
