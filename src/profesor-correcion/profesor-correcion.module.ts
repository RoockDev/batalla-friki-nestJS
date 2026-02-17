import { Module } from '@nestjs/common';
import { ProfesorCorrecionController } from './profesor-correcion.controller';
import { ProfesorCorrecionService } from './profesor-correcion.service';

@Module({
  controllers: [ProfesorCorrecionController],
  providers: [ProfesorCorrecionService],
})
export class ProfesorCorrecionModule {}
