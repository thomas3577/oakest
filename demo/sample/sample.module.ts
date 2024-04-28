import { Module } from '@dx/oakest';

import { SampleController } from './sample.controller.ts';
import { SampleService } from './sample.service.ts';

@Module({
  controllers: [
    SampleController,
  ],
  providers: [
    SampleService,
  ],
  routePrefix: 'sample',
})
export class SampleModule {}
