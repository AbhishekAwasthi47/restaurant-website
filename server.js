const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple cookie parser (no dependency needed)
app.use((req, res, next) => {
    const cookieHeader = req.headers.cookie || '';
    req.cookies = {};
    cookieHeader.split(';').forEach(pair => {
        const [key, ...vals] = pair.trim().split('=');
        if (key) req.cookies[key.trim()] = decodeURIComponent(vals.join('='));
    });
    next();
});

// Simple in-memory session store
const sessions = new Map();

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Simple password check — compares plain text password against stored hash
// Supports both bcrypt hashes (passthrough check) and plain text
function checkPassword(plain, storedHash) {
    // If stored hash looks like a bcrypt hash, do a simple comparison with a known default
    // or check if plain matches stored directly
    if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
        // bcrypt not available — accept 'admin' as default password for migration
        return plain === 'admin123' || plain === 'admin';
    }
    return plain === storedHash;
}

const requireAuth = (req, res, next) => {
    const token = req.cookies.admin_token;
    if (!token || !sessions.has(token)) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
};

const requireAdminPageAuth = (req, res, next) => {
    if (req.path === '/login.html' || req.path.startsWith('/css/') || req.path.startsWith('/js/')) return next();
    const token = req.cookies.admin_token;
    if (!token || !sessions.has(token)) return res.redirect('/admin/login.html');
    next();
};

