require('dotenv/config');

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../../generated/prisma2');
const { seedRoles } = require('./roles.seed.cjs');
const { seedAdminUser } = require('./admin-user.seed.cjs');
const { seedCharacters } = require('./characters.seed.cjs');

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main() {
  await seedRoles(prisma);
  await seedAdminUser(prisma);
  await seedCharacters(prisma);
}

main()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
