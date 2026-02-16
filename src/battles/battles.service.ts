import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StartPveBattleDto } from './dto/start-pve-battle.dto';
import { StartPvpBattleDto } from './dto/start-pvp-battle.dto';
import { JoinPvpBattleDto } from './dto/join-pvp-battle.dto';
import { battlePublicSelect } from './selectors/battle-public.select';
import { PrismaService } from '../prisma/prisma.service';
import { WebsocketsGateway } from '../websockets/websockets.gateway';

/**
 * perdona por todo el lio que he montado en este servico , creo que me he liado intentando controlar cosas de más para la batalla que estuviese todo bien y ya no se si podria haberse
 * simplificado más , pero he intentado hacerlo guay, el tema de las transacciones que te comenté en clase me he ayudado de la documentción y de la ia para poder conntroarlo bien
 * le he estado dando varias vueltas y creo que puede estar bien aunque aloemjor me he liado de más , no lo sé
 * pero probandolo creo que se manejan muchas cosas en batalla y ha quedado chulo
 * tambien hay muchas validaciones de error que no se suelen dar, pero ahí están comprobadas
 * por que nunca se sabe lo que puede pasar
 */
/**
 * Como te comenté he modularizado muchos metodos y los tochos estan como orquestadores
 */
/**
 * esto de pick lo utilizo para el cliente de la transaccion de prisma que coge el tipo de user y battle que es lo unico que necesito
 * para las transacciones durante la partida, si no recibira prisma service completo , basicamente con esto se define tipos
 */
type BattleTxClient = Pick<PrismaService, 'user' | 'battle'>;
type AttackLevel = 'BAJO' | 'NORMAL' | 'ALTO' | 'CRITICO';
type AttackRoll = {
  attackLevel: AttackLevel;
  baseAttack: number;
  rolledAttack: number;
  damage: number;
};

