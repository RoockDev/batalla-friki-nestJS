const bcrypt = require('bcrypt');

async function seedAdminUser(prisma) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@batalla.com';
  const adminPassword = process.env.ADMIN_PASSWORD || '123456';

  const adminRole = await prisma.role.findUnique({
    where: { name: 'ADMIN' },
  });

  if (!adminRole) {
    throw new Error('No existe el rol ADMIN. Ejecuta seedRoles antes.');
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword },
    create: {
      email: adminEmail,
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

  console.log(`Admin seeded: ${adminEmail}`);
}

module.exports = {
  seedAdminUser,
};
