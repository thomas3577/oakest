// deno-lint-ignore-file verbatim-module-syntax
import { Controller, Get, Headers } from '../mod.ts';

import { SharedService } from './shared/shared.service.ts';

@Controller()
export class AppController {
  constructor(private sharedService: SharedService) {}

  @Get()
  get(@Headers('user-agent') userAgent: string) {
    return { status: 'ok', userAgent };
  }

  @Get('shared')
  getShared() {
    return this.sharedService.content;
  }
}
