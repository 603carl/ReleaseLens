import { initDb } from './store/db.js';
import { app } from './app.js';

const PORT = process.env.PORT ?? 3001;

async function bootstrap() {
  await initDb();

  app.listen(PORT, () => {
    console.log(`[ReleaseLens API] Listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[ReleaseLens API] Fatal startup error:', err);
  process.exit(1);
});
