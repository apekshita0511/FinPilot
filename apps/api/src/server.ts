import 'dotenv/config';

import { createApp } from './app';
import { env } from './lib/env';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`FinPilot API listening on port ${env.PORT}`);
});
