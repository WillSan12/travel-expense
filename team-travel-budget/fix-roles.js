'use strict';
const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://TBM-admin:AScndHnAC2l6nHaL@travel-budget-manager.cocnjiz.mongodb.net/?appName=Travel-budget-manager';

async function fix(dbName) {
  const c = new MongoClient(uri);
  await c.connect();
  const db = c.db(dbName);

  // Set mustChangePassword on all users who don't have it set to false yet
  const r = await db.collection('users').updateMany(
    { mustChangePassword: { $ne: false } },
    { $set: { mustChangePassword: true } }
  );
  console.log(`  [${dbName}] Flagged ${r.modifiedCount} user(s) for password change on next login`);

  const users = await db.collection('users').find({}, { projection: { username: 1, role: 1, mustChangePassword: 1 } }).toArray();
  users.forEach(u => console.log(`    ${u.username.padEnd(15)} role:${u.role.padEnd(6)} mustChange:${u.mustChangePassword}`));
  await c.close();
}

(async () => {
  await fix('travel_budget_dev');
  await fix('travel_budget_prod');
  console.log('\nDone.');
})().catch(e => { console.error(e.message); process.exit(1); });
