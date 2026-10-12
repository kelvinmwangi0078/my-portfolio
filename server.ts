import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';

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

// Cloudflare R2 holds every image. Neon only stores text and the image URL.
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.replace(/\/+$/, '');
// Folders in the bucket that "Sync from R2" imports from (files you uploaded by hand).
const R2_PHOTOS_PREFIX = process.env.R2_PHOTOS_PREFIX ?? 'my-images/';
const R2_GRAPHICS_PREFIX = process.env.R2_GRAPHICS_PREFIX ?? 'posters/';
const R2_PROFILE_PREFIX = process.env.R2_PROFILE_PREFIX ?? 'profile/';

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
  throw new Error(
    'R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_URL. Images are never stored in Neon.'
  );
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }
});

// ---------------------------------------------------------------------------
// Security headers (CSP is off so Vite dev and R2 images keep working)
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
  skip: (req) => req.path.endsWith('/image'), // legacy image route has its own limit below
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

const imageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
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
const STORED_IMAGE_HEADER_RE = /^data:(image\/(?:png|jpeg|webp|gif|avif));base64$/;
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

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

function serverError(res: Response, err: unknown) {
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

// ---------------------------------------------------------------------------
// Cloudflare R2 image storage
// ---------------------------------------------------------------------------
const IMAGE_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif'
};

