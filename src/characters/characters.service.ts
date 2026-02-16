import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}

  // obtener todos los personajes
  findAll() {
    return this.prisma.character.findMany({
      orderBy: { id: 'asc' },
    });
  }
}
