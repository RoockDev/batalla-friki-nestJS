import { IsInt, Min } from 'class-validator';

export class StartPvpBattleDto {
  @IsInt()
  @Min(1)
  opponentUserId: number;

  @IsInt()
  @Min(1)
  myCharacterId: number;

  @IsInt()
  @Min(1)
  opponentCharacterId: number;
}
