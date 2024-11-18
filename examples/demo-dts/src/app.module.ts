import { Module } from '@nestjs/common';
import { ModelsModule } from './models';
import { CoreModule } from './core/core.module';

@Module({
  imports: [
    ModelsModule,
    CoreModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
