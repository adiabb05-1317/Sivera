interface AppConfig {
  // API Configuration
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };

  // Cache Configuration
  cache: {
    defaultTTL: number;
    staleTime: number;
    maxSize: number;
    enablePersistence: boolean;
  };

  // Authentication Configuration
  auth: {
    sessionTimeout: number;
    refreshThreshold: number;
    cookieDomain: string;
    cookieSecure: boolean;
    cookieSameSite: 'Strict' | 'Lax' | 'None';
  };

  // Feature Flags
  features: {
    optimisticUpdates: boolean;
    offlineMode: boolean;
    analytics: boolean;
    errorReporting: boolean;
    performanceMonitoring: boolean;
  };

  // Performance Configuration
  performance: {
    debounceDelay: number;
    throttleDelay: number;
    maxConcurrentRequests: number;
    prefetchEnabled: boolean;
  };

  // Environment
  environment: 'development' | 'staging' | 'production';
  version: string;
  buildTime: string;
}

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' || process.env.NODE_ENV === 'test';

export const config: AppConfig = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || 'https://api.sivera.io',
    timeout: isDevelopment ? 30000 : 15000, // 30s dev, 15s prod
    retryAttempts: isProduction ? 3 : 1,
    retryDelay: 1000,
  },

  cache: {
    defaultTTL: isDevelopment ? 2 * 60 * 1000 : 5 * 60 * 1000, // 2min dev, 5min prod
    staleTime: isDevelopment ? 30 * 1000 : 60 * 1000, // 30s dev, 1min prod
    maxSize: 100, // Max cached items per store
    enablePersistence: isProduction, // Only persist in production
  },

  auth: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    refreshThreshold: 5 * 60 * 1000, // Refresh 5 minutes before expiry
    cookieDomain: isProduction ? '.sivera.io' : '',
    cookieSecure: isProduction || isStaging,
    cookieSameSite: isProduction ? 'None' : 'Lax',
  },

  features: {
    optimisticUpdates: true,
    offlineMode: isProduction, // Enable offline mode in production
    analytics: isProduction || isStaging,
    errorReporting: isProduction || isStaging,
    performanceMonitoring: isProduction,
  },

  performance: {
    debounceDelay: 300,
    throttleDelay: 1000,
    maxConcurrentRequests: isDevelopment ? 10 : 5,
    prefetchEnabled: isProduction,
  },

  environment: isStaging ? 'staging' : (process.env.NODE_ENV as AppConfig['environment']) || 'development',
  version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString(),
};

// Configuration validation
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.api.baseUrl) {
    errors.push('API base URL is required');
  }

  if (config.api.timeout < 1000) {
    errors.push('API timeout must be at least 1000ms');
  }

  if (config.cache.defaultTTL < 10000) {
    errors.push('Cache TTL must be at least 10 seconds');
  }

  if (isProduction && !config.api.baseUrl.startsWith('https://')) {
    errors.push('Production API must use HTTPS');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Environment-specific utilities
export const isDev = isDevelopment;
export const isProd = isProduction;
export const isStg = isStaging;

// Logging configuration
export const shouldLog = (level: 'debug' | 'info' | 'warn' | 'error'): boolean => {
  if (isDevelopment) return true;
  if (level === 'error' || level === 'warn') return true;
  if (level === 'info' && (isStaging || isProduction)) return true;
  return false;
};

// Debug helpers
export const debugInfo = {
  config: isDevelopment ? config : 'Hidden in production',
  environment: config.environment,
  version: config.version,
  buildTime: config.buildTime,
  userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
  timestamp: new Date().toISOString(),
};