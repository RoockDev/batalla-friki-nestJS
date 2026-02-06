import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttackCharacterDto } from './dto/attack-character.dto';

@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}

    // obtener todos los personajes
  findAll() {
    return this.prisma.character.findMany({
      orderBy: { id: 'asc' },
    });
  }

  //realizar un ataque
  async attack(attackCharacterDto: AttackCharacterDto) {
    const { attackerId, targetId } = attackCharacterDto;

    if (attackerId === targetId) {
      throw new BadRequestException('Un personaje no puede atacarse a sí mismo');
    }

    const attacker = await this.prisma.character.findUnique({
      where: { id: attackerId },
    });
    if (!attacker) {
      throw new NotFoundException(`Atacante con id ${attackerId} no encontrado`);
    }

    const target = await this.prisma.character.findUnique({
      where: { id: targetId },
    });
    if (!target) {
      throw new NotFoundException(`Objetivo con id ${targetId} no encontrado`);
    }

    const newHp = Math.max(0, target.hp - attacker.attack);

    const updatedTarget = await this.prisma.character.update({
      where: { id: targetId },
      data: { hp: newHp },
    });

    return {
      attacker,
      target: updatedTarget,
      damage: attacker.attack,
      targetDefeated: updatedTarget.hp === 0,
    };
  }

  // realizar reset de HP al valor base de cada personaje
  async reset() {
    const characters = await this.prisma.character.findMany({
      select: { id: true, baseHp: true },
    });

    const updates = characters.map((character) =>
      this.prisma.character.update({
        where: { id: character.id },
        data: { hp: character.baseHp },
      }),
    );

    await this.prisma.$transaction(updates);

    return {
      message: 'HP de personajes restaurado',
    };
  }
}
