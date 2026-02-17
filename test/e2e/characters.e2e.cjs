const request = require('supertest');
const kleur = require('kleur');
const { describe, it } = require('./helpers/test-runner.cjs');

async function runCharactersTests(BASE_URL) {
  await describe(kleur.blue('---- test de characteres'), async () => {
    await it('GET /characters con token devuelve array', async () => {
      const email = `e2e_char_${Date.now()}@test.com`;
      const password = '123456';

      const registerRes = await request(BASE_URL)
        .post('/auth/register')
        .send({ email, password })
        .expect(201);

      const token = registerRes.body?.data?.access_token;
      if (!token) throw new Error(kleur.red('No se obtuvo token '));

      const res = await request(BASE_URL)
        .get('/characters')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const data = res.body?.data;
      if (!Array.isArray(data)) {
        throw new Error(kleur.red('GET /characters no devuelve array'));
      }

      if (data.length === 0) {
        throw new Error(kleur.red('GET /characters esta muy vacio'));
      }

      console.log(kleur.green(' GET /characters'));
    });
  });

  console.log(kleur.blue('✅ ---- el test de los caracteres ha ido muy muy bien\n'));
}

module.exports = { runCharactersTests };
