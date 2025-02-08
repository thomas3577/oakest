// deno-lint-ignore-file verbatim-module-syntax
import { Body, Controller, Get, IP, Param, Post, Query } from '../../mod.ts';

import { SharedService } from '../shared/shared.service.ts';
import { SampleService } from './sample.service.ts';

@Controller()
export class SampleController {
  constructor(
    private readonly _sampleService: SampleService,
    private readonly _sharedService: SharedService,
  ) {}

  @Get()
  get() {
    return this._sampleService.get();
  }

  @Post()
  post(@Body() body: any) {
    return body;
  }

  @Get('test/:id')
  test(@Param('id') id: string, @Query() test: any, @IP() ip: string) {
    return { id, ...test, ip };
  }

  @Get('shared')
  getShared() {
    return this._sharedService.content;
  }
}
