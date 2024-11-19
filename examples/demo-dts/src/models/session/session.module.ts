import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionRepository } from './session.repository';
import { SessionEntity } from './session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SessionEntity])],
  providers: [SessionRepository],
  exports: [SessionRepository],
})
export class SessionModule {}
