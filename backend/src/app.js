import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { redirectRouter } from './modules/links/links.routes.js';
import { apiRouter } from './modules/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createProxyClient } from './middleware/proxy-client.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(createProxyClient());
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());
app.use('/api', apiRouter);
app.use('/r', redirectRouter);
app.use(notFoundHandler);
app.use(errorHandler);
