import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StartPveBattleDto } from './dto/start-pve-battle.dto';
import { StartPvpBattleDto } from './dto/start-pvp-battle.dto';
import { PrismaService } from '../prisma/prisma.service';

const battlePublicSelect = {
  id: true,
  mode: true,
  status: true,
  initiatorUserId: true,
  opponentUserId: true,
  winnerUserId: true,
  winnerIsMachine: true,
  initiatorCharacterId: true,
  opponentCharacterId: true,
  endedAt: true,
  createdAt: true,
  initiatorUser: {
    select: {
      id: true,
      email: true,
      level: true,
      xp: true,
      wins: true,
      losses: true,
    },
  },
  opponentUser: {
    select: {
      id: true,
      email: true,
      level: true,
      xp: true,
      wins: true,
      losses: true,
    },
  },
  winnerUser: {
    select: {
      id: true,
      email: true,
      level: true,
      xp: true,
      wins: true,
      losses: true,
    },
  },
  initiatorCharacter: {
    select: {
      id: true,
      name: true,
      hp: true,
      attack: true,
      levelRequired: true,
    },
  },
  opponentCharacter: {
    select: {
      id: true,
      name: true,
      hp: true,
      attack: true,
      levelRequired: true,
    },
  },
} as const; //Esto lo voy a quitar luego si no se me olvida

@Injectable()
export class BattlesService {
    constructor(private readonly prisma: PrismaService){}

    //partida contra la maquina
 async startPve(initiatorUserId: number,dto: StartPveBattleDto) {
  const { myCharacterId, machineCharacterId } = dto;

  const initiatorUser = await this.prisma.user.findUnique({
    where: {id:initiatorUserId},
  });

  if(!initiatorUser){
    throw new NotFoundException('Usuario no encontrado')
  }

  if (myCharacterId === machineCharacterId) {
    throw new BadRequestException('No puedes luchar contra el mismo personaje');
  }

  const myCharacter = await this.prisma.character.findUnique({
    where: { id: myCharacterId },
  });

  if (!myCharacter) {
    throw new NotFoundException('Personaje no encontrado');
  }

  if(myCharacter.levelRequired > initiatorUser.level){
    throw new BadRequestException(
        'Tu nivel no permite usar este personaje'
    );
  }


  const machineCharacter = await this.prisma.character.findUnique({
    where: { id: machineCharacterId },
  });

  if (!machineCharacter) {
    throw new NotFoundException('Personaje maquina no encontrado');
  }

  const battle = await this.prisma.battle.create({
    data: {
      mode: 'PVE',
      status: 'IN_PROGRESS',
      initiatorUserId: initiatorUserId, // lo extraigo del token req.user.id 
      opponentUserId: null,
      winnerUserId: null,
      winnerIsMachine: false,
      initiatorCharacterId: myCharacterId,
      opponentCharacterId: machineCharacterId,
    },
  });

  return {
    message: 'Batalla PVE creada',
    battleId: battle.id,
  };
}

//partida contra otro usuario
  async startPvp(initiatorUserId:number,dto: StartPvpBattleDto) {
    const {opponentUserId, myCharacterId,opponentCharacterId} = dto;

    if (initiatorUserId === opponentUserId) {
      throw new BadRequestException('No puedes iniciar una batalla PVP contra ti mismo');
    }

    if (myCharacterId === opponentCharacterId) {
      throw new BadRequestException('No se puede usar el mismo personaje para ambos lados');
    }

    const initiatorUser = await this.prisma.user.findUnique({
        where: {id:initiatorUserId},
    });

    if(!initiatorUser){
        throw new NotFoundException('Usuario Iniciante no encontrado');
    }

    const opponentUser = await this.prisma.user.findUnique({
        where: {id: opponentUserId},
    });

    if(!opponentUser){
        throw new NotFoundException('Usuario Oponente no encontrado');
    }

    const myCharacter = await this.prisma.character.findUnique({
        where: {id:myCharacterId},
    });
    const opponentCharacter = await this.prisma.character.findUnique({
        where: {id:opponentCharacterId},
    });

    if(!myCharacter || !opponentCharacter){
        throw new NotFoundException ('Personaje no encontrado');
    }
    if (myCharacter.levelRequired > initiatorUser.level || opponentCharacter.levelRequired > opponentUser.level) {
        throw new BadRequestException ('El no se puede escoger un personaje con mas nivel requerido del que tienes');
    };

    const battle = await this.prisma.battle.create({
    data: {
      mode: 'PVP',
      status: 'IN_PROGRESS',
      initiatorUserId,
      opponentUserId,
      winnerUserId: null,
      winnerIsMachine: false,
      initiatorCharacterId: myCharacterId,
      opponentCharacterId: opponentCharacterId,
    },
  });

  return {
    message: 'Batalla PVP creada',
    battleId: battle.id,
  };
  }

  async findOne(id: number) {
    const battle = await this.prisma.battle.findUnique({
        where: {id},
        select: battlePublicSelect,
    });

    if(!battle){
        throw new NotFoundException('Batalla no encontrada');
    }
    return battle;
  }
}
