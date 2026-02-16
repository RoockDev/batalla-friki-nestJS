import { IsInt, Min } from 'class-validator';

export class JoinPvpBattleDto {
  @IsInt()
  @Min(1)
  myCharacterId: number;
}
