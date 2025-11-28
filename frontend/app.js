const express = require('express');
const session = require('express-session');
// `node-fetch` v3 is ESM-only; using dynamic import wrapper works in CommonJS
// Also works if the runtime already provides a global `fetch` (Node 18+).
let fetch = global.fetch;
if (!fetch) {
  fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
}
const path = require('path');

const app = express();
const API_DEFAULT = "http://127.0.0.1:5000/api";  // tu backend Flask
const API_BASE = process.env.API_BASE || API_DEFAULT;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 }
}));

// Development: set a permissive Content-Security-Policy so browser doesn't block inline/data images
app.use((req, res, next) => {
  // Allow self, inline styles/scripts and data URIs during local development
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' data:; img-src 'self' data:; connect-src 'self' http://localhost:5000 ws:;");
  next();
});

// Serve static files from public (frontend/public)
app.use(express.static(path.join(__dirname, 'public')));

// redirect root to login page
app.get('/', (req, res) => res.redirect('/login.html'));

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ ok: false, error: 'Not authenticated' });
}

// Helper: build API URL and retry once if fetch indicates we hit MySQL or connection refused
async function fetchWithRetry(path, options = {}, triedDefault = false) {
  const url = API_BASE.replace(/\/+$/,'') + (path.startsWith('/') ? path : '/' + path);
  try {
    const r = await fetch(url, options);
    return r;
  } catch (err) {
    const cause = err && err.cause;
    const isMySQL = cause && (cause.code === 'HPE_INVALID_CONSTANT' || (cause.data && cause.data.toString && cause.data.toString().includes('MySQL')));
    const isConnRefused = cause && cause.code === 'ECONNREFUSED';
    if (!triedDefault && (isMySQL || isConnRefused)) {
      console.warn('API base appears incorrect or backend unreachable (detected MySQL/ECONNREFUSED). Switching API_BASE to default', API_DEFAULT);
      API_BASE = API_DEFAULT;
      const retryUrl = API_BASE.replace(/\/+$/,'') + (path.startsWith('/') ? path : '/' + path);
      return fetchWithRetry(path, options, true);
    }
    throw err;
  }
}

// Login: proxy to API and set session
app.post('/login', async (req, res) => {
  const usuario = req.body.usuario;
  const password = req.body.password;
  try {
    const r = await fetchWithRetry('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario, password }) });
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error('Backend returned non-JSON response:', text.substring(0, 200));
      return res.status(502).json({ ok: false, error: 'Backend returned invalid response. Check backend server.' });
    }
    if (!data.ok) return res.status(401).json(data);
    // store session and redirect for browser form
    req.session.user = data.user;
    // If request is fetch (AJAX), return JSON; if form submission, redirect
    if (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
      return res.json({ ok: true });
    }
    return res.redirect('/clientes.html');
  } catch (err) {
    console.error('Login proxy error:', err);
    return res.status(502).json({ ok: false, error: 'Backend unavailable or misconfigured API_BASE' });
  }
});

// Logout (destroy session) and redirect to login page
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login.html'));
});

// Session info for client-side JS
app.get('/api/session', (req, res) => {
  if (req.session && req.session.user) return res.json({ ok: true, user: req.session.user });
  return res.status(401).json({ ok: false, error: 'Not authenticated' });
});

// Proxy API routes (require auth)
app.get('/api/clientes', requireAuth, async (req, res) => {
  try {
    const r = await fetchWithRetry('/clientes');
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error('Backend returned non-JSON response:', text.substring(0, 200));
      return res.status(502).json({ ok: false, error: 'Backend unavailable or misconfigured API_BASE' });
    }
    return res.status(r.status).json(data);
  } catch (err) {
    console.error('GET /api/clientes proxy error:', err);
    return res.status(502).json({ ok: false, error: 'Backend unavailable' });
  }
});

app.post('/api/clientes', requireAuth, async (req, res) => {
  try {
    const r = await fetchWithRetry('/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body) });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    console.error('POST /api/clientes proxy error:', err);
    return res.status(502).json({ ok: false, error: 'Backend unavailable' });
  }
});

app.put('/api/clientes/:id', requireAuth, async (req, res) => {
  try {
    const r = await fetchWithRetry(`/clientes/${req.params.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body) });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    console.error('PUT /api/clientes/:id proxy error:', err);
    return res.status(502).json({ ok: false, error: 'Backend unavailable' });
  }
});

app.delete('/api/clientes/:id', requireAuth, async (req, res) => {
  try {
    const r = await fetchWithRetry(`/clientes/${req.params.id}`, { method: 'DELETE' });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    console.error('DELETE /api/clientes/:id proxy error:', err);
    return res.status(502).json({ ok: false, error: 'Backend unavailable' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Frontend server running http://localhost:${PORT}`));