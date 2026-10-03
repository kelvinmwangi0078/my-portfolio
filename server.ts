import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// High limit for direct image base64 uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- Neon PostgreSQL connection (DATABASE_URL must come from the environment) ---
const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error(
    'DATABASE_URL is not set. Add it to your .env file locally, or to your hosting dashboard.'
  );
}

// Strip channel_binding if present for maximum Node.js pg SCRAM compatibility
const neonConnectionString = rawConnectionString
  .replace(/[?&]channel_binding=[^&]+/, (match) => (match.startsWith('?') ? '?' : ''))
  .replace(/\?$/, '');

const pool = new Pool({
  connectionString: neonConnectionString,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

// Initialize tables
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

// --- API ROUTES ---

// 1. Profile avatar
app.get('/api/profile', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT avatar_url FROM portfolio_profile WHERE id = $1',
      ['kelvin_avatar']
    );
    return res.json({ avatarUrl: rows.length > 0 ? rows[0].avatar_url : null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/profile', async (req: Request, res: Response) => {
  try {
    const { avatarUrl } = req.body;
    if (!avatarUrl) {
      return res.status(400).json({ error: 'avatarUrl is required' });
    }
    await pool.query(
      `INSERT INTO portfolio_profile (id, avatar_url, updated_at)
       VALUES ('kelvin_avatar', $1, NOW())
       ON CONFLICT (id) DO UPDATE SET avatar_url = $1, updated_at = NOW()`,
      [avatarUrl]
    );
    res.json({ success: true, avatarUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/graphics', async (req: Request, res: Response) => {
  try {
    const { id, title, client, description, image, fileType, fileSize } = req.body;
    if (!image || !title) {
      return res.status(400).json({ error: 'title and image are required' });
    }
    const graphicId = id || 'graphic-' + Date.now();
    await pool.query(
      `INSERT INTO portfolio_graphics (id, title, client, description, image_data, file_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [graphicId, title, client || '', description || '', image, fileType || 'IMG', fileSize || '']
    );
    res.json({ success: true, id: graphicId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/graphics/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM portfolio_graphics WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/photos', async (req: Request, res: Response) => {
  try {
    const { id, title, location, cameraInfo, description, image, fileType, fileSize } = req.body;
    if (!image || !title) {
      return res.status(400).json({ error: 'title and image are required' });
    }
    const photoId = id || 'photo-' + Date.now();
    await pool.query(
      `INSERT INTO portfolio_photos (id, title, location, camera_info, description, image_data, file_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [photoId, title, location || '', cameraInfo || '', description || '', image, fileType || 'JPG', fileSize || '']
    );
    res.json({ success: true, id: photoId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/photos/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM portfolio_photos WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Custom websites
app.get('/api/websites', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM portfolio_websites ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/websites', async (req: Request, res: Response) => {
  try {
    const { id, title, url, description, technologies, imageUrl, role, year } = req.body;
    const webId = id || 'web-' + Date.now();
    await pool.query(
      `INSERT INTO portfolio_websites (id, title, url, description, technologies, image_url, role, year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [webId, title, url, description || '', technologies || [], imageUrl || '', role || '', year || '']
    );
    res.json({ success: true, id: webId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Start server (Vite middleware in dev, static files in production) ---
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

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