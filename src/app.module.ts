import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CharactersModule } from './characters/characters.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BattlesModule } from './battles/battles.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { ProfesorCorrecionModule } from './profesor-correcion/profesor-correcion.module';
import { UsersModule } from './users/users.module';



@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CharactersModule,
    PrismaModule,
    AuthModule,
    BattlesModule,
    WebsocketsModule,
    ProfesorCorrecionModule,
    UsersModule,
  ],
})
export class AppModule {}
