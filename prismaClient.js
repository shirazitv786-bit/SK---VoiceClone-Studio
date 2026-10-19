const { PrismaClient } = require('@prisma/client');

/**
 * Normalizes and secures the PostgreSQL connection string.
 * Auto-detects Railway environment variables and adds optimal timeout & SSL settings.
 */
function getNormalizedDatabaseUrl() {
  let url = process.env.DATABASE_URL;

  // Fallback to individual Railway PG environment variables if DATABASE_URL is not set
  if (!url && process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD) {
    const host = process.env.PGHOST;
    const port = process.env.PGPORT || 5432;
    const user = encodeURIComponent(process.env.PGUSER);
    const pass = encodeURIComponent(process.env.PGPASSWORD);
    const db = process.env.PGDATABASE || 'railway';
    url = `postgresql://${user}:${pass}@${host}:${port}/${db}?sslmode=require`;
    process.env.DATABASE_URL = url;
  }

  if (url && typeof url === 'string') {
    const isRemote = url.includes('proxy.rlwy.net') || 
                     url.includes('railway.net') || 
                     url.includes('.rlwy.net') || 
                     (!url.includes('localhost') && !url.includes('127.0.0.1'));

    if (isRemote) {
      // Ensure SSL is required for remote Railway database connections
      if (!url.includes('sslmode=')) {
        url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
      }
      // Configure connection timeout (20s) to prevent premature drops across proxies
      if (!url.includes('connect_timeout=')) {
        url += '&connect_timeout=20';
      }
      // Configure pool acquisition timeout (20s)
      if (!url.includes('pool_timeout=')) {
        url += '&pool_timeout=20';
      }
    }
    process.env.DATABASE_URL = url;
  }

  return url;
}

const dbUrl = getNormalizedDatabaseUrl();

// Prevent multiple instances of Prisma Client in development
let prisma;

const clientOptions = {
  ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {})
};

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(clientOptions);
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      ...clientOptions,
      log: ['error', 'warn']
    });
  }
  prisma = global.prisma;
}

// Helper to verify database connectivity with timeout
const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true };
  } catch (err) {
    return { connected: false, error: err.message, code: err.code };
  }
};

module.exports = {
  prisma,
  checkDatabaseConnection,
  getNormalizedDatabaseUrl
};

