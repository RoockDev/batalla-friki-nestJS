import { Module } from '@nestjs/common';
import { BattlesService } from './battles.service';
import { BattlesController } from './battles.controller';

@Module({
  providers: [BattlesService],
  controllers: [BattlesController]
})
export class BattlesModule {}
