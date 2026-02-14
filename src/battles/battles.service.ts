import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StartPveBattleDto } from './dto/start-pve-battle.dto';
import { StartPvpBattleDto } from './dto/start-pvp-battle.dto';
import { PrismaService } from '../prisma/prisma.service';

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

/**
 * perdona por todo el lio que he montado en este servico , creo que me he liado intentando controlar cosas de más para la batalla que estuviese todo bien y ya no se si podria haberse
 * simplificado más , pero he intentado hacerlo guay, el tema de las transacciones que te comenté en clase me he ayudado de la documentción y de la ia para poder conntroarlo bien
 * le he estado dando varias vueltas y creo que puede estar bien aunque aloemjor me he liado de más , no lo sé
 */

/**
 * esto de pick lo utilizo para el cliente de la transaccion de prisma que coge el tipo de user y battle que es lo unico que necesito
 * para las transacciones durante la partida, si no recibira prisma service completo , basicamente con esto se define tipos
 */
type BattleTxClient = Pick<PrismaService, 'user' | 'battle'>;

@Injectable()
export class BattlesService {
  constructor(private readonly prisma: PrismaService) {}

  //pvp es jugador contra jugador y pve jugador contra maquina
  
  /**
   * esto inicia la btalla contra la maquina con estado inpogress con el
   * hp inicial de los dos personajes
   */
  async startPve(initiatorUserId: number, dto: StartPveBattleDto) {
    const { initiatorUser, myCharacter, machineCharacter } =
      await this.getAndValidatePveContext(initiatorUserId, dto);

    const battle = await this.createInProgressPveBattle({
      initiatorUserId: initiatorUser.id,
      initiatorCharacterId: myCharacter.id,
      machineCharacterId: machineCharacter.id,
      initiatorStartHp: myCharacter.hp,
      machineStartHp: machineCharacter.hp,
    });

    return {
      message: 'Batalla PVE iniciada',
      battleId: battle.id,
      status: battle.status,
    };
  }

  
  /**
   * este hace lo mismo que el de arriba pero jugador vs jugador
   */
  async startPvp(initiatorUserId: number, dto: StartPvpBattleDto) {
    const { initiatorUser, opponentUser, myCharacter, opponentCharacter } =
      await this.getAndValidatePvpContext(initiatorUserId, dto);

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

  
  /**
   * esto persiste la batalla jugador vs jugador con el estado inicial y el turno de quien la inicia
   */
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

  // lo mismo que el de arriba pero contra la maquina
  private createInProgressPveBattle(params: {
    initiatorUserId: number;
    initiatorCharacterId: number;
    machineCharacterId: number;
    initiatorStartHp: number;
    machineStartHp: number;
  }) {
    const {
      initiatorUserId,
      initiatorCharacterId,
      machineCharacterId,
      initiatorStartHp,
      machineStartHp,
    } = params;

    return this.prisma.battle.create({
      data: {
        mode: 'PVE',
        status: 'IN_PROGRESS',
        initiatorUserId,
        opponentUserId: null,
        winnerUserId: null,
        winnerIsMachine: false,
        initiatorCharacterId,
        opponentCharacterId: machineCharacterId,
        initiatorCurrentHp: initiatorStartHp,
        opponentCurrentHp: machineStartHp,
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

  // aqui he hecho este metodo para las validaciones vs la maquina por no cargar otro metodo y no hacerlo tan grande que quedaba feo asique lo he modularizado con este
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

  // lo mismo que el de arriba pero jugador vs jugador
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

  // hace un turno jugador vs jugadro y  aplica daño, avanza turno o cierra batalla con recompensas
  async playNextTurnPvp(battleId: number) {
    const battle = await this.getPvpBattleForTurn(battleId);

    let initiatorHp = battle.initiatorCurrentHp;
    let opponentHp = battle.opponentCurrentHp;

    if (battle.nextTurn === 'INITIATOR') {
      opponentHp = Math.max(0, opponentHp - battle.initiatorCharacter.attack);
    } else {
      initiatorHp = Math.max(0, initiatorHp - battle.opponentCharacter.attack);
    }

    const finished = initiatorHp === 0 || opponentHp === 0;
    const nextTurn = battle.nextTurn === 'INITIATOR' ? 'OPPONENT' : 'INITIATOR';

    if (!finished) {
      const updatedBattle = await this.prisma.battle.update({
        where: { id: battle.id },
        data: {
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
        message: 'Turno aplicado',
        ...updatedBattle,
      };
    }

    const winnerUserId =
      initiatorHp > 0 ? battle.initiatorUserId : battle.opponentUserId;
    const loserUserId =
      initiatorHp > 0 ? battle.opponentUserId : battle.initiatorUserId;

    const finishedBattle = await this.prisma.$transaction(async (tx) => {
      const closedBattle = await tx.battle.update({
        where: { id: battle.id },
        data: {
          initiatorCurrentHp: initiatorHp,
          opponentCurrentHp: opponentHp,
          status: 'FINISHED',
          winnerUserId,
          winnerIsMachine: false,
          endedAt: new Date(),
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

      await this.applyPvpRewardsTx(tx, {
        winnerUserId,
        loserUserId,
      });

      return closedBattle;
    });

    return {
      message: 'Turno aplicado y batalla finalizada',
      ...finishedBattle,
    };
  }

  private async getPvpBattleForTurn(battleId: number) {
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

    if (battle.mode !== 'PVP') {
      throw new BadRequestException('Este método es solo para PVP');
    }

    if (battle.status !== 'IN_PROGRESS') {
      throw new BadRequestException('La batalla no está en progreso');
    }

    if (!battle.opponentUserId) {
      throw new BadRequestException(
        'Batalla PVP inválida: falta opponentUserId',
      );
    }

    return {
      ...battle,
      opponentUserId: battle.opponentUserId,
    };
  }

  // hace el turno vs maquina y  ataque del jugador + contraataque de máquina o cierre de batalla
  async playNextTurnPve(battleId: number) {
    const battle = await this.getPveBattleForTurn(battleId);

    let initiatorHp = battle.initiatorCurrentHp;
    let machineHp = Math.max(
      0,
      battle.opponentCurrentHp - battle.initiatorCharacter.attack,
    );

    if (machineHp === 0) {
      return this.finishPveBattleWithTransaction({
        battleId: battle.id,
        initiatorUserId: battle.initiatorUserId,
        initiatorHp,
        machineHp,
        initiatorWon: true,
      });
    }

    initiatorHp = Math.max(0, initiatorHp - battle.opponentCharacter.attack);

    if (initiatorHp === 0) {
      return this.finishPveBattleWithTransaction({
        battleId: battle.id,
        initiatorUserId: battle.initiatorUserId,
        initiatorHp,
        machineHp,
        initiatorWon: false,
      });
    }

    return this.updatePveBattleInProgress({
      battleId: battle.id,
      initiatorHp,
      machineHp,
    });
  }

  // esto carga y valida que la batalla sea vs maquina y esté en progreso antes de jugar un turno
  private async getPveBattleForTurn(battleId: number) {
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      select: {
        id: true,
        mode: true,
        status: true,
        initiatorCurrentHp: true,
        opponentCurrentHp: true,
        initiatorUserId: true,
        initiatorCharacter: { select: { attack: true } },
        opponentCharacter: { select: { attack: true } },
      },
    });

    if (!battle) {
      throw new NotFoundException('Batalla no encontrada');
    }

    if (battle.mode !== 'PVE') {
      throw new BadRequestException('Este método es solo para PVE');
    }

    if (battle.status !== 'IN_PROGRESS') {
      throw new BadRequestException('La batalla no está en progreso');
    }

    return battle;
  }

  // esto cierra una batalla vs maquina y aplica recompensas con una transacción
  private async finishPveBattleWithTransaction(params: {
    battleId: number;
    initiatorUserId: number;
    initiatorHp: number;
    machineHp: number;
    initiatorWon: boolean;
  }) {
    const { battleId, initiatorUserId, initiatorHp, machineHp, initiatorWon } =
      params;

    const finishedBattle = await this.prisma.$transaction(async (tx) => {
      const closedBattle = await tx.battle.update({
        where: { id: battleId },
        data: {
          initiatorCurrentHp: initiatorHp,
          opponentCurrentHp: machineHp,
          status: 'FINISHED',
          winnerUserId: initiatorWon ? initiatorUserId : null,
          winnerIsMachine: !initiatorWon,
          endedAt: new Date(),
        },
        select: {
          id: true,
          status: true,
          turnNumber: true,
          initiatorCurrentHp: true,
          opponentCurrentHp: true,
          winnerUserId: true,
          winnerIsMachine: true,
          endedAt: true,
        },
      });

      if (initiatorWon) {
        await this.applyPveRewardsTx(tx, {
          initiatorUserId,
          initiatorWon: true,
        });
      } else {
        await this.applyPveRewardsTx(tx, {
          initiatorUserId,
          initiatorWon: false,
        });
      }

      return closedBattle;
    });

    return {
      message: 'Turno aplicado y batalla finalizada',
      ...finishedBattle,
    };
  }

  // guarda el estado intermedio de una batalla vs maquina cuando no ha ganado nadie aun
  private async updatePveBattleInProgress(params: {
    battleId: number;
    initiatorHp: number;
    machineHp: number;
  }) {
    const { battleId, initiatorHp, machineHp } = params;
    const updatedBattle = await this.prisma.battle.update({
      where: { id: battleId },
      data: {
        initiatorCurrentHp: initiatorHp,
        opponentCurrentHp: machineHp,
        turnNumber: { increment: 1 },
      },
      select: {
        id: true,
        status: true,
        turnNumber: true,
        initiatorCurrentHp: true,
        opponentCurrentHp: true,
        winnerUserId: true,
        winnerIsMachine: true,
        endedAt: true,
      },
    });

    return {
      message: 'Turno aplicado',
      ...updatedBattle,
    };
  }

  // aplica recompensas vs jgador dentro de la misma transacción de terminar la baatlla
  private async applyPvpRewardsTx(
    tx: BattleTxClient,
    params: {
      winnerUserId: number;
      loserUserId: number;
    },
  ) {
    const { winnerUserId, loserUserId } = params;
    const winnerXp = await this.getUserXpTx(tx, winnerUserId);
    const newXp = winnerXp + 10;
    const newLevel = Math.floor(newXp / 100) + 1;

    await tx.user.update({
      where: { id: winnerUserId },
      data: {
        wins: { increment: 1 },
        xp: newXp,
        level: newLevel,
      },
    });

    await tx.user.update({
      where: { id: loserUserId },
      data: {
        losses: { increment: 1 },
      },
    });
  }

  // aplica recompensas vs maquina dentro de la misma transacción de terminar la baatlla
  private async applyPveRewardsTx(
    tx: BattleTxClient,
    params: {
      initiatorUserId: number;
      initiatorWon: boolean;
    },
  ) {
    const { initiatorUserId, initiatorWon } = params;

    if (initiatorWon) {
      const currentXp = await this.getUserXpTx(tx, initiatorUserId);
      const newXp = currentXp + 10;
      const newLevel = Math.floor(newXp / 100) + 1;

      await tx.user.update({
        where: { id: initiatorUserId },
        data: {
          wins: { increment: 1 },
          xp: newXp,
          level: newLevel,
        },
      });
      return;
    }

    await tx.user.update({
      where: { id: initiatorUserId },
      data: {
        losses: { increment: 1 },
      },
    });
  }

  // obtiene el xp actual de un usuario usando el tx de transaccion
  private async getUserXpTx(tx: BattleTxClient, userId: number) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { xp: true },
    });

    if (!user) {
      throw new NotFoundException(
        'Usuario no encontrado para aplicar recompensas',
      );
    }

    return user.xp;
  }
}
