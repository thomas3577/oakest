import { Application } from '@oak/oak';
import { assignModule } from '../mod.ts';

import { AppModule } from './app.module.ts';

const app = new Application();
app.use(assignModule(AppModule));

await app.listen({ port: 8000 });
