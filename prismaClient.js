const { PrismaClient } = require('@prisma/client');

// Prevent multiple instances of Prisma Client in development
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['error', 'warn']
    });
  }
  prisma = global.prisma;
}

// Helper to verify database connectivity
const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true };
  } catch (err) {
    return { connected: false, error: err.message };
  }
};

module.exports = {
  prisma,
  checkDatabaseConnection
};
