import { IsInt, Min } from 'class-validator';

export class AttackCharacterDto {
  @IsInt()
  @Min(1)
  attackerId: number;

  @IsInt()
  @Min(1)
  targetId: number;
}
