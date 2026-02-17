import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getRanking(limit = 10) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const users = await this.prisma.user.findMany({
      take: safeLimit,
      orderBy: [{ wins: 'desc' }, { losses: 'asc' }, { xp: 'desc' }],
      select: {
        id: true,
        email: true,
        wins: true,
        losses: true,
        xp: true,
        level: true,
      },
    });

    return users.map((user, index) => ({
      rank: index + 1,
      ...user,
    }));
  }
}
