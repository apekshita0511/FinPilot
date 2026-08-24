import 'dotenv/config';

import { createApp } from './app';
import { env } from './lib/env';

const app = createApp();

// Vercel's Express auto-detection wraps this exported app as a single
// serverless function (no vercel.json rewrites needed) — see FinPilot
// Phase 10 deployment notes. Local dev still uses app.listen() below.
export default app;

if (process.env.VERCEL === undefined) {
  app.listen(env.PORT, () => {
    console.log(`FinPilot API listening on port ${env.PORT}`);
  });
}
