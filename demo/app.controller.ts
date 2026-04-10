import { Controller, Get, Headers, inject } from '../mod.ts';

import { SharedService } from './shared/shared.service.ts';

@Controller()
export class AppController {
  constructor(private readonly _sharedService = inject(SharedService)) {}

  @Get()
  get(@Headers('user-agent') userAgent: string) {
    return { status: 'ok', userAgent };
  }

  @Get('shared')
  getShared() {
    return this._sharedService.content;
  }
}
