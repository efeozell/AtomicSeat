import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';
import { Observable } from 'rxjs';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // 1. Endpoint'e eklenmiş rol gereksinimlerini al
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. Eğer @Roles kullanılmamışsa, herkes erişebilir
    if (!requiredRoles) {
      return true;
    }

    // 3. Request'ten kullanıcı bilgisini al (JWT strategy tarafından eklenir)
    const { user } = context.switchToHttp().getRequest();

    // 4. Kullanıcı yoksa veya rolü yoksa erişim engelle
    if (!user || !user.role) {
      return false;
    }

    // 5. Kullanıcının rolü gerekli roller arasında mı kontrol et
    return requiredRoles.some((role) => user.role === role);
  }
}