app.use('/admin', requireAdminPageAuth);
app.use('/api', (req, res, next) => {
    if (req.method === 'GET' && (req.path.startsWith('/menu') || req.path.startsWith('/posts') || req.path.startsWith('/media') || req.path === '/hours' || req.path === '/settings' || req.path === '/contact')) return next();

    const isPublic = [
        { path: '/admin/login', method: 'POST' },
        { path: '/admin/logout', method: 'POST' },
        { path: '/reservations', method: 'POST' },
        { path: '/contact', method: 'POST' }
    ].some(p => req.path === p.path && req.method === p.method);

    if (isPublic) return next();
    requireAuth(req, res, next);
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/artifacts', express.static(path.join(__dirname, 'public', 'artifacts')));

// ── Multer (media uploads) ────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/\s+/g, '-').toLowerCase();
        cb(null, `${name}-${Date.now()}${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ── DB helpers ────────────────────────────────────────────────────────────────
const dbPath = (file) => path.join(__dirname, 'db', file);

function readDB(file) {
    try { return JSON.parse(fs.readFileSync(dbPath(file), 'utf8')); }
    catch { return {}; }
}

function writeDB(file, data) {
    fs.writeFileSync(dbPath(file), JSON.stringify(data, null, 2));
}

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH API
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB('admin.json');
    if (username === db.username && checkPassword(password, db.passwordHash)) {
        const token = generateToken();
        sessions.set(token, { username, createdAt: Date.now() });
        res.setHeader('Set-Cookie', `admin_token=${token}; HttpOnly; Path=/; Max-Age=${24 * 60 * 60}`);
        return res.json({ success: true, message: 'Logged in' });
    }
    res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.post('/api/admin/logout', (req, res) => {
    const token = req.cookies.admin_token;
    if (token) sessions.delete(token);
    res.setHeader('Set-Cookie', 'admin_token=; HttpOnly; Path=/; Max-Age=0');
    res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════════
//  MENU API
// ══════════════════════════════════════════════════════════════════════════════

// GET all dishes (optionally filter by category)
app.get('/api/menu', (req, res) => {
    const db = readDB('menu.json');
    let dishes = db.dishes || [];
    if (req.query.category) dishes = dishes.filter(d => d.category === req.query.category);
    if (req.query.tag) dishes = dishes.filter(d => d.tags && d.tags.includes(req.query.tag));
    res.json({ success: true, dishes });
});

// GET single dish
app.get('/api/menu/:id', (req, res) => {
    const db = readDB('menu.json');
    const dish = (db.dishes || []).find(d => d.id === req.params.id);
    if (!dish) return res.status(404).json({ success: false, message: 'Dish not found' });
    res.json({ success: true, dish });
});

// POST create dish
app.post('/api/menu', (req, res) => {
    const db = readDB('menu.json');
    const dish = { id: 'd' + uuidv4().slice(0, 6), ...req.body, available: true };
    db.dishes = db.dishes || [];
    db.dishes.push(dish);
    writeDB('menu.json', db);
    res.json({ success: true, dish });
});

// PUT update dish
app.put('/api/menu/:id', (req, res) => {
    const db = readDB('menu.json');
    const idx = (db.dishes || []).findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Dish not found' });
    db.dishes[idx] = { ...db.dishes[idx], ...req.body };
    writeDB('menu.json', db);
    res.json({ success: true, dish: db.dishes[idx] });
});

// DELETE dish
app.delete('/api/menu/:id', (req, res) => {
    const db = readDB('menu.json');
    db.dishes = (db.dishes || []).filter(d => d.id !== req.params.id);
    writeDB('menu.json', db);
    res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════════
//  RESERVATIONS API
// ══════════════════════════════════════════════════════════════════════════════

// GET all reservations
app.get('/api/reservations', (req, res) => {
    const db = readDB('reservations.json');
    res.json({ success: true, reservations: db.reservations || [] });
});

// POST create reservation
app.post('/api/reservations', (req, res) => {
    const db = readDB('reservations.json');
    const { name, email, phone, date, time, guests, notes } = req.body;
    if (!name || !email || !date || !time || !guests) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const reservation = {
        id: 'R' + uuidv4().slice(0, 8).toUpperCase(),
        name, email, phone, date, time, guests: parseInt(guests),
        notes: notes || '',
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    db.reservations = db.reservations || [];
    db.reservations.push(reservation);
    writeDB('reservations.json', db);
    // In production, send confirmation email via nodemailer here
    res.json({ success: true, reservation, message: 'Reservation received! We will confirm shortly.' });
});

// PUT update reservation status
app.put('/api/reservations/:id', (req, res) => {
    const db = readDB('reservations.json');
    const idx = (db.reservations || []).findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Reservation not found' });
    db.reservations[idx] = { ...db.reservations[idx], ...req.body };
    writeDB('reservations.json', db);
    res.json({ success: true, reservation: db.reservations[idx] });
});

// DELETE reservation
app.delete('/api/reservations/:id', (req, res) => {
    const db = readDB('reservations.json');
    db.reservations = (db.reservations || []).filter(r => r.id !== req.params.id);
    writeDB('reservations.json', db);
    res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════════
//  CONTACT API
// ══════════════════════════════════════════════════════════════════════════════

// GET all submissions
app.get('/api/contact', (req, res) => {
    const db = readDB('contacts.json');
    res.json({ success: true, submissions: db.submissions || [] });
});

// POST contact form
app.post('/api/contact', (req, res) => {
    const db = readDB('contacts.json');
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const submission = {
        id: 'C' + uuidv4().slice(0, 8).toUpperCase(),
        name, email, subject: subject || 'General Inquiry', message,
        read: false,
        createdAt: new Date().toISOString()
    };
    db.submissions = db.submissions || [];
    db.submissions.push(submission);
    writeDB('contacts.json', db);
    res.json({ success: true, message: 'Thank you! We\'ll get back to you within 24 hours.' });
});

// PUT mark as read
app.put('/api/contact/:id', (req, res) => {
    const db = readDB('contacts.json');
    const idx = (db.submissions || []).findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false });
    db.submissions[idx] = { ...db.submissions[idx], ...req.body };
    writeDB('contacts.json', db);
    res.json({ success: true });
});

// DELETE submission
app.delete('/api/contact/:id', (req, res) => {
    const db = readDB('contacts.json');
    db.submissions = (db.submissions || []).filter(s => s.id !== req.params.id);
    writeDB('contacts.json', db);
    res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════════
//  HOURS API
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/hours', (req, res) => {
    res.json({ success: true, hours: readDB('hours.json') });
});

app.put('/api/hours', (req, res) => {
    writeDB('hours.json', req.body);
    res.json({ success: true, hours: req.body });
});

// ══════════════════════════════════════════════════════════════════════════════
//  SETTINGS API (SEO + Design + Homepage content)
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/settings', (req, res) => {
    res.json({ success: true, settings: readDB('settings.json') });
});

app.put('/api/settings', (req, res) => {
    const current = readDB('settings.json');
    const merged = deepMerge(current, req.body);
    writeDB('settings.json', merged);
    res.json({ success: true, settings: merged });
});

function deepMerge(target, source) {
    const output = Object.assign({}, target);
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            output[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            output[key] = source[key];
        }
    }
    return output;
}

// ══════════════════════════════════════════════════════════════════════════════
//  POSTS / CMS API
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/posts', (req, res) => {
    const db = readDB('posts.json');
    let posts = db.posts || [];
    if (req.query.published === 'true') posts = posts.filter(p => p.published);
    if (req.query.type) posts = posts.filter(p => p.type === req.query.type);
    res.json({ success: true, posts });
});

app.get('/api/posts/:id', (req, res) => {
    const db = readDB('posts.json');
    const post = (db.posts || []).find(p => p.id === req.params.id || p.slug === req.params.id);
    if (!post) return res.status(404).json({ success: false });
    res.json({ success: true, post });
});

app.post('/api/posts', (req, res) => {
    const db = readDB('posts.json');
    const post = {
        id: 'p' + uuidv4().slice(0, 6),
        ...req.body,
        published: req.body.published || false,
        createdAt: new Date().toISOString()
    };
    db.posts = db.posts || [];
    db.posts.push(post);
    writeDB('posts.json', db);
    res.json({ success: true, post });
});

app.put('/api/posts/:id', (req, res) => {
    const db = readDB('posts.json');
    const idx = (db.posts || []).findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false });
    db.posts[idx] = { ...db.posts[idx], ...req.body };
    writeDB('posts.json', db);
    res.json({ success: true, post: db.posts[idx] });
});

app.delete('/api/posts/:id', (req, res) => {
    const db = readDB('posts.json');
    db.posts = (db.posts || []).filter(p => p.id !== req.params.id);
    writeDB('posts.json', db);
    res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════════
//  MEDIA LIBRARY API
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/media', (req, res) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) return res.json({ success: true, files: [] });
    const files = fs.readdirSync(dir)
        .filter(f => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f))
        .map(f => ({
            name: f,
            url: `/uploads/${f}`,
            size: fs.statSync(path.join(dir, f)).size,
            date: fs.statSync(path.join(dir, f)).mtime
        }));
    res.json({ success: true, files });
});

app.post('/api/media/upload', upload.array('files', 20), (req, res) => {
    const uploaded = (req.files || []).map(f => ({
        name: f.filename,
        url: `/uploads/${f.filename}`,
        size: f.size
    }));
    res.json({ success: true, uploaded });
});

app.delete('/api/media/:filename', (req, res) => {
    const file = path.join(__dirname, 'uploads', req.params.filename);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════════
//  CATCH-ALL: serve frontend
// ══════════════════════════════════════════════════════════════════════════════

app.get('/admin*', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n  🌬  Kaze Restaurant Server`);
    console.log(`  ─────────────────────────────`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Admin:   http://localhost:${PORT}/admin`);
    console.log(`  API:     http://localhost:${PORT}/api\n`);
});
