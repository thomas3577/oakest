import { Module } from '../mod.ts';

import { AppController } from './app.controller.ts';
import { SampleModule } from './sample/sample.module.ts';

@Module({
  modules: [SampleModule],
  controllers: [AppController],
  routePrefix: 'v1',
})
export class AppModule {}
