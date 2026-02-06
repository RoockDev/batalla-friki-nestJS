async function seedRoles(prisma) {
  await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: { name: 'USER' },
  });

  console.log('Roles seeded: ADMIN, USER');
}

module.exports = {
  seedRoles,
};
