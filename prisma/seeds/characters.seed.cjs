async function seedCharacters(prisma) {
  const characters = [
    { name: 'Luke Skywalker', hp: 100, baseHp: 100, attack: 20, levelRequired: 1 },
    { name: 'Han Solo', hp: 90, baseHp: 90, attack: 18, levelRequired: 1 },
    { name: 'Leia Organa', hp: 95, baseHp: 95, attack: 19, levelRequired: 1 },
    { name: 'Obi-Wan Kenobi', hp: 120, baseHp: 120, attack: 24, levelRequired: 2 },
    { name: 'Boba Fett', hp: 105, baseHp: 105, attack: 22, levelRequired: 2 },
    { name: 'Ahsoka Tano', hp: 115, baseHp: 115, attack: 25, levelRequired: 2 },
    { name: 'Darth Vader', hp: 140, baseHp: 140, attack: 30, levelRequired: 3 },
    { name: 'Mace Windu', hp: 130, baseHp: 130, attack: 28, levelRequired: 3 },
    { name: 'Yoda', hp: 110, baseHp: 110, attack: 32, levelRequired: 4 },
    { name: 'Darth Maul', hp: 125, baseHp: 125, attack: 29, levelRequired: 4 },
    { name: 'Emperor Palpatine', hp: 100, baseHp: 100, attack: 35, levelRequired: 5 },
    { name: 'Rey Skywalker', hp: 118, baseHp: 118, attack: 31, levelRequired: 5 },
  ];

  for (const character of characters) {
    const result = await prisma.character.updateMany({
      where: { name: character.name },
      data: {
        hp: character.hp,
        baseHp: character.baseHp,
        attack: character.attack,
        levelRequired: character.levelRequired,
      },
    });

    if (result.count === 0) {
      await prisma.character.create({
        data: character,
      });
    }
  }

  console.log('Characters seeded: expanded roster');
}

module.exports = {
  seedCharacters,
};
