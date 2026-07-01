'use strict';
const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://TBM-admin:AScndHnAC2l6nHaL@travel-budget-manager.cocnjiz.mongodb.net/?appName=Travel-budget-manager';

async function fix(dbName) {
  const c = new MongoClient(uri);
  await c.connect();
  const db = c.db(dbName);
  const r = await db.collection('users').updateMany({ role: 'viewer' }, { $set: { role: 'user' } });
  console.log(`  [${dbName}] Updated ${r.modifiedCount} viewer(s) → user`);
  await c.close();
}

(async () => {
  await fix('travel_budget_dev');
  await fix('travel_budget_prod');
  console.log('Done.');
})().catch(e => { console.error(e.message); process.exit(1); });
