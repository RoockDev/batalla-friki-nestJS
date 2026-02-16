const bcrypt = require('bcrypt');

const ADMIN_EMAIL = 'admin@batalla.com';
const ADMIN_PASSWORD = '123456';

async function seedAdminUser(prisma) {
  const adminRole = await prisma.role.findUnique({
    where: { name: 'ADMIN' },
  });

  if (!adminRole) {
    throw new Error('No existe el rol ADMIN. Ejecuta seedRoles antes.');
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { password: hashedPassword },
    create: {
      email: ADMIN_EMAIL,
      password: hashedPassword,
    },
  });

  await prisma.userRole.deleteMany({
    where: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log(`Admin seeded: ${ADMIN_EMAIL}`);
}

module.exports = {
  seedAdminUser,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
};
