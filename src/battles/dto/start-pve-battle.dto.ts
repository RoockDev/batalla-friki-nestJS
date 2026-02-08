import { IsInt, Min } from 'class-validator';

export class StartPveBattleDto {
  @IsInt()
  @Min(1)
  myCharacterId: number;

  @IsInt()
  @Min(1)
  machineCharacterId: number;
}
