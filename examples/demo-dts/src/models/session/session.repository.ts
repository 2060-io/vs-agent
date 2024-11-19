// session.repository.ts
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SessionEntity } from './session.entity';

@Injectable()
export class SessionRepository extends Repository<SessionEntity> {
  constructor(private dataSource: DataSource) {
    super(SessionEntity, dataSource.createEntityManager());
  }
}
