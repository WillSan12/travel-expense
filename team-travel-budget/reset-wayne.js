'use strict';
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const uri = 'mongodb+srv://TBM-admin:AScndHnAC2l6nHaL@travel-budget-manager.cocnjiz.mongodb.net/?appName=Travel-budget-manager';

async function reset(dbName) {
  const c = new MongoClient(uri);
  await c.connect();
  const db = c.db(dbName);
  const hash = bcrypt.hashSync('Travel2026!', 10);
  const r = await db.collection('users').updateOne(
    { username: { $regex: /^wlawrence$/i } },
    { $set: { passwordHash: hash, mustChangePassword: true } }
  );
  console.log(`[${dbName}] matched: ${r.matchedCount} updated: ${r.modifiedCount}`);
  const user = await db.collection('users').findOne({ username: { $regex: /^wlawrence$/i } });
  console.log(`  found as: "${user ? user.username : 'NOT FOUND'}"`);
  await c.close();
}

(async () => {
  await reset('travel_budget_dev');
  await reset('travel_budget_prod');
  console.log('\nDone. Password reset to Travel2026!');
})().catch(e => { console.error(e.message); process.exit(1); });
