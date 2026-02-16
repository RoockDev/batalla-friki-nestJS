import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

type JwtPayload = {
  sub: number;
  email?: string;
  roles?: string[];
};

type SocketAuthUser = {
  id: number;
  email?: string;
  roles: string[];
};

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
@Injectable()
/**
 * he estado y mirando y como siempre me pregunto que si a las cosas se le puede meter alguna
 * capa de seguridad o como seria en entorno corporativo he visto que esto se suele hacer y 
 * lo he buscado y lo he añadido
 * aunque en el service ya tenga validaciones
 * de la batalla  porque por WebSocket también puede entrar gente
 * y claro he pensado que  cualquier usuario puede conectarse y escuchar eventos
 * de batallas que no son suyas solo sabiendo un battleId y puede hacer cosas que vaya
 * contra la integridad de muchos gatitos
 * por eso aquí hago dos controles
 * en la conexión ws compruebo el jwt y guardo el user en client.data
 * en join-battle-room compruebo en base de datos que ese usuario pertenece a esa
 *  batalla iniciador u oponente  y si no pertenece se rechaza
 * así  se evita  exponer información de partidas de otros y se mantiene la seguridad por canal
 * aquí solo se  controla autenticación/autorización del canal en tiempo real
 * todo esto apoyado de la ia
 */
export class WebsocketsGateway {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  @WebSocketServer()
  io: Server;

  private readonly logger = new Logger(WebsocketsGateway.name);

  // Se ejecuta al conectar un cliente por ws  valida token y guarda el usuario en el socket
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.SECRET_KEY || 'secretKey',
      });

      if (!payload?.sub) {
        throw new Error('Token inválido');
      }

      client.data.user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles ?? [],
      } satisfies SocketAuthUser;

      this.logger.log(
        `Cliente conectado: ${client.id} userId=${client.data.user.id}`,
      );
    } catch (error) {
      this.logger.warn(
        `Conexión WS rechazada (${client.id}): ${error instanceof Error ? error.message : 'token inválido'}`,
      );
      client.disconnect(true);
    }
  }

  // Solo log de desconexión para  pruebas y depurar
  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  
  // Aquí se valida que el socket esté autenticado y que battleId sea correcto
  @SubscribeMessage('join-battle-room')
  handleJoinBattleRoom(
    @MessageBody() payload: { battleId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as SocketAuthUser | undefined;

    if (!user) {
      throw new WsException('Socket no autenticado');
    }

    if (!payload?.battleId || Number.isNaN(Number(payload.battleId))) {
      throw new WsException('battleId inválido');
    }

    return this.joinBattleRoomAuthorized(client, Number(payload.battleId), user);
  }

  // Verifica permisos de salaadmin entra en cualquiera, usuario normal solo en sus batallas
  private async joinBattleRoomAuthorized(
    client: Socket,
    battleId: number,
    user: SocketAuthUser,
  ) {
    if (!user.roles.includes('ADMIN')) {
      const battle = await this.prisma.battle.findFirst({
        where: {
          id: battleId,
          OR: [{ initiatorUserId: user.id }, { opponentUserId: user.id }],
        },
        select: { id: true },
      });

      if (!battle) {
        throw new WsException('No autorizado para unirte a esta batalla');
      }
    }

    const room = `battle:${battleId}`;
    client.join(room);
    this.logger.log(`Socket ${client.id} unido a ${room}`);

    client.emit('joined-battle-room', {
      room,
      battleId,
      socketId: client.id,
      timestamp: Date.now(),
    });

    return { ok: true, room };
  }

  // Saca el JWT
  private extractToken(client: Socket): string {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken.trim();
    }

    const authHeader = client.handshake.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }

    throw new Error('Token JWT no enviado');
  }

  //  reutilizable desde battleservice para emitir actualizaciones en tiempo real
  emitBattleUpdate(
    battleId: number,
    payload: {
      type: 'TURN_APPLIED' | 'BATTLE_FINISHED' | 'BATTLE_JOINED';
      data: unknown;
      turnAttack?: unknown;
      turnSummary?: unknown;
    },
  ) {
    const room = `battle:${battleId}`;
    this.io.to(room).emit('battle-updated', payload);
  }
}