/** Public URL for an object key. Each path segment is encoded, so folders with spaces work. */
function r2Url(key: string): string {
  return `${R2_PUBLIC_URL}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

/** Object key for one of our R2 URLs, or null if the URL is not in this bucket. */
function r2KeyFromUrl(url: string): string | null {
  if (!url.startsWith(`${R2_PUBLIC_URL}/`)) return null;
  try {
    return url
      .slice(R2_PUBLIC_URL!.length + 1)
      .split('/')
      .map(decodeURIComponent)
      .join('/');
  } catch {
    return null;
  }
}

/** Uploads a base64 data URL to R2 and returns its public URL. */
async function saveImage(dataUrl: string, folder: string, id: string): Promise<string> {
  const comma = dataUrl.indexOf(',');
  const match = comma > 0 ? STORED_IMAGE_HEADER_RE.exec(dataUrl.slice(0, comma)) : null;
  if (!match) throw new Error('Unsupported image');

  const key = `${folder}/${id}-${Date.now()}.${IMAGE_EXT[match[1]]}`;
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET!,
      Key: key,
      Body: Buffer.from(dataUrl.slice(comma + 1), 'base64'),
      ContentType: match[1],
      // An image never changes once uploaded (edits only change text), so it can be cached for a year.
      CacheControl: 'public, max-age=31536000, immutable'
    })
  );
  return r2Url(key);
}

/** Deletes the image from R2 when the stored value is one of our R2 URLs. Never throws. */
async function removeImage(stored: string | undefined | null) {
  if (!stored) return;
  const key = r2KeyFromUrl(stored);
  if (!key) return;
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET!, Key: key }));
  } catch (err) {
    console.error('Could not delete image from R2:', err);
  }
}

// ---------------------------------------------------------------------------
// Neon PostgreSQL connection (text and image URLs only)
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
      // image_data / avatar_url / image_url hold an R2 URL. The column names are unchanged
      // so existing rows keep working.
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

// Legacy only: rows saved before the move to R2 still hold a base64 image. This serves them
// (or redirects to R2) so nothing breaks. Run migrate-to-r2.ts, then this can be deleted.
async function sendStoredImage(
  res: Response,
  table: 'portfolio_photos' | 'portfolio_graphics',
  id: string
) {
  if (!ID_RE.test(id)) return res.status(400).json({ error: 'Invalid id' });

  const { rows } = await pool.query(`SELECT image_data FROM ${table} WHERE id = $1`, [id]);
  const data: string | undefined = rows[0]?.image_data;
  if (!data) return res.status(404).json({ error: 'Not found' });
  if (/^https?:\/\//.test(data)) return res.redirect(301, data);

  const comma = data.indexOf(',');
  const match = comma > 0 ? STORED_IMAGE_HEADER_RE.exec(data.slice(0, comma)) : null;
  if (!match) return res.status(415).json({ error: 'Unsupported image' });

  res.set({
    'Content-Type': match[1],
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff'
  });
  return res.send(Buffer.from(data.slice(comma + 1), 'base64'));
}

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

    const { rows: old } = await pool.query('SELECT avatar_url FROM portfolio_profile WHERE id = $1', [
      'kelvin_avatar'
    ]);
    const stored = isImageData(avatarUrl) ? await saveImage(avatarUrl, 'profile', 'avatar') : avatarUrl;

    await pool.query(
      `INSERT INTO portfolio_profile (id, avatar_url, updated_at)
       VALUES ('kelvin_avatar', $1, NOW())
       ON CONFLICT (id) DO UPDATE SET avatar_url = $1, updated_at = NOW()`,
      [stored]
    );
    if (old[0]?.avatar_url && old[0].avatar_url !== stored) await removeImage(old[0].avatar_url);

    res.json({ success: true, avatarUrl: stored });
  } catch (err) {
    return serverError(res, err);
  }
});

// 2. Graphic design gallery
app.get('/api/graphics', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, client, description, file_type, file_size, created_at,
              CASE WHEN image_data LIKE 'http%' THEN image_data END AS direct_url
       FROM portfolio_graphics ORDER BY created_at DESC`
    );
    const formatted = rows.map((r) => ({
      id: r.id,
      title: r.title,
      client: r.client,
      description: r.description,
      image: r.direct_url || `/api/graphics/${r.id}/image`,
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
    const image = await saveImage(b.image, 'graphics', graphicId);
    await pool.query(
      `INSERT INTO portfolio_graphics (id, title, client, description, image_data, file_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [graphicId, title, client, description, image, fileType || 'IMG', fileSize]
    );
    res.json({ success: true, id: graphicId, image });
  } catch (err) {
    return serverError(res, err);
  }
});

app.delete('/api/graphics/:id', adminFailLimiter, requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!ID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const { rows } = await pool.query('DELETE FROM portfolio_graphics WHERE id = $1 RETURNING image_data', [
      req.params.id
    ]);
    await removeImage(rows[0]?.image_data);
    res.json({ success: true });
  } catch (err) {
    return serverError(res, err);
  }
});

// 3. Photography gallery
app.get('/api/photos', async (_req: Request, res: Response) => {
  try {
    // Only the URL is read from image_data, never a base64 body.
    const { rows } = await pool.query(
      `SELECT id, title, location, camera_info, description, file_type, file_size, created_at,
              CASE WHEN image_data LIKE 'http%' THEN image_data END AS direct_url
       FROM portfolio_photos ORDER BY created_at DESC`
    );
    const formatted = rows.map((r) => ({
      id: r.id,
      title: r.title,
      location: r.location,
      cameraInfo: r.camera_info,
      description: r.description,
      image: r.direct_url || `/api/photos/${r.id}/image`,
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
    const image = await saveImage(b.image, 'photos', photoId);
    await pool.query(
      `INSERT INTO portfolio_photos (id, title, location, camera_info, description, image_data, file_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [photoId, title, location, cameraInfo, description, image, fileType || 'JPG', fileSize]
    );
    res.json({ success: true, id: photoId, image });
  } catch (err) {
    return serverError(res, err);
  }
});

// Imports files you uploaded to R2 by hand: my-images/ -> photos, posters/ -> graphics,
// profile/ -> profile picture (only if none is set yet). Safe to run again: anything already imported is skipped.
const SYNC_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']);

type R2Image = { key: string; size: number; modified: number; fileName: string; ext: string };

async function listR2Images(prefix: string): Promise<R2Image[]> {
  const out: R2Image[] = [];
  let token: string | undefined;
  do {
    const page = await r2.send(
      new ListObjectsV2Command({ Bucket: R2_BUCKET!, Prefix: prefix, ContinuationToken: token })
    );
    for (const obj of page.Contents ?? []) {
      const key = obj.Key;
      if (!key || key.endsWith('/')) continue;
      const fileName = key.split('/').pop() || key;
      const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
      if (!SYNC_EXT.has(ext)) continue;
      out.push({ key, size: obj.Size ?? 0, modified: obj.LastModified?.getTime() ?? 0, fileName, ext });
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return out;
}

const r2Id = (key: string) => 'r2-' + crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
const r2Title = (fileName: string, fallback: string) =>
  fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim() || fallback;
const r2Type = (ext: string) => (ext === 'jpeg' ? 'JPEG' : ext.toUpperCase());

app.post('/api/sync-r2', adminFailLimiter, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = {
      photos: { found: 0, added: 0 },
      graphics: { found: 0, added: 0 },
      profile: { found: 0, added: 0 }
    };

    // Photos
    for (const f of await listR2Images(R2_PHOTOS_PREFIX)) {
      result.photos.found++;
      const r = await pool.query(
        `INSERT INTO portfolio_photos (id, title, location, camera_info, description, image_data, file_type, file_size)
         SELECT $1::varchar, $2::text, 'Kenya', '', '', $3::text, $4::varchar, $5::varchar
         WHERE NOT EXISTS (SELECT 1 FROM portfolio_photos WHERE id = $1::varchar OR image_data = $3::text)`,
        [r2Id(f.key), r2Title(f.fileName, 'Photograph'), r2Url(f.key), r2Type(f.ext), formatBytes(f.size)]
      );
      result.photos.added += r.rowCount ?? 0;
    }

    // Graphics / posters
    for (const f of await listR2Images(R2_GRAPHICS_PREFIX)) {
      result.graphics.found++;
      const r = await pool.query(
        `INSERT INTO portfolio_graphics (id, title, client, description, image_data, file_type, file_size)
         SELECT $1::varchar, $2::text, '', '', $3::text, $4::varchar, $5::varchar
         WHERE NOT EXISTS (SELECT 1 FROM portfolio_graphics WHERE id = $1::varchar OR image_data = $3::text)`,
        [r2Id(f.key), r2Title(f.fileName, 'Artwork'), r2Url(f.key), r2Type(f.ext), formatBytes(f.size)]
      );
      result.graphics.added += r.rowCount ?? 0;
    }

    // Profile picture: the newest file in the folder, used only when no picture is set yet.
    const avatars = (await listR2Images(R2_PROFILE_PREFIX)).sort((a, b) => b.modified - a.modified);
    result.profile.found = avatars.length;
    if (avatars.length > 0) {
      const r = await pool.query(
        `INSERT INTO portfolio_profile (id, avatar_url, updated_at)
         VALUES ('kelvin_avatar', $1, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [r2Url(avatars[0].key)]
      );
      result.profile.added = r.rowCount ?? 0;
    }

    res.json({ success: true, ...result });
  } catch (err) {
    return serverError(res, err);
  }
});

app.delete('/api/photos/:id', adminFailLimiter, requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!ID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const { rows } = await pool.query('DELETE FROM portfolio_photos WHERE id = $1 RETURNING image_data', [
      req.params.id
    ]);
    await removeImage(rows[0]?.image_data);
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

    const webId = pickId(b.id, 'web');

    let imageUrl = '';
    if (b.imageUrl !== undefined && b.imageUrl !== null && b.imageUrl !== '') {
      if (!isHttpUrl(b.imageUrl) && !isImageData(b.imageUrl)) {
        return res.status(400).json({ error: 'imageUrl must be an http(s) URL or an image data URL' });
      }
      imageUrl = isImageData(b.imageUrl) ? await saveImage(b.imageUrl, 'websites', webId) : b.imageUrl;
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

    await pool.query(
      `INSERT INTO portfolio_websites (id, title, url, description, technologies, image_url, role, year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [webId, title, b.url, description, technologies, imageUrl, role, year]
    );
    res.json({ success: true, id: webId, imageUrl });
  } catch (err) {
    return serverError(res, err);
  }
});

app.delete('/api/websites/:id', adminFailLimiter, requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!ID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const { rows } = await pool.query('DELETE FROM portfolio_websites WHERE id = $1 RETURNING image_url', [
      req.params.id
    ]);
    await removeImage(rows[0]?.image_url);
    res.json({ success: true });
  } catch (err) {
    return serverError(res, err);
  }
});

// 5. Contact form — sends email through Resend's HTTPS API (works where SMTP ports are blocked)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CONTACT_TO = process.env.CONTACT_TO;
const CONTACT_FROM = process.env.CONTACT_FROM || 'Portfolio Contact <onboarding@resend.dev>';

if (!RESEND_API_KEY || !CONTACT_TO) {
  console.warn('RESEND_API_KEY / CONTACT_TO not set: the contact form will return an error.');
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
  if (!RESEND_API_KEY || !CONTACT_TO) {
    console.error('RESEND_API_KEY or CONTACT_TO is not set.');
    return res.status(503).json({ success: false, message: 'Email is not configured.' });
  }

  const safeName = oneLine(name);
  const safeSubject = oneLine(subject);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: [CONTACT_TO],
        reply_to: email,
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
      })
    });

    if (!response.ok) {
      throw new Error(`Resend responded ${response.status}: ${await response.text()}`);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Mail error:', err);
    res.status(500).json({ success: false, message: 'Failed to send email.' });
  }
});

