import { Module } from '@nestjs/common';
import { WebsocketsGateway } from './websockets.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [WebsocketsGateway],
  exports: [WebsocketsGateway],
})
export class WebsocketsModule {}
