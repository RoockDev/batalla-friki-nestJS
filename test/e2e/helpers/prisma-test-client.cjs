require('dotenv/config');
const { PrismaClient } = require('../../../generated/prisma2');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres:test@localhost:5434/ejemploPrisma_test?schema=public',
  }),
});

module.exports.prisma = prisma;