// ---------------------------------------------------------------------------
// LEGACY IMAGE ROUTES (public): only used by rows that still hold a base64 image.
// ---------------------------------------------------------------------------
app.get('/api/photos/:id/image', imageLimiter, async (req: Request, res: Response) => {
  try {
    await sendStoredImage(res, 'portfolio_photos', req.params.id);
  } catch (err) {
    return serverError(res, err);
  }
});

app.get('/api/graphics/:id/image', imageLimiter, async (req: Request, res: Response) => {
  try {
    await sendStoredImage(res, 'portfolio_graphics', req.params.id);
  } catch (err) {
    return serverError(res, err);
  }
});

// ---------------------------------------------------------------------------
// EDIT ROUTES (admin only): update details after posting.
// Send only the fields you want to change.
// ---------------------------------------------------------------------------

// Table and column names below are fixed in code, never taken from the request.
async function updateRow(table: string, id: string, fields: Record<string, unknown>) {
  const cols = Object.keys(fields);
  const sets = cols.map((c, i) => `${c} = $${i + 2}`).join(', ');
  const result = await pool.query(`UPDATE ${table} SET ${sets} WHERE id = $1`, [
    id,
    ...cols.map((c) => fields[c])
  ]);
  return result.rowCount ?? 0;
}

// Photos: title, location, cameraInfo, description
app.patch('/api/photos/:id', adminFailLimiter, requireAdmin, smallJson, async (req: Request, res: Response) => {
  try {
    if (!ID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const b = req.body ?? {};
    const fields: Record<string, unknown> = {};

    if ('title' in b) {
      const v = text(b.title, 200);
      if (!v) return res.status(400).json({ error: 'title cannot be empty' });
      fields.title = v;
    }
    const optional: Array<[string, string, number]> = [
      ['location', 'location', 200],
      ['cameraInfo', 'camera_info', 200],
      ['description', 'description', 2000]
    ];
    for (const [key, column, max] of optional) {
      if (key in b) {
        const v = text(b[key], max);
        if (v === null) return res.status(400).json({ error: `Invalid ${key}` });
        fields[column] = v;
      }
    }

    if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'Nothing to update' });
    const count = await updateRow('portfolio_photos', req.params.id, fields);
    if (!count) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    return serverError(res, err);
  }
});

