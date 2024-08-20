import { Injectable } from '../../mod.ts';

@Injectable()
export class SharedService {
  get content() {
    return 'TEST';
  }
}
