import { Router } from 'express';
import { getDb } from '../store/db.js';

export const feedbackRouter = Router();

// Ensure the feedback table exists (runs once on first request)
function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      score     INTEGER NOT NULL,
      emoji     TEXT,
      label     TEXT,
      tags      TEXT,
      comment   TEXT,
      page      TEXT,
      ts        TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

let tableReady = false;

// POST /api/feedback
feedbackRouter.post('/', (req, res) => {
  try {
    if (!tableReady) { ensureTable(); tableReady = true; }

    const { score, emoji, label, tags = [], comment = '', page = '', ts } = req.body;

    // Basic validation
    const numScore = Number(score);
    if (!Number.isInteger(numScore) || numScore < 1 || numScore > 5) {
      return res.status(400).json({ error: 'score must be 1–5' });
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO feedback (score, emoji, label, tags, comment, page, ts)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      numScore,
      String(emoji || '').slice(0, 8),
      String(label || '').slice(0, 64),
      JSON.stringify(Array.isArray(tags) ? tags.slice(0, 10) : []),
      String(comment || '').slice(0, 1000),
      String(page || '').slice(0, 256),
      String(ts || new Date().toISOString()).slice(0, 32),
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[feedback] insert error', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// GET /api/feedback  (admin-only summary — protected by requireAuth in app.js)
feedbackRouter.get('/', (req, res) => {
  try {
    if (!tableReady) { ensureTable(); tableReady = true; }
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM feedback ORDER BY created_at DESC LIMIT 200
    `).all();
    res.json({ total: rows.length, rows });
  } catch (err) {
    console.error('[feedback] read error', err);
    res.status(500).json({ error: 'internal error' });
  }
});
