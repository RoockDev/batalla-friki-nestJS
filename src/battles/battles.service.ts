import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StartPveBattleDto } from './dto/start-pve-battle.dto';
import { StartPvpBattleDto } from './dto/start-pvp-battle.dto';
import { PrismaService } from '../prisma/prisma.service';

//Esto lo voy a sacar fuera, aún así me chirria mucho todo este bloque
const battlePublicSelect = {
  id: true,
  mode: true,
  status: true,
  initiatorCurrentHp: true,
  opponentCurrentHp: true,
  turnNumber: true,
  nextTurn: true,
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
} as const;

@Injectable()
export class BattlesService {
  constructor(private readonly prisma: PrismaService) {}

  //partida contra la maquina
  async startPve(initiatorUserId: number, dto: StartPveBattleDto) {
    const { initiatorUser, myCharacter, machineCharacter } =
      await this.getAndValidatePveContext(initiatorUserId, dto);

    const simulation = this.simulateBattle(myCharacter, machineCharacter);

    const battle = await this.createFinishedPveBattle({
      initiatorUserId: initiatorUser.id,
      initiatorCharacterId: myCharacter.id,
      machineCharacterId: machineCharacter.id,
      initiatorWon: simulation.initiatorWon,
    });

    await this.applyPveRewards({
      initiatorUserId: initiatorUser.id,
      currentXp: initiatorUser.xp,
      initiatorWon: simulation.initiatorWon,
    });

    return {
      message: 'Batalla PVE finalizada',
      battleId: battle.id,
      result: {
        initiatorWon: simulation.initiatorWon,
        initiatorHp: simulation.initiatorHp,
        opponentHp: simulation.opponentHp,
      },
    };
  }

  //partida contra otro usuario
  async startPvp(initiatorUserId: number, dto: StartPvpBattleDto) {
    const { initiatorUser, opponentUser, myCharacter, opponentCharacter } =
      await this.getAndValidatePvpContext(initiatorUserId, dto);


    //const simulation = this.simulateBattle(myCharacter, opponentCharacter);

    /*const battle = await this.createFinishedPvpBattle({
      initiatorUserId: initiatorUser.id,
      opponentUserId: opponentUser.id,
      initiatorCharacterId: myCharacter.id,
      opponentCharacterId: opponentCharacter.id,
      initiatorWon: simulation.initiatorWon,
    });*/

    
  const battle = await this.createInProgressPvpBattle({
    initiatorUserId: initiatorUser.id,
    opponentUserId: opponentUser.id,
    initiatorCharacterId: myCharacter.id,
    opponentCharacterId: opponentCharacter.id,
    initiatorStartHp: myCharacter.hp,
    opponentStartHp: opponentCharacter.hp,
  });

  return {
    message: 'Batalla PVP iniciada',
    battleId: battle.id,
    status: battle.status,
  };
  }


private createInProgressPvpBattle(params: {
  initiatorUserId: number;
  opponentUserId: number;
  initiatorCharacterId: number;
  opponentCharacterId: number;
  initiatorStartHp: number;
  opponentStartHp: number;
}) {
  const {
    initiatorUserId,
    opponentUserId,
    initiatorCharacterId,
    opponentCharacterId,
    initiatorStartHp,
    opponentStartHp,
  } = params;

  return this.prisma.battle.create({
    data: {
      mode: 'PVP',
      status: 'IN_PROGRESS',
      initiatorUserId,
      opponentUserId,
      winnerUserId: null,
      winnerIsMachine: false,
      initiatorCharacterId,
      opponentCharacterId,
      initiatorCurrentHp: initiatorStartHp,
      opponentCurrentHp: opponentStartHp,
      turnNumber: 1,
      nextTurn: 'INITIATOR',
      endedAt: null,
    },
  });
}



  

  async findOne(id: number) {
    const battle = await this.prisma.battle.findUnique({
      where: { id },
      select: battlePublicSelect,
    });

    if (!battle) {
      throw new NotFoundException('Batalla no encontrada');
    }
    return battle;
  }

