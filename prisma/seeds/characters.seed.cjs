async function seedCharacters(prisma) {
  const characters = [
    { name: 'Luke Skywalker', hp: 100, baseHp: 100, attack: 20, levelRequired: 1 },
    { name: 'Darth Vader', hp: 140, baseHp: 140, attack: 30, levelRequired: 3 },
    { name: 'Obi-Wan Kenobi', hp: 120, baseHp: 120, attack: 24, levelRequired: 2 },
    { name: 'Yoda', hp: 110, baseHp: 110, attack: 32, levelRequired: 4 },
    { name: 'Han Solo', hp: 90, baseHp: 90, attack: 18, levelRequired: 1 },
    { name: 'Boba Fett', hp: 105, baseHp: 105, attack: 22, levelRequired: 2 },
  ];

  await prisma.character.deleteMany({
    where: {
      name: { in: characters.map((character) => character.name) },
    },
  });

  await prisma.character.createMany({
    data: characters,
  });

  console.log('Characters seeded: Star Wars roster');
}

module.exports = {
  seedCharacters,
};
