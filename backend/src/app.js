import express from 'express';
import helmet from 'helmet';
import { redirectRouter } from './modules/links/links.routes.js';
import { apiRouter } from './modules/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { cors } from './middleware/cors.js';
import { config } from './config.js';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxyHops);
app.use(helmet());
app.use('/api', cors);
app.use(express.json({ limit: '16kb' }));
app.use('/api', apiRouter);
app.use('/r', redirectRouter);
app.use(notFoundHandler);
app.use(errorHandler);
