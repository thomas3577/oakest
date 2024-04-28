import { Injectable } from '@dx/oakest';

@Injectable()
export class SampleService {
  get() {
    return { value: 123, status: 'ok' };
  }
}
