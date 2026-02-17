const request = require('supertest');
const kleur = require('kleur');
const { describe, it } = require('./helpers/test-runner.cjs');

async function runBattlesTests(BASE_URL) {
  await describe(kleur.blue('---- los tests de las batallas'), async () => {
    await it('POST /battles/start/pve crea batalla en estado IN_PROGRESS', async () => {
      const email = `e2e_battle_${Date.now()}@test.com`;
      const password = '123456';

      const registerRes = await request(BASE_URL)
        .post('/auth/register')
        .send({ email, password })
        .expect(201);

      const token = registerRes.body?.data?.access_token;
      if (!token) throw new Error(kleur.red('No se obtuvo token en register'));

      const charactersRes = await request(BASE_URL)
        .get('/characters')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const characters = charactersRes.body?.data;
      if (!Array.isArray(characters) || characters.length < 2) {
        throw new Error(kleur.red('Se necesitan al menos 2 personajes'));
      }

      const sorted = [...characters].sort((a, b) => a.levelRequired - b.levelRequired);
      const myCharacter = sorted[0];
      const machineCharacter = sorted.find((c) => c.id !== myCharacter.id);

      const createRes = await request(BASE_URL)
        .post('/battles/start/pve')
        .set('Authorization', `Bearer ${token}`)
        .send({
          myCharacterId: myCharacter.id,
          machineCharacterId: machineCharacter.id,
        })
        .expect(201);

      const data = createRes.body?.data;
      if (!data?.battleId) throw new Error(kleur.red('No se devolvió battleId'));
      if (data?.status !== 'IN_PROGRESS') {
        throw new Error(kleur.red('La batalla no en IN_PROGRESS'));
      }

      console.log(kleur.green(' POST /battles/start/pve'));
    });
  });

  console.log(kleur.blue('✅ ---- muy buenos los tests de las batallas \n'));
}

module.exports = { runBattlesTests };
