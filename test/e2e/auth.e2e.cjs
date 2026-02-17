const request = require('supertest');
const kleur = require('kleur');
const { describe, it } = require('./helpers/test-runner.cjs');

async function runAuthTests(BASE_URL) {
  await describe(kleur.blue('---- test de auth con supertest'), async () => {
    await it('POST /auth/register devuelve token y usuario', async () => {
      const uniqueEmail = `e2e_auth_${Date.now()}@test.com`;

      const res = await request(BASE_URL)
        .post('/auth/register')
        .send({ email: uniqueEmail, password: '123456' })
        .expect(201);

      const data = res.body?.data;
      if (!data?.access_token) {
        throw new Error(kleur.red('no se ha devuelto token'));
      }

      if (data?.user?.email !== uniqueEmail) {
        throw new Error(kleur.red('El email devuelto es otro'));
      }

      console.log(kleur.green('POST /auth/register'));
    });
  });

  console.log(kleur.blue('✅ ---- el test ha funcionado muy muy good \n'));
}

module.exports = { runAuthTests };
