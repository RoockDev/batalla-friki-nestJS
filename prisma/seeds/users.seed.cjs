const bcrypt = require('bcrypt');

const USERS_PASSWORD = '123456';
const USERS_TO_SEED = [
  'user1@batalla.com',
  'user2@batalla.com',
  'user3@batalla.com',
  'user4@batalla.com',
  'user5@batalla.com',
];

async function seedUsers(prisma) {
  const userRole = await prisma.role.findUnique({
    where: { name: 'USER' },
  });

  if (!userRole) {
    throw new Error('No existe el rol USER. Ejecuta seedRoles antes.');
  }

  const hashedPassword = await bcrypt.hash(USERS_PASSWORD, 10);

  for (const email of USERS_TO_SEED) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { password: hashedPassword },
      create: {
        email,
        password: hashedPassword,
      },
    });

    await prisma.userRole.deleteMany({
      where: {
        userId: user.id,
        roleId: userRole.id,
      },
    });

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: userRole.id,
      },
    });
  }

  console.log(`Users seeded: ${USERS_TO_SEED.join(', ')}`);
}

module.exports = {
  seedUsers,
  USERS_TO_SEED,
  USERS_PASSWORD,
};