@Injectable()
export class BattlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketsGateway: WebsocketsGateway,
  ) {}

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
   * esto crea una batalla PVP en espera de que se una un segundo jugador
   */
  async startPvp(initiatorUserId: number, dto: StartPvpBattleDto) {
    const { initiatorUser, myCharacter } = await this.getAndValidatePvpStartContext(
      initiatorUserId,
      dto,
    );

    const battle = await this.createWaitingPvpBattle({
      initiatorUserId: initiatorUser.id,
      initiatorCharacterId: myCharacter.id,
      initiatorStartHp: myCharacter.hp,
    });

    return {
      message: 'Batalla PVP creada. Esperando oponente',
      battleId: battle.id,
      status: battle.status,
    };
  }

  /**
   * esto permite que el segundo jugador se una a una batalla PVP en espera
   */
  async joinPvp(battleId: number, actorUserId: number, dto: JoinPvpBattleDto) {
    const { battle, opponentUser, opponentCharacter } =
      await this.getAndValidatePvpJoinContext(battleId, actorUserId, dto);

    const updatedBattle = await this.prisma.battle.update({
      where: { id: battle.id },
      data: {
        opponentUserId: opponentUser.id,
        opponentCharacterId: opponentCharacter.id,
        opponentCurrentHp: opponentCharacter.hp,
        status: 'IN_PROGRESS',
      },
      select: { //esta forma de traerte  los campos que quieras de prisma me gusta bastante aunque no se si será la mejor
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

    this.websocketsGateway.emitBattleUpdate(updatedBattle.id, {
      type: 'BATTLE_JOINED',
      data: updatedBattle,
    });

    return {
      message: 'Te has unido a la batalla PVP',
      ...updatedBattle,
    };
  }

  private createWaitingPvpBattle(params: {
    initiatorUserId: number;
    initiatorCharacterId: number;
    initiatorStartHp: number;
  }) {
    const {
      initiatorUserId,
      initiatorCharacterId,
      initiatorStartHp,
    } = params;

    return this.prisma.battle.create({
      data: {
        mode: 'PVP',
        status: 'WAITING',
        initiatorUserId,
        opponentUserId: null,
        winnerUserId: null,
        winnerIsMachine: false,
        initiatorCharacterId,
        opponentCharacterId: null,
        initiatorCurrentHp: initiatorStartHp,
        opponentCurrentHp: 0,
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

  
  async findOne(id: number, actor: { id: number; roles: string[] }) {
    const battle = await this.prisma.battle.findUnique({
      where: { id },
      select: battlePublicSelect,
    });

    if (!battle) {
      throw new NotFoundException('Batalla no encontrada');
    }

    //  si es adminpuede ver cualquier batalla
    // si no solo puede ver batallas donde participa es el tema
    // de autorización que usamos en WebSocket al unirse a rooms de batalla
    const isAdmin = actor.roles?.includes('ADMIN') ?? false;
    const isParticipant =
      battle.initiatorUserId === actor.id || battle.opponentUserId === actor.id;

    if (!isAdmin && !isParticipant) {
      throw new ForbiddenException(
        'No puedes acceder al detalle de una batalla ajena',
      );
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

  // valida el contexto de creación de PVP en espera (solo iniciador + su personaje)
  private async getAndValidatePvpStartContext(
    initiatorUserId: number,
    dto: StartPvpBattleDto,
  ) {
    const { myCharacterId } = dto;

    const initiatorUser = await this.prisma.user.findUnique({
      where: { id: initiatorUserId },
      select: { id: true, level: true },
    });

    if (!initiatorUser) {
      throw new NotFoundException('Usuario iniciador no encontrado');
    }

    const myCharacter = await this.prisma.character.findUnique({
      where: { id: myCharacterId },
      select: { id: true, hp: true, levelRequired: true },
    });

    if (!myCharacter) {
      throw new NotFoundException('Personaje iniciador no encontrado');
    }

    if (myCharacter.levelRequired > initiatorUser.level) {
      throw new BadRequestException(
        `Tu nivel (${initiatorUser.level}) no permite usar este personaje (requiere ${myCharacter.levelRequired})`,
      );
    }

    return { initiatorUser, myCharacter };
  }

  // valida el contexto cuando un segundo jugador se une a una PVP en espera
  private async getAndValidatePvpJoinContext(
    battleId: number,
    actorUserId: number,
    dto: JoinPvpBattleDto,
  ) {
    const { myCharacterId } = dto;

    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      select: {
        id: true,
        mode: true,
        status: true,
        initiatorUserId: true,
        opponentUserId: true,
        initiatorCharacterId: true,
      },
    });

    if (!battle) {
      throw new NotFoundException('Batalla no encontrada');
    }

    if (battle.mode !== 'PVP') {
      throw new BadRequestException('Solo puedes unirte a batallas PVP');
    }

    if (battle.status !== 'WAITING') {
      throw new BadRequestException('La batalla no está esperando oponente');
    }

    if (battle.initiatorUserId === actorUserId) {
      throw new BadRequestException('No puedes unirte a tu propia batalla');
    }

    if (battle.opponentUserId) {
      throw new BadRequestException('La batalla ya tiene oponente');
    }

    if (battle.initiatorCharacterId === myCharacterId) {
      throw new BadRequestException(
        'No se puede usar el mismo personaje para ambos lados',
      );
    }

    const opponentUser = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, level: true },
    });

    if (!opponentUser) {
      throw new NotFoundException('Usuario oponente no encontrado');
    }

    const opponentCharacter = await this.prisma.character.findUnique({
      where: { id: myCharacterId },
      select: { id: true, hp: true, levelRequired: true },
    });

    if (!opponentCharacter) {
      throw new NotFoundException('Personaje oponente no encontrado');
    }

    if (opponentCharacter.levelRequired > opponentUser.level) {
      throw new BadRequestException(
        `Tu nivel (${opponentUser.level}) no permite usar este personaje (requiere ${opponentCharacter.levelRequired})`,
      );
    }

    return { battle, opponentUser, opponentCharacter };
  }

  // hace un turno jugador vs jugadro y  aplica daño, avanza turno o cierra batalla con recompensas
  async playNextTurnPvp(battleId: number, actorUserId: number) {
    const battle = await this.getPvpBattleForTurn(battleId);
    this.assertActorCanPlayPvpTurn(battle, actorUserId);

    let initiatorHp = battle.initiatorCurrentHp;
    let opponentHp = battle.opponentCurrentHp;
    const attackerSide = battle.nextTurn;
    const attackRoll =
      attackerSide === 'INITIATOR'
        ? this.rollAttack(battle.initiatorCharacter.attack)
        : this.rollAttack(battle.opponentCharacter.attack);
    let damageApplied = 0;

    if (attackerSide === 'INITIATOR') {
      const opponentHpBefore = opponentHp;
      opponentHp = Math.max(0, opponentHp - attackRoll.damage);
      damageApplied = opponentHpBefore - opponentHp;
    } else {
      const initiatorHpBefore = initiatorHp;
      initiatorHp = Math.max(0, initiatorHp - attackRoll.damage);
      damageApplied = initiatorHpBefore - initiatorHp;
    }

    const turnAttack = {
      attacker: attackerSide,
      attackLevel: attackRoll.attackLevel,
      baseAttack: attackRoll.baseAttack,
      rolledAttack: attackRoll.rolledAttack,
      damage: damageApplied,
    };

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

      this.websocketsGateway.emitBattleUpdate(updatedBattle.id, {
        type: 'TURN_APPLIED',
        data: updatedBattle,
        turnAttack,
      });

      return {
        message: 'Turno aplicado',
        turnAttack,
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

    this.websocketsGateway.emitBattleUpdate(finishedBattle.id, {
      type: 'BATTLE_FINISHED',
      data: finishedBattle,
      turnAttack,
    });

    return {
      message: 'Turno aplicado y batalla finalizada',
      turnAttack,
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

    if (battle.status === 'FINISHED') {
      throw new BadRequestException('La batalla ha finalizado');
    }

    if (battle.status !== 'IN_PROGRESS') {
      throw new BadRequestException('La batalla no está en progreso');
    }

    if (!battle.opponentUserId) {
      throw new BadRequestException(
        'Batalla PVP inválida: falta opponentUserId',
      );
    }

    if (!battle.opponentCharacter) {
      throw new BadRequestException(
        'Batalla PVP inválida: falta opponentCharacter',
      );
    }

    return {
      ...battle,
      opponentUserId: battle.opponentUserId,
      opponentCharacter: battle.opponentCharacter,
    };
  }

  // valida que el usuario autenticado sea justo el que tiene el turno actual
  private assertActorCanPlayPvpTurn(
    battle: {
      nextTurn: 'INITIATOR' | 'OPPONENT';
      initiatorUserId: number;
      opponentUserId: number;
    },
    actorUserId: number,
  ) {
    const expectedUserId =
      battle.nextTurn === 'INITIATOR'
        ? battle.initiatorUserId
        : battle.opponentUserId;

    if (actorUserId !== expectedUserId) {
      throw new ForbiddenException('No es tu turno');
    }
  }

  // hace el turno vs maquina y  ataque del jugador + contraataque de máquina o cierre de batalla
  async playNextTurnPve(battleId: number, actorUserId: number) {
    const battle = await this.getPveBattleForTurn(battleId);
    this.assertActorCanPlayPveTurn(battle, actorUserId);

    let initiatorHp = battle.initiatorCurrentHp;
    let machineHp = battle.opponentCurrentHp;
    const playerAttackRoll = this.rollAttack(battle.initiatorCharacter.attack);
    const machineHpBefore = machineHp;
    machineHp = Math.max(0, machineHp - playerAttackRoll.damage);
    const playerDamage = machineHpBefore - machineHp;

    if (machineHp === 0) {
      return this.finishPveBattleWithTransaction({
        battleId: battle.id,
        initiatorUserId: battle.initiatorUserId,
        initiatorHp,
        machineHp,
        initiatorWon: true,
        turnSummary: {
          playerAttack: {
            attackLevel: playerAttackRoll.attackLevel,
            baseAttack: playerAttackRoll.baseAttack,
            rolledAttack: playerAttackRoll.rolledAttack,
            damage: playerDamage,
          },
          machineAttack: null,
        },
      });
    }

    const machineAttackRoll = this.rollAttack(battle.opponentCharacter.attack);
    const initiatorHpBefore = initiatorHp;
    initiatorHp = Math.max(0, initiatorHp - machineAttackRoll.damage);
    const machineDamage = initiatorHpBefore - initiatorHp;

    if (initiatorHp === 0) {
      return this.finishPveBattleWithTransaction({
        battleId: battle.id,
        initiatorUserId: battle.initiatorUserId,
        initiatorHp,
        machineHp,
        initiatorWon: false,
        turnSummary: {
          playerAttack: {
            attackLevel: playerAttackRoll.attackLevel,
            baseAttack: playerAttackRoll.baseAttack,
            rolledAttack: playerAttackRoll.rolledAttack,
            damage: playerDamage,
          },
          machineAttack: {
            attackLevel: machineAttackRoll.attackLevel,
            baseAttack: machineAttackRoll.baseAttack,
            rolledAttack: machineAttackRoll.rolledAttack,
            damage: machineDamage,
          },
        },
      });
    }

    return this.updatePveBattleInProgress({
      battleId: battle.id,
      initiatorHp,
      machineHp,
      turnSummary: {
        playerAttack: {
          attackLevel: playerAttackRoll.attackLevel,
          baseAttack: playerAttackRoll.baseAttack,
          rolledAttack: playerAttackRoll.rolledAttack,
          damage: playerDamage,
        },
        machineAttack: {
          attackLevel: machineAttackRoll.attackLevel,
          baseAttack: machineAttackRoll.baseAttack,
          rolledAttack: machineAttackRoll.rolledAttack,
          damage: machineDamage,
        },
      },
    });
  }

  // valida que en PVE solo el usuario iniciador de la batalla pueda jugar turnos
  private assertActorCanPlayPveTurn(
    battle: { initiatorUserId: number },
    actorUserId: number,
  ) {
    if (battle.initiatorUserId !== actorUserId) {
      throw new ForbiddenException('No puedes jugar el turno de una batalla ajena');
    }
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

    if (battle.status === 'FINISHED') {
      throw new BadRequestException('La batalla ha finalizado');
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
    turnSummary: {
      playerAttack: {
        attackLevel: AttackLevel;
        baseAttack: number;
        rolledAttack: number;
        damage: number;
      };
      machineAttack: {
        attackLevel: AttackLevel;
        baseAttack: number;
        rolledAttack: number;
        damage: number;
      } | null;
    };
  }) {
    const {
      battleId,
      initiatorUserId,
      initiatorHp,
      machineHp,
      initiatorWon,
      turnSummary,
    } = params;

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

    this.websocketsGateway.emitBattleUpdate(finishedBattle.id, {
      type: 'BATTLE_FINISHED',
      data: finishedBattle,
      turnSummary,
    });

    return {
      message: 'Turno aplicado y batalla finalizada',
      turnSummary,
      ...finishedBattle,
    };
  }

  // guarda el estado intermedio de una batalla vs maquina cuando no ha ganado nadie aun
  private async updatePveBattleInProgress(params: {
    battleId: number;
    initiatorHp: number;
    machineHp: number;
    turnSummary: {
      playerAttack: {
        attackLevel: AttackLevel;
        baseAttack: number;
        rolledAttack: number;
        damage: number;
      };
      machineAttack: {
        attackLevel: AttackLevel;
        baseAttack: number;
        rolledAttack: number;
        damage: number;
      };
    };
  }) {
    const { battleId, initiatorHp, machineHp, turnSummary } = params;
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

    this.websocketsGateway.emitBattleUpdate(updatedBattle.id, {
      type: 'TURN_APPLIED',
      data: updatedBattle,
      turnSummary,
    });

    return {
      message: 'Turno aplicado',
      turnSummary,
      ...updatedBattle,
    };
  }

  //esto por darle un poco de vidilla al juego si no era un poco aburrio siempre
  // genera ataque aleatorio para que cada turno tenga variación y no sea siempre fijo
  private rollAttack(baseAttack: number): AttackRoll {
    const rng = Math.random();

    if (rng < 0.2) {
      const rolledAttack = Math.max(1, Math.round(baseAttack * 0.8));
      return {
        attackLevel: 'BAJO',
        baseAttack,
        rolledAttack,
        damage: rolledAttack,
      };
    }

    if (rng < 0.75) {
      const rolledAttack = Math.max(1, Math.round(baseAttack * 1.0));
      return {
        attackLevel: 'NORMAL',
        baseAttack,
        rolledAttack,
        damage: rolledAttack,
      };
    }

    if (rng < 0.95) {
      const rolledAttack = Math.max(1, Math.round(baseAttack * 1.2));
      return {
        attackLevel: 'ALTO',
        baseAttack,
        rolledAttack,
        damage: rolledAttack,
      };
    }

    const rolledAttack = Math.max(1, Math.round(baseAttack * 1.5));
    return {
      attackLevel: 'CRITICO',
      baseAttack,
      rolledAttack,
      damage: rolledAttack,
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
