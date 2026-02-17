import { Injectable } from '@nestjs/common';
import * as path from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

//SErvicio para lanzar seed y eliminar bbdd por si hace falta para ayudar cuando se arranque el ejercicio

const { runSeed } = require(path.join(process.cwd(), 'prisma/seeds/seed.cjs')) as {
  runSeed: (prisma: PrismaService) => Promise<void>;
};
const {
  USERS_TO_SEED,
  USERS_PASSWORD,
} = require(path.join(process.cwd(), 'prisma/seeds/users.seed.cjs')) as {
  USERS_TO_SEED: string[];
  USERS_PASSWORD: string;
};

const ADMIN_EMAIL = 'admin@batalla.com';
const ADMIN_PASSWORD = '123456';

@Injectable()
export class ProfesorCorrecionService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDemoData() {
    await runSeed(this.prisma);

    const usersSeeded = [ADMIN_EMAIL, ...USERS_TO_SEED];
    const charactersSeeded = await this.prisma.character.count();

    return {
      message: 'Datos demo poblados correctamente',
      usersSeeded,
      charactersSeeded,
      defaultPassword: ADMIN_PASSWORD,
    };
  }

  async getOverview() {
    const users = await this.prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        email: true,
        level: true,
        xp: true,
        wins: true,
        losses: true,
        roles: {
          select: {
            role: {
              select: { name: true },
            },
          },
        },
      },
    });

    const characters = await this.prisma.character.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        hp: true,
        baseHp: true,
        attack: true,
        levelRequired: true,
      },
    });

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        roles: user.roles.map((ur) => ur.role.name),
        loginPasswordHint:
          user.email === ADMIN_EMAIL
            ? ADMIN_PASSWORD
            : USERS_TO_SEED.includes(user.email)
              ? USERS_PASSWORD
              : null,
        level: user.level,
        xp: user.xp,
        wins: user.wins,
        losses: user.losses,
      })),
      characters,
    };
  }

  async clearDatabase() {
    const [battles, userRoles, users, characters, roles] =
      await this.prisma.$transaction([
        this.prisma.battle.deleteMany({}),
        this.prisma.userRole.deleteMany({}),
        this.prisma.user.deleteMany({}),
        this.prisma.character.deleteMany({}),
        this.prisma.role.deleteMany({}),
      ]);

    return {
      message: 'Base de datos vaciada',
      deleted: {
        battles: battles.count,
        userRoles: userRoles.count,
        users: users.count,
        characters: characters.count,
        roles: roles.count,
      },
    };
  }
}
