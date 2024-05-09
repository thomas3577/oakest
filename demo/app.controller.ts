import { Controller, Get, Headers } from '../mod.ts';

@Controller()
export class AppController {
  @Get()
  get(@Headers('user-agent') userAgent: string) {
    return { status: 'ok', userAgent };
  }
}
