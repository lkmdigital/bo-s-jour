# 🚀 Guide de Structure NestJS pour le Système d'Administration

## 📁 Structure de base à créer

```
nestjs-admin/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── permissions.guard.ts
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts
│   │   │   ├── permissions.decorator.ts
│   │   │   └── current-user.decorator.ts
│   │   └── strategies/
│   │       └── jwt.strategy.ts
│   ├── rbac/
│   │   ├── rbac.module.ts
│   │   ├── services/
│   │   │   └── rbac.service.ts
│   │   └── interfaces/
│   │       └── rbac.interface.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       └── update-user.dto.ts
│   ├── hosts/
│   │   ├── hosts.module.ts
│   │   ├── hosts.controller.ts
│   │   └── hosts.service.ts
│   ├── accommodations/
│   │   ├── accommodations.module.ts
│   │   ├── accommodations.controller.ts
│   │   └── accommodations.service.ts
│   ├── inspections/
│   │   ├── inspections.module.ts
│   │   ├── inspections.controller.ts
│   │   └── inspections.service.ts
│   ├── analytics/
│   │   ├── analytics.module.ts
│   │   ├── analytics.controller.ts
│   │   └── analytics.service.ts
│   └── common/
│       ├── decorators/
│       ├── filters/
│       ├── interceptors/
│       └── pipes/
└── package.json
```

## 🔐 Guards à implémenter

### 1. RolesGuard

```typescript
// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RbacService } from '../../rbac/services/rbac.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Vérifier les rôles via le service RBAC
    return this.rbacService.userHasAnyRole(user.id, requiredRoles);
  }
}
```

### 2. PermissionsGuard

```typescript
// src/auth/guards/permissions.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RbacService } from '../../rbac/services/rbac.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Vérifier les permissions via le service RBAC
    return this.rbacService.userHasAllPermissions(
      user.id,
      requiredPermissions,
    );
  }
}
```

## 🎯 Decorators à créer

### 1. Roles Decorator

```typescript
// src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

### 2. Permissions Decorator

```typescript
// src/auth/decorators/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

## 🔄 Service RBAC

```typescript
// src/rbac/services/rbac.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class RbacService {
  constructor(private httpService: HttpService) {}

  /**
   * Vérifier si un utilisateur a un rôle spécifique
   * Option 1: Appel API Laravel
   * Option 2: Accès direct à la base de données partagée
   */
  async userHasRole(userId: number, roleName: string): Promise<boolean> {
    // Via API Laravel
    try {
      const response = await firstValueFrom(
        this.httpService.get(`http://laravel-api/api/users/${userId}/has-role/${roleName}`),
      );
      return response.data.hasRole;
    } catch (error) {
      // Fallback: accès direct DB si partagée
      // Implémenter la logique de vérification
      return false;
    }
  }

  async userHasAnyRole(userId: number, roleNames: string[]): Promise<boolean> {
    for (const roleName of roleNames) {
      if (await this.userHasRole(userId, roleName)) {
        return true;
      }
    }
    return false;
  }

  async userHasPermission(
    userId: number,
    permissionName: string,
  ): Promise<boolean> {
    // Même logique que userHasRole
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `http://laravel-api/api/users/${userId}/has-permission/${permissionName}`,
        ),
      );
      return response.data.hasPermission;
    } catch (error) {
      return false;
    }
  }

  async userHasAllPermissions(
    userId: number,
    permissionNames: string[],
  ): Promise<boolean> {
    for (const permissionName of permissionNames) {
      if (!(await this.userHasPermission(userId, permissionName))) {
        return false;
      }
    }
    return true;
  }
}
```

## 📝 Exemple d'utilisation dans un Controller

```typescript
// src/users/users.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsersController {
  @Get()
  @Roles('admin', 'super_admin')
  @Permissions('users.read')
  findAll() {
    // Logique
  }

  @Post()
  @Roles('super_admin')
  @Permissions('users.create')
  create() {
    // Logique
  }
}
```

## 🔗 Synchronisation Laravel <-> NestJS

### Option 1: API REST
- NestJS appelle les endpoints Laravel pour vérifier rôles/permissions
- Avantage: Découplage
- Inconvénient: Latence réseau

### Option 2: Base de données partagée
- NestJS accède directement à la même base MySQL
- Avantage: Performance
- Inconvénient: Couplage

### Option 3: Cache Redis partagé
- Les rôles/permissions sont mis en cache dans Redis
- Les deux backends partagent le même cache
- Avantage: Performance + Découplage partiel

## 📦 Installation NestJS

```bash
# Créer le projet
npm i -g @nestjs/cli
nest new nestjs-admin

# Installer les dépendances
cd nestjs-admin
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install @nestjs/axios axios
npm install class-validator class-transformer
npm install @nestjs/config

# Développement
npm install --save-dev @types/passport-jwt
```

## 🎯 Module App principal

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';
import { UsersModule } from './users/users.module';
// ... autres modules

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    AuthModule,
    RbacModule,
    UsersModule,
    // ... autres modules
  ],
})
export class AppModule {}
```

---

## ✅ Checklist d'implémentation

- [ ] Créer le projet NestJS
- [ ] Installer les dépendances
- [ ] Créer la structure de dossiers
- [ ] Implémenter les guards (JWT, Roles, Permissions)
- [ ] Créer les decorators
- [ ] Implémenter le service RBAC
- [ ] Configurer la connexion à Laravel (API ou DB)
- [ ] Créer les modules métier
- [ ] Implémenter les controllers
- [ ] Tests unitaires
- [ ] Documentation

---

**Note**: Cette structure est un guide. Adaptez-la selon vos besoins spécifiques et votre architecture.

