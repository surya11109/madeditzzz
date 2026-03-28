/**
 * MAD EDITZZZ - Server
 * Main Express server with all routes and middleware
 */

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── ADMIN PASSWORD (change this!) ────────────────────────────────────────────
const ADMIN_PASSWORD = 'mad@123';

// ─── DATA FILE PATH ───────────────────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, 'data', 'presets.json');

// ─── MULTER STORAGE (for uploaded images) ─────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `preset-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'mad-editzzz-super-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// ─── HELPER: Read/Write JSON data ─────────────────────────────────────────────
function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { presets: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: 'Unauthorized. Please login.' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// GET all presets (for homepage)
app.get('/api/presets', (req, res) => {
  const data = readData();
  // Sort by newest first
  const sorted = [...data.presets].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json({ success: true, presets: sorted });
});

// GET single preset (for download link)
app.get('/api/presets/:id', (req, res) => {
  const data = readData();
  const preset = data.presets.find(p => p.id === req.params.id);
  if (!preset) return res.status(404).json({ error: 'Preset not found' });
  res.json({ success: true, preset });
});

// POST increment download count + return drive link
app.post('/api/presets/:id/download', (req, res) => {
  const data = readData();
  const idx = data.presets.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Preset not found' });

  data.presets[idx].downloads = (data.presets[idx].downloads || 0) + 1;
  writeData(data);

  res.json({
    success: true,
    driveLink: data.presets[idx].driveLink,
    downloads: data.presets[idx].downloads
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// POST admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

// POST admin logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET check auth status
app.get('/api/admin/check', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN CRUD ROUTES (protected)
// ═══════════════════════════════════════════════════════════════════════════════

// POST add new preset
app.post('/api/admin/presets', requireAdmin, upload.single('image'), (req, res) => {
  const { title, driveLink, category, imageUrl } = req.body;

  if (!title || !driveLink) {
    return res.status(400).json({ error: 'Title and Drive link are required' });
  }

  // Use uploaded file or provided URL
  let finalImageUrl = imageUrl || '';
  if (req.file) {
    finalImageUrl = `/uploads/${req.file.filename}`;
  }

  if (!finalImageUrl) {
    return res.status(400).json({ error: 'Image file or URL is required' });
  }

  const data = readData();
  const newPreset = {
    id: `preset-${uuidv4().slice(0, 8)}`,
    title: title.trim(),
    imageUrl: finalImageUrl,
    driveLink: driveLink.trim(),
    category: category || 'General',
    downloads: 0,
    createdAt: new Date().toISOString()
  };

  data.presets.unshift(newPreset); // Add to front
  writeData(data);

  res.json({ success: true, preset: newPreset });
});

// PUT edit existing preset
app.put('/api/admin/presets/:id', requireAdmin, upload.single('image'), (req, res) => {
  const data = readData();
  const idx = data.presets.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Preset not found' });

  const { title, driveLink, category, imageUrl } = req.body;

  if (title) data.presets[idx].title = title.trim();
  if (driveLink) data.presets[idx].driveLink = driveLink.trim();
  if (category) data.presets[idx].category = category;
  if (req.file) {
    data.presets[idx].imageUrl = `/uploads/${req.file.filename}`;
  } else if (imageUrl) {
    data.presets[idx].imageUrl = imageUrl;
  }

  writeData(data);
  res.json({ success: true, preset: data.presets[idx] });
});

// DELETE preset
app.delete('/api/admin/presets/:id', requireAdmin, (req, res) => {
  const data = readData();
  const idx = data.presets.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Preset not found' });

  // Delete uploaded file if it exists locally
  const preset = data.presets[idx];
  if (preset.imageUrl.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, 'public', preset.imageUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  data.presets.splice(idx, 1);
  writeData(data);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Admin panel page (protected at HTML level — real protection via API)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// All other routes → index.html (SPA style)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START SERVER ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎨 Mad Editzzz is running!`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
  console.log(`🔐 Admin: http://localhost:${PORT}/admin`);
  console.log(`🔑 Password: ${ADMIN_PASSWORD}\n`);
});
