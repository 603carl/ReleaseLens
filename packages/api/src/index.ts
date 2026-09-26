import express from 'express';
import cors from 'cors';
import { initDb } from './store/db.js';
import { repositoryRouter } from './routes/repository.routes.js';
import { analysisRouter } from './routes/analysis.routes.js';
import { checksRouter } from './routes/checks.routes.js';
import { findingsRouter } from './routes/findings.routes.js';
import { dossierRouter } from './routes/dossier.routes.js';
import { demoRouter } from './routes/demo.routes.js';

const PORT = process.env.PORT ?? 3001;

async function bootstrap() {
  // Initialize SQLite database and run schema migrations
  await initDb();

  const app = express();

  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() });
  });

  // Domain routes
  app.use('/api/repositories', repositoryRouter);
  app.use('/api', analysisRouter);
  app.use('/api/checks', checksRouter);
  app.use('/api/findings', findingsRouter);
  app.use('/api/dossier', dossierRouter);
  app.use('/api/demo', demoRouter);

  // Global error handler
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error('[ReleaseLens API Error]', err);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: err.message ?? 'Unexpected error' },
      });
    },
  );

  app.listen(PORT, () => {
    console.log(`[ReleaseLens API] Listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[ReleaseLens API] Fatal startup error:', err);
  process.exit(1);
});
