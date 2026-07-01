'use strict';
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = 'mongodb+srv://TBM-admin:AScndHnAC2l6nHaL@travel-budget-manager.cocnjiz.mongodb.net/?appName=Travel-budget-manager';

const USERS = [
  { username: 'Wlawrence',  role: 'admin' },
  { username: 'RRanjan',    role: 'user'  },
  { username: 'MLeiker',    role: 'user'  },
  { username: 'Wsanchez',   role: 'admin' },
  { username: 'RPomerleau', role: 'user'  },
];

const TEMP_PASSWORD = 'Travel2026!';

async function createUsers(dbName) {
  const c = new MongoClient(uri);
  await c.connect();
  const db = c.db(dbName);

  // Migrate any existing 'viewer' roles to 'user'
  const migrated = await db.collection('users').updateMany({ role: 'viewer' }, { $set: { role: 'user' } });
  if (migrated.modifiedCount > 0) console.log(`  [${dbName}] Migrated ${migrated.modifiedCount} viewer(s) → user`);

  const last = await db.collection('users').find().sort({ id: -1 }).limit(1).toArray();
  let nextId = last.length ? last[0].id + 1 : 2;

  for (const u of USERS) {
    const existing = await db.collection('users').findOne({ username: u.username });
    if (existing) {
      console.log(`  [${dbName}] SKIP — "${u.username}" already exists`);
      continue;
    }
    await db.collection('users').insertOne({
      id:                 nextId++,
      username:           u.username,
      passwordHash:       bcrypt.hashSync(TEMP_PASSWORD, 10),
      role:               u.role,
      mustChangePassword: true,
      createdAt:          Date.now(),
    });
    console.log(`  [${dbName}] Created ${u.role.padEnd(5)} — ${u.username}`);
  }

  await c.close();
}

(async () => {
  console.log('\nSetting up users in travel_budget_dev...');
  await createUsers('travel_budget_dev');
  console.log('\nSetting up users in travel_budget_prod...');
  await createUsers('travel_budget_prod');
  console.log('\nDone. Temp password for all new users: Travel2026!\n');
})().catch(e => { console.error(e.message); process.exit(1); });
