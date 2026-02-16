require('dotenv/config');

const { seedRoles } = require('./roles.seed.cjs');
const { seedAdminUser } = require('./admin-user.seed.cjs');
const { seedUsers } = require('./users.seed.cjs');
const { seedCharacters } = require('./characters.seed.cjs');

async function runSeed(prismaClient) {
  await seedRoles(prismaClient);
  await seedAdminUser(prismaClient);
  await seedUsers(prismaClient);
  await seedCharacters(prismaClient);
}

async function main() {
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../../generated/prisma2');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
  });

  await runSeed(prisma);

  await prisma.$disconnect();
}

module.exports = {
  runSeed,
};

if (require.main === module) {
  main().catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  });
}
