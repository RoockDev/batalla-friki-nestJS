import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CharactersModule } from './characters/characters.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BattlesModule } from './battles/battles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CharactersModule, 
    PrismaModule, AuthModule, BattlesModule
  ],
})
export class AppModule {}
