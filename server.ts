import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Behind a hosting proxy (Render, Railway, etc.) so rate limiting sees the real client IP.
// If your host has more than one proxy layer, change 1 to the right number.
if (isProduction) app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// Required configuration
// ---------------------------------------------------------------------------
const rawConnectionString = process.env.DATABASE_URL;
if (!rawConnectionString) {
  throw new Error(
    'DATABASE_URL is not set. Add it to your .env file locally, or to your hosting dashboard.'
  );
}

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
if (!ADMIN_TOKEN || ADMIN_TOKEN.length < 16) {
  throw new Error(
    'ADMIN_TOKEN is not set or too short (min 16 chars). Generate one with: openssl rand -hex 32'
  );
}
const adminTokenHash = crypto.createHash('sha256').update(ADMIN_TOKEN).digest();

// ---------------------------------------------------------------------------
// Security headers (CSP is off so Vite dev and base64 images keep working)
// ---------------------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// ---------------------------------------------------------------------------
// Body parsers: small by default; large only on routes that already passed auth
// ---------------------------------------------------------------------------
const smallJson = express.json({ limit: '20kb' });
const uploadJson = express.json({ limit: '25mb' });
const MAX_IMAGE_CHARS = 25 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many messages. Please try again later.' }
});

// Only failed attempts count, so brute-forcing the admin token gets blocked.
const adminFailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many failed attempts. Please try again later.' }
});

app.use('/api', apiLimiter);

