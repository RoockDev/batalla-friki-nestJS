import { Controller, Get, Post } from '@nestjs/common';
import { ProfesorCorrecionService } from './profesor-correcion.service';


@Controller('demo')
export class ProfesorCorrecionController {
  constructor(
    private readonly profesorCorrecionService: ProfesorCorrecionService,
  ) {}

  @Post('seed')
  seed() {
    return this.profesorCorrecionService.seedDemoData();
  }

  @Get('overview')
  overview() {
    return this.profesorCorrecionService.getOverview();
  }

  @Post('clear')
  clear() {
    return this.profesorCorrecionService.clearDatabase();
  }
}
