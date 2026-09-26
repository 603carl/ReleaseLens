import express from 'express';
import cors from 'cors';
import { repositoryRouter } from './routes/repository.routes.js';
import { analysisRouter } from './routes/analysis.routes.js';
import { checksRouter } from './routes/checks.routes.js';
import { findingsRouter } from './routes/findings.routes.js';
import { dossierRouter } from './routes/dossier.routes.js';
import { demoRouter } from './routes/demo.routes.js';

export const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() });
});

app.use('/api/repositories', repositoryRouter);
app.use('/api', analysisRouter);
app.use('/api/checks', checksRouter);
app.use('/api/findings', findingsRouter);
app.use('/api/dossier', dossierRouter);
app.use('/api/demo', demoRouter);

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