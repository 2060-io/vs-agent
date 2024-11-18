import { Module } from '@nestjs/common';
import { SessionModule } from './session/session.module';

@Module({
  imports: [SessionModule],
  controllers: [],
  providers: [],
})
export class ModelsModule {}
