import { Controller, Get, UseGuards } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';

@Controller('characters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CharactersController {
  constructor(private readonly characterService: CharactersService) {}

  @Get()
  @Roles('USER', 'ADMIN')
  findAll() {
    return this.characterService.findAll();
  }
}