  //simulacion de batalla
  private simulateBattle(
    initiator: { hp: number; attack: number },
    opponent: { hp: number; attack: number },
  ) {
    let initiatorHp = initiator.hp;
    let opponentHp = opponent.hp;
    let attackerTurn: 'initiator' | 'opponent' = 'initiator';

    while (initiatorHp > 0 && opponentHp > 0) {
      if (attackerTurn === 'initiator') {
        opponentHp = Math.max(0, opponentHp - initiator.attack);
        attackerTurn = 'opponent';
      } else {
        initiatorHp = Math.max(0, initiatorHp - opponent.attack);
        attackerTurn = 'initiator';
      }
    }

    const initiatorWon = initiatorHp > 0;

    return {
      initiatorWon,
      initiatorHp,
      opponentHp,
    };
  }
  /**Aqui estoy haciendo distintos metodos para separar resposabilidades ya que de primeras me ha salido
   * unos monstruos de metodos de partida de batalla y me parecia ilegible asique estoy sacando todo en metodos mas pequeños
   * para asi utilizar el metodo bueno como de orquestador y que asi sea mas legible tambien y si falla algo pues se sabe donde hay que ir concretamente
   */

  // para validar y controlar errores de batallas pve (contra la maquina)
  private async getAndValidatePveContext(
    initiatorUserId: number,
    dto: StartPveBattleDto,
  ) {
    const { myCharacterId, machineCharacterId } = dto;

    if (myCharacterId === machineCharacterId) {
      throw new BadRequestException(
        'No puedes luchar contra el mismo personaje',
      );
    }

    const initiatorUser = await this.prisma.user.findUnique({
      where: { id: initiatorUserId },
      select: { id: true, level: true },
    });

    if (!initiatorUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const myCharacter = await this.prisma.character.findUnique({
      where: { id: myCharacterId },
      select: { id: true, hp: true, attack: true, levelRequired: true },
    });

    if (!myCharacter) {
      throw new NotFoundException('Personaje no encontrado');
    }

    if (myCharacter.levelRequired > initiatorUser.level) {
      throw new BadRequestException('Tu nivel no permite usar este personaje');
    }

    const machineCharacter = await this.prisma.character.findUnique({
      where: { id: machineCharacterId },
      select: { id: true, hp: true, attack: true },
    });

    if (!machineCharacter) {
      throw new NotFoundException('Personaje maquina no encontrado');
    }

    return { initiatorUser, myCharacter, machineCharacter };
  }

  // para validar y manejar errores en batalla contra otro usuario
  private async getAndValidatePvpContext(
    initiatorUserId: number,
    dto: StartPvpBattleDto,
  ) {
    const { opponentUserId, myCharacterId, opponentCharacterId } = dto;

    if (initiatorUserId === opponentUserId) {
      throw new BadRequestException(
        'No puedes iniciar una batalla PVP contra ti mismo',
      );
    }

    if (myCharacterId === opponentCharacterId) {
      throw new BadRequestException(
        'No se puede usar el mismo personaje para ambos lados',
      );
    }

    const initiatorUser = await this.prisma.user.findUnique({
      where: { id: initiatorUserId },
      select: { id: true, level: true },
    });

    if (!initiatorUser) {
      throw new NotFoundException('Usuario Iniciante no encontrado');
    }

    const opponentUser = await this.prisma.user.findUnique({
      where: { id: opponentUserId },
      select: { id: true, level: true },
    });

    if (!opponentUser) {
      throw new NotFoundException('Usuario Oponente no encontrado');
    }

    const myCharacter = await this.prisma.character.findUnique({
      where: { id: myCharacterId },
      select: { id: true, hp: true, attack: true, levelRequired: true },
    });

    if (!myCharacter) {
      throw new NotFoundException('Personaje iniciador no encontrado');
    }

    const opponentCharacter = await this.prisma.character.findUnique({
      where: { id: opponentCharacterId },
      select: { id: true, hp: true, attack: true, levelRequired: true },
    });

    if (!opponentCharacter) {
      throw new NotFoundException('Personaje oponente no encontrado');
    }

    if (myCharacter.levelRequired > initiatorUser.level) {
      throw new BadRequestException(
        `Tu nivel (${initiatorUser.level}) no permite usar este personaje (requiere ${myCharacter.levelRequired})`,
      );
    }

    if (opponentCharacter.levelRequired > opponentUser.level) {
      throw new BadRequestException(
        `El oponente no puede usar este personaje: nivel usuario (${opponentUser.level}), requiere (${opponentCharacter.levelRequired})`,
      );
    }

    return { initiatorUser, opponentUser, myCharacter, opponentCharacter };
  }

  //para la persistencia de la partida en la batalla contra la maquina y ponerla como finalizada
  private createFinishedPveBattle(params: {
    initiatorUserId: number;
    initiatorCharacterId: number;
    machineCharacterId: number;
    initiatorWon: boolean;
  }) {
    const {
      initiatorUserId,
      initiatorCharacterId,
      machineCharacterId,
      initiatorWon,
    } = params;

    return this.prisma.battle.create({
      data: {
        mode: 'PVE',
        status: 'FINISHED',
        initiatorUserId,
        opponentUserId: null,
        winnerUserId: initiatorWon ? initiatorUserId : null,
        winnerIsMachine: !initiatorWon,
        initiatorCharacterId,
        opponentCharacterId: machineCharacterId,
        endedAt: new Date(),
      },
    });
  }

  //para la persistencia de la partida en batalla PVP y ponerla como finalizada
  private createFinishedPvpBattle(params: {
    initiatorUserId: number;
    opponentUserId: number;
    initiatorCharacterId: number;
    opponentCharacterId: number;
    initiatorWon: boolean;
  }) {
    const {
      initiatorUserId,
      opponentUserId,
      initiatorCharacterId,
      opponentCharacterId,
      initiatorWon,
    } = params;

    return this.prisma.battle.create({
      data: {
        mode: 'PVP',
        status: 'FINISHED',
        initiatorUserId,
        opponentUserId,
        winnerUserId: initiatorWon ? initiatorUserId : opponentUserId,
        winnerIsMachine: false,
        initiatorCharacterId,
        opponentCharacterId,
        endedAt: new Date(),
      },
    });
  }

  //para actuazliar los datos del usuario xp, nivel etc etc
  private async applyPveRewards(
    params: {
        initiatorUserId:number;
        currentXp: number;
        initiatorWon: boolean;
    }
  ){
    const {initiatorUserId,currentXp,initiatorWon} = params;

    if (initiatorWon) {
        const newXp = currentXp + 10;
        const newLevel = Math.floor(newXp/100) + 1;

        await this.prisma.user.update({
            where: {id:initiatorUserId},
            data: {
                wins: {increment:1},
                xp: newXp,
                level: newLevel,
            },
        });
        return;
    }

    await this.prisma.user.update({
        where: {id:initiatorUserId},
        data:{
            losses: {increment: 1},
        },
    });
  }

  //TURNOSSSSS
  async playNextTurnPvp(battleId: number) {
  const battle = await this.prisma.battle.findUnique({
    where: { id: battleId },
    select: {
      id: true,
      status: true,
      mode: true,
      turnNumber: true,
      nextTurn: true,
      initiatorCurrentHp: true,
      opponentCurrentHp: true,
      initiatorUserId: true,
      opponentUserId: true,
      initiatorCharacter: { select: { attack: true } },
      opponentCharacter: { select: { attack: true } },
    },
  });

  if (!battle) {
    throw new NotFoundException('Batalla no encontrada');
  }

  if (battle.status !== 'IN_PROGRESS') {
    throw new BadRequestException('La batalla no está en progreso');
  }

  if (!battle.opponentUserId) {
    throw new BadRequestException('Batalla PVP inválida: falta opponentUserId');
  }

  let initiatorHp = battle.initiatorCurrentHp;
  let opponentHp = battle.opponentCurrentHp;

  if (battle.nextTurn === 'INITIATOR') {
    opponentHp = Math.max(0, opponentHp - battle.initiatorCharacter.attack);
  } else {
    initiatorHp = Math.max(0, initiatorHp - battle.opponentCharacter.attack);
  }

  const finished = initiatorHp === 0 || opponentHp === 0;
  const nextTurn = battle.nextTurn === 'INITIATOR' ? 'OPPONENT' : 'INITIATOR';

  const updatedBattle = await this.prisma.battle.update({
    where: { id: battle.id },
    data: finished
      ? {
          initiatorCurrentHp: initiatorHp,
          opponentCurrentHp: opponentHp,
          status: 'FINISHED',
          winnerUserId: initiatorHp > 0 ? battle.initiatorUserId : battle.opponentUserId,
          winnerIsMachine: false,
          endedAt: new Date(),
        }
      : {
          initiatorCurrentHp: initiatorHp,
          opponentCurrentHp: opponentHp,
          turnNumber: { increment: 1 },
          nextTurn,
        },
    select: {
      id: true,
      status: true,
      turnNumber: true,
      nextTurn: true,
      initiatorCurrentHp: true,
      opponentCurrentHp: true,
      winnerUserId: true,
      endedAt: true,
    },
  });

  return {
    message: finished ? 'Turno aplicado y batalla finalizada' : 'Turno aplicado',
    ...updatedBattle,
  };
}

}
