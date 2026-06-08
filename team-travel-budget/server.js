'use strict';

require('dotenv').config();

const express        = require('express');
const session        = require('express-session');
const bcrypt         = require('bcryptjs');
const path           = require('path');
const fs             = require('fs');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT           = parseInt(process.env.PORT || '3000', 10);
const SESSION_SECRET = process.env.SESSION_SECRET || 'ttb-dev-secret';
const DATA_DIR       = path.resolve(process.env.DATA_DIR || './data');
const USERS_FILE     = path.join(DATA_DIR, 'users.json');
const STATE_FILE     = path.join(DATA_DIR, 'travel_budget.json');
const ADMIN_USER     = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS     = process.env.ADMIN_PASSWORD || 'changeme';

fs.mkdirSync(DATA_DIR, { recursive: true });

// ── JSON file helpers ─────────────────────────────────────────────────────────
function readJSON(file, fallback) {
  try   { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ── User store ────────────────────────────────────────────────────────────────
// Schema: { users: [{ id, username, passwordHash, role, createdAt }] }
function loadUsers()       { return readJSON(USERS_FILE, { users: [] }); }
function saveUsers(store)  { writeJSON(USERS_FILE, store); }

function findUser(username) {
  return loadUsers().users.find(u => u.username === username) || null;
}

// Seed admin user on first run
(function seedAdmin() {
  const store = loadUsers();
  if (store.users.length === 0) {
    store.users.push({
      id:           1,
      username:     ADMIN_USER,
      passwordHash: bcrypt.hashSync(ADMIN_PASS, 10),
      role:         'admin',
      createdAt:    Date.now(),
    });
    saveUsers(store);
    console.log(`[seed] Created admin user "${ADMIN_USER}"`);
  }
})();

// ── App state store ───────────────────────────────────────────────────────────
// A single JSON blob representing the entire travel-budget DB (same shape as
// the old localStorage payload).  Wrapped in metadata for audit.
// Schema: { updatedAt, updatedBy, state: { ...app db... } }

function loadState()               { return readJSON(STATE_FILE, null); }
function saveState(state, username) {
  writeJSON(STATE_FILE, { updatedAt: Date.now(), updatedBy: username, state });
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
    maxAge:     8 * 60 * 60 * 1000,  // 8 hours
    httpOnly:   true,
    sameSite:  'lax',
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

// /login  — no auth
app.get('/login', (_req, res) => res.sendFile(path.join(PUBLIC, 'login.html')));

// /app/*  — auth-gated
app.use('/app', requireAuth, express.static(PUBLIC));

// Root redirect
app.get('/', (req, res) => {
  res.redirect(req.session && req.session.userId ? '/app/' : '/login');
});

// ── Auth routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required' });

  const user = findUser(username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash))
    return res.status(401).json({ error: 'Invalid username or password' });

  req.session.userId   = user.id;
  req.session.username = user.username;
  req.session.role     = user.role;
  res.json({ ok: true, username: user.username, role: user.role });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session || !req.session.userId)
    return res.status(401).json({ error: 'Not authenticated' });
  res.json({ username: req.session.username, role: req.session.role });
});

// ── App state routes ──────────────────────────────────────────────────────────
// GET  /api/state  — load the app's full database (authenticated)
app.get('/api/state', requireAuth, (req, res) => {
  const record = loadState();
  res.json(record ? record.state : null);
});

// PUT  /api/state  — save the full database (admin only)
app.put('/api/state', requireAuth, requireAdmin, (req, res) => {
  const state = req.body;
  if (!state || typeof state !== 'object')
    return res.status(400).json({ error: 'Body must be a JSON object' });

  saveState(state, req.session.username);
  res.json({ ok: true, savedAt: Date.now() });
});

// ── User management routes (admin only) ──────────────────────────────────────
app.get('/api/users', requireAuth, requireAdmin, (_req, res) => {
  const users = loadUsers().users.map(({ id, username, role, createdAt }) =>
    ({ id, username, role, createdAt })
  );
  res.json(users);
});

app.post('/api/users', requireAuth, requireAdmin, (req, res) => {
  const { username, password, role = 'viewer' } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });
  if (!['admin', 'viewer'].includes(role))
    return res.status(400).json({ error: 'role must be admin or viewer' });

  const store = loadUsers();
  if (store.users.find(u => u.username === username))
    return res.status(409).json({ error: 'Username already taken' });

  const newUser = {
    id:           (store.users.reduce((m, u) => Math.max(m, u.id), 0)) + 1,
    username,
    passwordHash: bcrypt.hashSync(password, 10),
    role,
    createdAt:    Date.now(),
  };
  store.users.push(newUser);
  saveUsers(store);
  res.status(201).json({ id: newUser.id, username, role });
});

app.put('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  const id    = parseInt(req.params.id, 10);
  const store = loadUsers();
  const user  = store.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { password, role } = req.body;
  if (password) user.passwordHash = bcrypt.hashSync(password, 10);
  if (role && ['admin', 'viewer'].includes(role)) user.role = role;
  saveUsers(store);
  res.json({ ok: true });
});

app.delete('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  const id    = parseInt(req.params.id, 10);
  // Prevent deleting your own account
  if (id === req.session.userId)
    return res.status(400).json({ error: 'Cannot delete your own account' });
  const store = loadUsers();
  store.users = store.users.filter(u => u.id !== id);
  saveUsers(store);
  res.json({ ok: true });
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const record = loadState();
  res.json({
    status:    'ok',
    ts:        Date.now(),
    stateFile: fs.existsSync(STATE_FILE),
    stateAge:  record ? Date.now() - record.updatedAt : null,
    users:     loadUsers().users.length,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ✈  Team Travel Budget');
  console.log(`  →  http://localhost:${PORT}`);
  console.log(`  →  Login: ${ADMIN_USER} / ${ADMIN_PASS}`);
  console.log('');
});