// ---------------------------------------------------------------------------
// Admin authentication (Authorization: Bearer <ADMIN_TOKEN>)
// ---------------------------------------------------------------------------
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.get('authorization') || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  const suppliedHash = crypto.createHash('sha256').update(supplied).digest();
  if (!crypto.timingSafeEqual(suppliedHash, adminTokenHash)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Lets the frontend check a token before showing admin controls.
app.get('/api/admin/check', adminFailLimiter, requireAdmin, (_req, res) => {
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
const ID_RE = /^[A-Za-z0-9_-]{1,50}$/;
const IMAGE_PREFIX_RE = /^data:image\/(png|jpe?g|webp|gif|avif);base64,/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns trimmed string ('' if empty/missing), or null if invalid. */
function text(v: unknown, max: number): string | null {
  if (v === undefined || v === null || v === '') return '';
  if (typeof v !== 'string' || v.length > max) return null;
  return v.trim();
}

function isImageData(v: unknown): v is string {
  return typeof v === 'string' && v.length <= MAX_IMAGE_CHARS && IMAGE_PREFIX_RE.test(v);
}

function isHttpUrl(v: unknown, max = 2000): v is string {
  if (typeof v !== 'string' || v.length > max) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function pickId(v: unknown, prefix: string): string {
  return typeof v === 'string' && ID_RE.test(v) ? v : `${prefix}-${crypto.randomUUID()}`;
}

function oneLine(s: string): string {
  return s.replace(/[\r\n\t]+/g, ' ').trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function serverError(res: Response, err: unknown) {
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

// ---------------------------------------------------------------------------
// Neon PostgreSQL connection
// ---------------------------------------------------------------------------
// Strip channel_binding if present for maximum Node.js pg SCRAM compatibility
const neonConnectionString = rawConnectionString
  .replace(/[?&]channel_binding=[^&]+/, (match) => (match.startsWith('?') ? '?' : ''))
  .replace(/\?$/, '');

const pool = new Pool({
  connectionString: neonConnectionString,
  // Verify the server certificate. Neon uses publicly trusted certificates.
  ssl: { rejectUnauthorized: true },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

async function initDb() {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS portfolio_profile (
          id VARCHAR(50) PRIMARY KEY,
          avatar_url TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS portfolio_graphics (
          id VARCHAR(50) PRIMARY KEY,
          title TEXT NOT NULL,
          client TEXT,
          description TEXT,
          image_data TEXT NOT NULL,
          file_type VARCHAR(20),
          file_size VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS portfolio_photos (
          id VARCHAR(50) PRIMARY KEY,
          title TEXT NOT NULL,
          location TEXT,
          camera_info TEXT,
          description TEXT,
          image_data TEXT NOT NULL,
          file_type VARCHAR(20),
          file_size VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS portfolio_websites (
          id VARCHAR(50) PRIMARY KEY,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          description TEXT,
          technologies TEXT[],
          image_url TEXT,
          role TEXT,
          year TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✓ Neon PostgreSQL tables initialized successfully');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Neon PostgreSQL connection warning:', err);
  }
}

initDb();

// ---------------------------------------------------------------------------
// API ROUTES
// Public: GET routes and POST /api/contact.  Admin only: all other writes.
// ---------------------------------------------------------------------------

// 1. Profile avatar
app.get('/api/profile', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT avatar_url FROM portfolio_profile WHERE id = $1',
      ['kelvin_avatar']
    );
    return res.json({ avatarUrl: rows.length > 0 ? rows[0].avatar_url : null });
  } catch (err) {
    return serverError(res, err);
  }
});

app.post('/api/profile', adminFailLimiter, requireAdmin, uploadJson, async (req: Request, res: Response) => {
  try {
    const { avatarUrl } = req.body ?? {};
    if (!isImageData(avatarUrl) && !isHttpUrl(avatarUrl)) {
      return res.status(400).json({ error: 'avatarUrl must be a PNG/JPEG/WEBP/GIF/AVIF data URL or an http(s) URL' });
    }
    await pool.query(
      `INSERT INTO portfolio_profile (id, avatar_url, updated_at)
       VALUES ('kelvin_avatar', $1, NOW())
       ON CONFLICT (id) DO UPDATE SET avatar_url = $1, updated_at = NOW()`,
      [avatarUrl]
    );
    res.json({ success: true, avatarUrl });
  } catch (err) {
    return serverError(res, err);
  }
});

// 2. Graphic design gallery
app.get('/api/graphics', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM portfolio_graphics ORDER BY created_at DESC'
    );
    const formatted = rows.map((r) => ({
      id: r.id,
      title: r.title,
      client: r.client,
      description: r.description,
      image: r.image_data,
      fileType: r.file_type,
      fileSize: r.file_size,
      dateAdded:
        r.created_at?.toISOString().split('T')[0] ||
        new Date().toISOString().split('T')[0],
      isUserUploaded: true
    }));
    res.json(formatted);
  } catch (err) {
    return serverError(res, err);
  }
});

app.post('/api/graphics', adminFailLimiter, requireAdmin, uploadJson, async (req: Request, res: Response) => {
  try {
    const b = req.body ?? {};
    const title = text(b.title, 200);
    const client = text(b.client, 200);
    const description = text(b.description, 2000);
    const fileType = text(b.fileType, 20);
    const fileSize = text(b.fileSize, 50);

    if (!title || client === null || description === null || fileType === null || fileSize === null) {
      return res.status(400).json({ error: 'Invalid or missing fields' });
    }
    if (!isImageData(b.image)) {
      return res.status(400).json({ error: 'image must be a PNG/JPEG/WEBP/GIF/AVIF data URL' });
    }

    const graphicId = pickId(b.id, 'graphic');
    await pool.query(
      `INSERT INTO portfolio_graphics (id, title, client, description, image_data, file_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [graphicId, title, client, description, b.image, fileType || 'IMG', fileSize]
    );
    res.json({ success: true, id: graphicId });
  } catch (err) {
    return serverError(res, err);
  }
});

app.delete('/api/graphics/:id', adminFailLimiter, requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!ID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM portfolio_graphics WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    return serverError(res, err);
  }
});

// 3. Photography gallery
app.get('/api/photos', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM portfolio_photos ORDER BY created_at DESC'
    );
    const formatted = rows.map((r) => ({
      id: r.id,
      title: r.title,
      location: r.location,
      cameraInfo: r.camera_info,
      description: r.description,
      image: r.image_data,
      fileType: r.file_type,
      fileSize: r.file_size,
      dateAdded:
        r.created_at?.toISOString().split('T')[0] ||
        new Date().toISOString().split('T')[0]
    }));
    res.json(formatted);
  } catch (err) {
    return serverError(res, err);
  }
});

app.post('/api/photos', adminFailLimiter, requireAdmin, uploadJson, async (req: Request, res: Response) => {
  try {
    const b = req.body ?? {};
    const title = text(b.title, 200);
    const location = text(b.location, 200);
    const cameraInfo = text(b.cameraInfo, 200);
    const description = text(b.description, 2000);
    const fileType = text(b.fileType, 20);
    const fileSize = text(b.fileSize, 50);

    if (
      !title ||
      location === null ||
      cameraInfo === null ||
      description === null ||
      fileType === null ||
      fileSize === null
    ) {
      return res.status(400).json({ error: 'Invalid or missing fields' });
    }
    if (!isImageData(b.image)) {
      return res.status(400).json({ error: 'image must be a PNG/JPEG/WEBP/GIF/AVIF data URL' });
    }

    const photoId = pickId(b.id, 'photo');
    await pool.query(
      `INSERT INTO portfolio_photos (id, title, location, camera_info, description, image_data, file_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [photoId, title, location, cameraInfo, description, b.image, fileType || 'JPG', fileSize]
    );
    res.json({ success: true, id: photoId });
  } catch (err) {
    return serverError(res, err);
  }
});

app.delete('/api/photos/:id', adminFailLimiter, requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!ID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM portfolio_photos WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    return serverError(res, err);
  }
});

// 4. Custom websites
app.get('/api/websites', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM portfolio_websites ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    return serverError(res, err);
  }
});

app.post('/api/websites', adminFailLimiter, requireAdmin, uploadJson, async (req: Request, res: Response) => {
  try {
    const b = req.body ?? {};
    const title = text(b.title, 200);
    const description = text(b.description, 2000);
    const role = text(b.role, 100);
    const year = text(b.year, 20);

    if (!title || description === null || role === null || year === null) {
      return res.status(400).json({ error: 'Invalid or missing fields' });
    }
    if (!isHttpUrl(b.url)) {
      return res.status(400).json({ error: 'url must be a valid http(s) URL' });
    }

    let imageUrl = '';
    if (b.imageUrl !== undefined && b.imageUrl !== null && b.imageUrl !== '') {
      if (!isHttpUrl(b.imageUrl) && !isImageData(b.imageUrl)) {
        return res.status(400).json({ error: 'imageUrl must be an http(s) URL or an image data URL' });
      }
      imageUrl = b.imageUrl;
    }

    let technologies: string[] = [];
    if (b.technologies !== undefined && b.technologies !== null) {
      if (
        !Array.isArray(b.technologies) ||
        b.technologies.length > 20 ||
        !b.technologies.every((t: unknown) => typeof t === 'string' && t.length > 0 && t.length <= 50)
      ) {
        return res.status(400).json({ error: 'technologies must be an array of up to 20 short strings' });
      }
      technologies = b.technologies.map((t: string) => t.trim());
    }

    const webId = pickId(b.id, 'web');
    await pool.query(
      `INSERT INTO portfolio_websites (id, title, url, description, technologies, image_url, role, year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [webId, title, b.url, description, technologies, imageUrl, role, year]
    );
    res.json({ success: true, id: webId });
  } catch (err) {
    return serverError(res, err);
  }
});

app.delete('/api/websites/:id', adminFailLimiter, requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!ID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM portfolio_websites WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    return serverError(res, err);
  }
});

// 5. Contact form — sends email via Nodemailer + Gmail
const mailer =
  process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      })
    : null;

if (!mailer) {
  console.warn('EMAIL_USER / EMAIL_PASS not set: the contact form will return an error.');
}

app.post('/api/contact', contactLimiter, smallJson, async (req: Request, res: Response) => {
  const b = req.body ?? {};

  // Honeypot: real visitors never fill this hidden field, bots usually do.
  // Add <input name="website" tabIndex={-1} autoComplete="off" style={{display:'none'}} />
  // to the form and send it along. Bots get a fake success and nothing is sent.
  if (typeof b.website === 'string' && b.website.trim() !== '') {
    return res.status(200).json({ success: true });
  }

  const name = text(b.name, 100);
  const email = text(b.email, 254);
  const subject = text(b.subject, 150);
  const message = text(b.message, 5000);

  if (name === null || email === null || subject === null || message === null) {
    return res.status(400).json({ success: false, message: 'One or more fields are invalid or too long.' });
  }
  if (!email || !message) {
    return res.status(400).json({ success: false, message: 'Email and message are required.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }
  if (!mailer) {
    console.error('EMAIL_USER or EMAIL_PASS is not set.');
    return res.status(503).json({ success: false, message: 'Email is not configured.' });
  }

  const safeName = oneLine(name);
  const safeSubject = oneLine(subject);
  const to = process.env.CONTACT_TO || process.env.EMAIL_USER;

  try {
    await mailer.sendMail({
      from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
      to,
      replyTo: email,
      subject: safeSubject
        ? `Inquiry: ${safeSubject}`
        : `New message from ${safeName || 'Website Visitor'}`,
      text: `Name: ${safeName || 'N/A'}\nEmail: ${email}\nSubject: ${safeSubject || 'N/A'}\n\n${message}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E2B714;">New Portfolio Message</h2>
          <p><strong>Name:</strong> ${escapeHtml(safeName) || 'N/A'}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(safeSubject) || 'N/A'}</p>
          <hr style="border: 1px solid #eee;" />
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
        </div>
      `
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Mail error:', err);
    res.status(500).json({ success: false, message: 'Failed to send email.' });
  }
});

// ---------------------------------------------------------------------------
// Unknown API routes and error handling
// ---------------------------------------------------------------------------
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large' });
  }
  if (err instanceof SyntaxError || err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start server (Vite middleware in dev, static files in production)
// ---------------------------------------------------------------------------
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Portfolio server with Neon Database running on http://0.0.0.0:${PORT}`);
  });
}

startServer();