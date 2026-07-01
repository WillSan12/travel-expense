'use strict';
const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://TBM-admin:AScndHnAC2l6nHaL@travel-budget-manager.cocnjiz.mongodb.net/?appName=Travel-budget-manager';

async function check(dbName) {
  const c = new MongoClient(uri);
  await c.connect();
  const db = c.db(dbName);
  const users = await db.collection('users').find({}).toArray();
  console.log(`\n[${dbName}]`);
  users.forEach(u => console.log(`  ${u.username.padEnd(15)} role:${(u.role||'').padEnd(6)} mustChangePassword:${u.mustChangePassword}`));
  await c.close();
}

(async () => {
  await check('travel_budget_dev');
  await check('travel_budget_prod');
})().catch(e => { console.error(e.message); process.exit(1); });
