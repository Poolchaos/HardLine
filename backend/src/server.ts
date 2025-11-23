import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { validateEnv } from './config/env';
import { connectDatabase } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import logger from './config/logger';
import { processAutoDebits } from './services/autoDebitService';

import budgetRoutes from './routes/budget';
import transactionRoutes from './routes/transactions';
import shoppingRoutes from './routes/shopping';
import globalItemsRoutes from './routes/globalItems';
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
app.use('/api/global-items', globalItemsRoutes);
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

    // Initialize cron job for auto-debits
    // Runs every day at 1:00 AM
    cron.schedule('0 1 * * *', async () => {
      logger.info('Running scheduled auto-debit processing...');
      try {
        await processAutoDebits();
      } catch (error) {
        logger.error('Error in scheduled auto-debit job:', error);
      }
    });

    logger.info('✅ Auto-debit cron job initialized (runs daily at 1:00 AM)');

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
