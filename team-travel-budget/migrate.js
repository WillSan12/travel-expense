'use strict';
const { MongoClient } = require('mongodb');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./data/travel_budget.json', 'utf8'));
const uri = 'mongodb+srv://TBM-admin:AScndHnAC2l6nHaL@travel-budget-manager.cocnjiz.mongodb.net/?appName=Travel-budget-manager';
const c = new MongoClient(uri);

c.connect().then(async () => {
  const db = c.db('travel_budget_prod');
  await db.collection('state').updateOne(
    { _id: 'main' },
    { $set: { updatedAt: Date.now(), updatedBy: 'migration', state: data.state } },
    { upsert: true }
  );
  console.log('Migration complete — all data is now in Atlas.');
  await c.close();
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