// Graphics: title, client, description
app.patch('/api/graphics/:id', adminFailLimiter, requireAdmin, smallJson, async (req: Request, res: Response) => {
  try {
    if (!ID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const b = req.body ?? {};
    const fields: Record<string, unknown> = {};

    if ('title' in b) {
      const v = text(b.title, 200);
      if (!v) return res.status(400).json({ error: 'title cannot be empty' });
      fields.title = v;
    }
    const optional: Array<[string, string, number]> = [
      ['client', 'client', 200],
      ['description', 'description', 2000]
    ];
    for (const [key, column, max] of optional) {
      if (key in b) {
        const v = text(b[key], max);
        if (v === null) return res.status(400).json({ error: `Invalid ${key}` });
        fields[column] = v;
      }
    }

    if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'Nothing to update' });
    const count = await updateRow('portfolio_graphics', req.params.id, fields);
    if (!count) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    return serverError(res, err);
  }
});

// Websites: title, url, description, role, year, technologies, imageUrl
app.patch('/api/websites/:id', adminFailLimiter, requireAdmin, smallJson, async (req: Request, res: Response) => {
  try {
    if (!ID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const b = req.body ?? {};
    const fields: Record<string, unknown> = {};

    if ('title' in b) {
      const v = text(b.title, 200);
      if (!v) return res.status(400).json({ error: 'title cannot be empty' });
      fields.title = v;
    }
    if ('url' in b) {
      if (!isHttpUrl(b.url)) return res.status(400).json({ error: 'url must be a valid http(s) URL' });
      fields.url = b.url;
    }
    if ('imageUrl' in b) {
      if (b.imageUrl !== '' && !isHttpUrl(b.imageUrl)) {
        return res.status(400).json({ error: 'imageUrl must be an http(s) URL or empty' });
      }
      fields.image_url = b.imageUrl;
    }
    if ('technologies' in b) {
      if (
        !Array.isArray(b.technologies) ||
        b.technologies.length > 20 ||
        !b.technologies.every((t: unknown) => typeof t === 'string' && t.length > 0 && t.length <= 50)
      ) {
        return res.status(400).json({ error: 'technologies must be an array of up to 20 short strings' });
      }
      fields.technologies = b.technologies.map((t: string) => t.trim());
    }
    const optional: Array<[string, string, number]> = [
      ['description', 'description', 2000],
      ['role', 'role', 100],
      ['year', 'year', 20]
    ];
    for (const [key, column, max] of optional) {
      if (key in b) {
        const v = text(b[key], max);
        if (v === null) return res.status(400).json({ error: `Invalid ${key}` });
        fields[column] = v;
      }
    }

    if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'Nothing to update' });
    const count = await updateRow('portfolio_websites', req.params.id, fields);
    if (!count) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    return serverError(res, err);
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
    console.log(`Portfolio server running on http://0.0.0.0:${PORT} (images on Cloudflare R2, data on Neon)`);
  });
}

startServer();