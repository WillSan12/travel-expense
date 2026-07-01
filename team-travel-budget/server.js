'use strict';

const ENV = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: `.env.${ENV}` });

const express        = require('express');
const session        = require('express-session');
const bcrypt         = require('bcryptjs');
const path           = require('path');
const { MongoClient } = require('mongodb');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT           = parseInt(process.env.PORT || '3000', 10);
const SESSION_SECRET = process.env.SESSION_SECRET || 'ttb-dev-secret';
const ADMIN_USER     = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS     = process.env.ADMIN_PASSWORD || 'changeme';
const MONGODB_URI    = process.env.MONGODB_URI;
const MONGODB_DB     = process.env.MONGODB_DB || 'travel_budget_dev';

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set. Check your .env file.');
  process.exit(1);
}

// ── MongoDB connection ────────────────────────────────────────────────────────
const client = new MongoClient(MONGODB_URI);
let db;

async function connectDB() {
  await client.connect();
  db = client.db(MONGODB_DB);
  console.log(`  ✓  MongoDB connected (${MONGODB_DB})`);
}

// Collections:
//   users  — { _id, id, username, passwordHash, role, createdAt }
//   state  — { _id: 'main', updatedAt, updatedBy, state: { ...app db... } }

// ── User helpers ──────────────────────────────────────────────────────────────
async function findUser(username) {
  return db.collection('users').findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
}

async function seedAdmin() {
  const count = await db.collection('users').countDocuments();
  if (count === 0) {
    await db.collection('users').insertOne({
      id:           1,
      username:     ADMIN_USER,
      passwordHash: bcrypt.hashSync(ADMIN_PASS, 10),
      role:         'admin',
      createdAt:    Date.now(),
    });
    console.log(`  ✓  Seeded admin user "${ADMIN_USER}"`);
  }
}

// ── State helpers ─────────────────────────────────────────────────────────────
async function loadState() {
  const doc = await db.collection('state').findOne({ _id: 'main' });
  return doc ? doc.state : null;
}

async function saveState(state, username) {
  await db.collection('state').updateOne(
    { _id: 'main' },
    { $set: { updatedAt: Date.now(), updatedBy: username, state } },
    { upsert: true }
  );
}

// ── Express setup ─────────────────────────────────────────────────────────────
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret:            SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge:   8 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.role === 'admin') return next();
  res.status(403).json({ error: 'Forbidden — admin only' });
}

// ── Static files ──────────────────────────────────────────────────────────────
const PUBLIC = path.join(__dirname, 'public');

app.get('/login', (_req, res) => res.sendFile(path.join(PUBLIC, 'login.html')));
app.use('/app', requireAuth, express.static(PUBLIC));
app.get('/', (req, res) => {
  res.redirect(req.session && req.session.userId ? '/app/' : '/login');
});

// ── Auth routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required' });

    const user = await findUser(username);
    if (!user || !bcrypt.compareSync(password, user.passwordHash))
      return res.status(401).json({ error: 'Invalid username or password' });

    req.session.userId   = user.id;
    req.session.username = user.username;
    req.session.role     = user.role;
    res.json({ ok: true, username: user.username, role: user.role, mustChangePassword: !!user.mustChangePassword });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/auth/me', async (req, res) => {
  if (!req.session || !req.session.userId)
    return res.status(401).json({ error: 'Not authenticated' });
  try {
    const user = await db.collection('users').findOne({ id: req.session.userId });
    res.json({ username: req.session.username, role: req.session.role, mustChangePassword: !!(user && user.mustChangePassword), env: ENV });
  } catch {
    res.json({ username: req.session.username, role: req.session.role, mustChangePassword: false });
  }
});

// ── App state routes ──────────────────────────────────────────────────────────
app.get('/api/state', requireAuth, async (req, res) => {
  try {
    const state = await loadState();
    res.json(state);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/state', requireAuth, async (req, res) => {
  try {
    const state = req.body;
    if (!state || typeof state !== 'object')
      return res.status(400).json({ error: 'Body must be a JSON object' });
    await saveState(state, req.session.username);
    res.json({ ok: true, savedAt: Date.now() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── User management routes (admin only) ──────────────────────────────────────
app.get('/api/users', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const users = await db.collection('users')
      .find({}, { projection: { passwordHash: 0, _id: 0 } })
      .toArray();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, role = 'user' } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'username and password required' });
    if (!['admin', 'user'].includes(role))
      return res.status(400).json({ error: 'role must be admin or user' });

    const existing = await db.collection('users').findOne({ username });
    if (existing) return res.status(409).json({ error: 'Username already taken' });

    const last = await db.collection('users').find().sort({ id: -1 }).limit(1).toArray();
    const newId = last.length ? last[0].id + 1 : 1;

    const newUser = {
      id:                 newId,
      username,
      passwordHash:       bcrypt.hashSync(password, 10),
      role,
      mustChangePassword: true,
      createdAt:          Date.now(),
    };
    await db.collection('users').insertOne(newUser);
    res.status(201).json({ id: newId, username, role });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { password, role } = req.body;
    const update = {};
    if (password) { update.passwordHash = bcrypt.hashSync(password, 10); update.mustChangePassword = true; }
    if (role && ['admin', 'user'].includes(role)) update.role = role;
    await db.collection('users').updateOne({ id }, { $set: update });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Change own password ───────────────────────────────────────────────────────
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Both current and new password are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const user = await db.collection('users').findOne({ id: req.session.userId });
    if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash))
      return res.status(401).json({ error: 'Current password is incorrect' });

    await db.collection('users').updateOne(
      { id: req.session.userId },
      { $set: { passwordHash: bcrypt.hashSync(newPassword, 10), mustChangePassword: false } }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.session.userId)
      return res.status(400).json({ error: 'Cannot delete your own account' });
    await db.collection('users').deleteOne({ id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    const doc = await db.collection('state').findOne({ _id: 'main' });
    res.json({
      status:  'ok',
      env:     ENV,
      db:      MONGODB_DB,
      ts:      Date.now(),
      hasData: !!doc,
      stateAge: doc ? Date.now() - doc.updatedAt : null,
    });
  } catch (e) {
    res.status(500).json({ status: 'error', error: e.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
connectDB()
  .then(() => seedAdmin())
  .then(() => {
    app.listen(PORT, () => {
      console.log('');
      console.log('  ✈  Team Travel Budget');
      console.log(`  →  ENV:  ${ENV}`);
      console.log(`  →  DB:   ${MONGODB_DB}`);
      console.log(`  →  http://localhost:${PORT}`);
      console.log(`  →  Login: ${ADMIN_USER} / ${ADMIN_PASS}`);
      console.log('');
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
