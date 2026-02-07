import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import * as bcrypt from 'bcrypt';
import type { Prisma } from '../../generated/prisma2';


// Prisma.UserGetPayload sirve para que TypeScript sepa exactamente qué datos devuelve Prisma cuando usamos include o select
// he buscado para hacerlo asi por el tema de los roles
// no he hecho es login y e lregistro asi, por que queria hacerlo distinto 
// y he buscado ejemplos para que ni el login devuelva el token ni el register tenga que llamar al login para que devuelva
//el token y quedarse logueado y hacer un metodo que devuelva la respuesta de autenticacion con token y el user me ha parecido
// muy chulo y limpio la verdad y me ha gustado asique lo dejo asi jajaj
type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    roles: {
      include: { role: true };
    };
  };
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  //registro
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userRole = await this.prisma.role.findUnique({
      where: { name: 'USER' },
    });

    if (!userRole) {
      throw new BadRequestException('El rol USER no existe en la base de datos');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        roles: {
          create: [{ roleId: userRole.id }],
        },
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    return this.buildAuthResponse(user);
  }

  //login
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: UserWithRoles): AuthResponseDto {
    const roles = user.roles.map((userRoleItem) => userRoleItem.role.name);
    const payload = {
      sub: user.id,
      email: user.email,
      roles,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        level: user.level,
        xp: user.xp,
        wins: user.wins,
        losses: user.losses,
        roles,
      },
    };
  }
}
