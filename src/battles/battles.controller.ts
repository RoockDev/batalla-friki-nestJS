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
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';

@Controller('battles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('USER', 'ADMIN')
export class BattlesController {
  constructor(private readonly battlesService: BattlesService) {}

 @Post('start/pve')
startPve(@Req() req: Request, @Body() dto: StartPveBattleDto) {
  const user = req.user as { id: number };
  return this.battlesService.startPve(user.id, dto);
}


  @Post('start/pvp')
  startPvp(@Req() req: Request,@Body() dto: StartPvpBattleDto) {
    const user = req.user as {id:number}
    return this.battlesService.startPvp(user.id,dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.battlesService.findOne(id);
  }
}
