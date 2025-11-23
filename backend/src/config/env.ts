import { config } from 'dotenv';

config();

interface EnvConfig {
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
  NODE_ENV: string;
}

/**
 * Validate required environment variables
 */
export function validateEnv(): EnvConfig {
  const errors: string[] = [];

  // Support both MONGODB_URI and MONGO_URI for backward compatibility
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  // Required variables
  if (!mongoUri) {
    errors.push('Missing required environment variable: MONGODB_URI (or MONGO_URI)');
  }

  if (!process.env.JWT_SECRET) {
    errors.push('Missing required environment variable: JWT_SECRET');
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long for security');
  }

  // Validate PORT if provided
  const port = parseInt(process.env.PORT || '3000');
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push('PORT must be a valid number between 1 and 65535');
  }

  // Validate MongoDB URI format
  if (mongoUri && !mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    errors.push('MongoDB URI must start with mongodb:// or mongodb+srv://');
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }

  const config: EnvConfig = {
    PORT: port,
    MONGODB_URI: mongoUri!,
    JWT_SECRET: process.env.JWT_SECRET!,
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
    NODE_ENV: process.env.NODE_ENV || 'development',
  };

  // Log configuration (without sensitive data)
  console.log('✅ Environment validation successful');
  console.log(`   PORT: ${config.PORT}`);
  console.log(`   MONGODB_URI: ${config.MONGODB_URI.substring(0, 20)}...`);
  console.log(`   JWT_SECRET: [REDACTED] (${config.JWT_SECRET.length} chars)`);
  console.log(`   CORS_ORIGIN: ${config.CORS_ORIGIN}`);
  console.log(`   NODE_ENV: ${config.NODE_ENV}`);

  return config;
}

/**
 * Get validated environment config
 */
export function getEnvConfig(): EnvConfig {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  return {
    PORT: parseInt(process.env.PORT || '3000'),
    MONGODB_URI: mongoUri!,
    JWT_SECRET: process.env.JWT_SECRET!,
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}
