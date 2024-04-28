import { Controller, Get, Headers } from '@dx/oakest';

@Controller()
export class AppController {
  @Get()
  get(@Headers('user-agent') userAgent: string) {
    return { status: 'ok', userAgent };
  }
}
