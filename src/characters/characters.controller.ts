import { Body, Controller, Get, Post } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { AttackCharacterDto } from './dto/attack-character.dto';

@Controller('characters')
export class CharactersController {
  constructor(private readonly characterService: CharactersService) {}

  @Get()
  findAll() {
    return this.characterService.findAll();
  }

  @Post('attack')
  attack(@Body() attackCharacterDto: AttackCharacterDto) {
    return this.characterService.attack(attackCharacterDto);
  }

  @Post('reset')
  reset(){
    return this.characterService.reset();
  }
}
