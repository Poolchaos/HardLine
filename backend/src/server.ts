import express from 'express';
import cors from 'cors';
import { validateEnv } from './config/env';
import { connectDatabase } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import logger from './config/logger';

import budgetRoutes from './routes/budget';
import transactionRoutes from './routes/transactions';
import shoppingRoutes from './routes/shopping';
import settingsRoutes from './routes/settings';
import authRoutes from './routes/auth';
import debitOrderRoutes from './routes/debitOrders';
import statsRoutes from './routes/stats';
import templateRoutes from './routes/templates';
import priceRoutes from './routes/prices';

// Validate environment variables before starting
const envConfig = validateEnv();

const app = express();
const PORT = envConfig.PORT;
const CORS_ORIGIN = envConfig.CORS_ORIGIN;

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use(apiLimiter);

// Request logging
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || `req-${Date.now()}`;
  req.headers['x-correlation-id'] = correlationId as string;
  logger.info({
    method: req.method,
    path: req.path,
    correlationId,
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/debit-orders', debitOrderRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/shopping', shoppingRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
