import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  //registro
  async register(registerDto: RegisterDto) {
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

    return {
      id: user.id,
      email: user.email,
      level: user.level,
      xp: user.xp,
      wins: user.wins,
      losses: user.losses,
      roles: user.roles.map((userRoleItem) => userRoleItem.role.name),
    };
  }

  //login
  async login(loginDto: LoginDto) {
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

    return {
      id: user.id,
      email: user.email,
      level: user.level,
      xp: user.xp,
      wins: user.wins,
      losses: user.losses,
      roles: user.roles.map((userRoleItem) => userRoleItem.role.name),
    };
  }
}
