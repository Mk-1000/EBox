const { pool } = require('./db');

const BATCH_INTERVAL_MS = Number(process.env.MOVE_DEBOUNCE_MS || 200);
const MAX_BATCH_SIZE = 200;

// Queue entry: { userId, id, quadrant, enqueuedAt }
let pending = [];
let timer = null;

function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(async () => {
    const toProcess = pending;
    pending = [];
    timer = null;
    if (toProcess.length === 0) return;

    // Coalesce by (userId,id) keeping the latest quadrant only
    const latestByKey = new Map();
    for (const item of toProcess) {
      latestByKey.set(`${item.userId}:${item.id}`, item);
    }
    const jobs = Array.from(latestByKey.values());

    // Process in chunks
    const chunks = [];
    for (let i = 0; i < jobs.length; i += MAX_BATCH_SIZE) {
      chunks.push(jobs.slice(i, i + MAX_BATCH_SIZE));
    }

    for (const chunk of chunks) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const now = new Date();
        for (const { id, userId, quadrant } of chunk) {
          await conn.query(
            'UPDATE tasks SET quadrant = ?, updated_at = ? WHERE id = ? AND user_id = ?',
            [quadrant, now, id, userId]
          );
        }
        await conn.commit();
      } catch (err) {
        try { await conn.rollback(); } catch {}
        console.error('Queue batch move error:', err);
      } finally {
        conn.release();
      }
    }
  }, BATCH_INTERVAL_MS);
}

function enqueueMove({ userId, id, quadrant }) {
  pending.push({ userId, id, quadrant, enqueuedAt: Date.now() });
  scheduleFlush();
}

function enqueueBulkMoves(moves, userId) {
  for (const m of moves) {
    if (!m || !m.id || !m.quadrant) continue;
    pending.push({ userId, id: m.id, quadrant: m.quadrant, enqueuedAt: Date.now() });
  }
  scheduleFlush();
}

module.exports = {
  enqueueMove,
  enqueueBulkMoves,
};
