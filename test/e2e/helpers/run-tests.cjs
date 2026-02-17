require('dotenv/config');

const { runAuthTests } = require('../auth.e2e.cjs');
const { runCharactersTests } = require('../characters.e2e.cjs');
const { runBattlesTests } = require('../battles.e2e.cjs');



(async () => {
  try {
    const BASE_URL = process.env.API_URL || 'http://localhost:3000';

    await runAuthTests(BASE_URL);
    await runCharactersTests(BASE_URL);
    await runBattlesTests(BASE_URL);

    console.log('\n🎉 ALL E2E TESTS PASSED');
    process.exit(0);
  } catch (err) {
    console.error('❌ E2E TEST FAILED\n', err);
    process.exit(1);
  }
})();
