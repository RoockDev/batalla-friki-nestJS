import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Req } from '@nestjs/common';
import type { Request } from 'express';
import { BattlesService } from './battles.service';
import { StartPveBattleDto } from './dto/start-pve-battle.dto';
import { StartPvpBattleDto } from './dto/start-pvp-battle.dto';
import { JoinPvpBattleDto } from './dto/join-pvp-battle.dto';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';

@Controller('battles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('USER', 'ADMIN')
export class BattlesController {
  constructor(private readonly battlesService: BattlesService) {}

  //partida contra maquina
  @Post('start/pve')
  startPve(@Req() req: Request, @Body() dto: StartPveBattleDto) {
    const user = req.user as { id: number };
    return this.battlesService.startPve(user.id, dto);
  }

  //partida contra otro user
  @Post('start/pvp')
  startPvp(@Req() req: Request, @Body() dto: StartPvpBattleDto) {
    const user = req.user as { id: number };
    return this.battlesService.startPvp(user.id, dto);
  }

  @Post(':id/join/pvp')
  joinPvp(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: JoinPvpBattleDto,
  ) {
    const user = req.user as { id: number };
    return this.battlesService.joinPvp(id, user.id, dto);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const user = req.user as { id: number; roles: string[] };
    return this.battlesService.findOne(id, user);
  }

  @Post(':id/turn')
  playNextTurn(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const user = req.user as { id: number };
    return this.battlesService.playNextTurnPvp(id, user.id);
  }

  @Post(':id/turn/pve')
  playNextTurnPve(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const user = req.user as { id: number };
    return this.battlesService.playNextTurnPve(id, user.id);
  }
}
