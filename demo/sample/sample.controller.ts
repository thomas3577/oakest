import { body, Controller, Get, inject, param, Post, query } from '../../mod.ts';
import type { RouterContext } from '@oak/oak';

import { SharedService } from '../shared/shared.service.ts';
import { SampleService } from './sample.service.ts';

@Controller()
export class SampleController {
  constructor(
    private readonly _sampleService = inject(SampleService),
    private readonly _sharedService = inject(SharedService),
  ) {}

  @Get()
  get() {
    return this._sampleService.get();
  }

  @Post([body<Record<string, unknown>>()])
  post(body: Record<string, unknown>) {
    return body;
  }

  @Get('test/:id', [param<string>('id'), query<URLSearchParams>()])
  test(id: string, test: URLSearchParams, ctx: RouterContext<string>) {
    return { id, ...Object.fromEntries(test), ip: ctx.request.ip };
  }

  @Get('shared')
  getShared() {
    return this._sharedService.content;
  }
}
