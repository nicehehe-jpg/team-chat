const db = require('../config/db');

function getUsers(req, res) {
  try {
    const rows = db.prepare('SELECT id, email, name, avatar_url, status FROM users WHERE id != ? ORDER BY name').all(req.user.userId);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

function getMe(req, res) {
  try {
    const user = db.prepare('SELECT id, email, name, avatar_url, status, created_at FROM users WHERE id = ?').get(req.user.userId);
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

function updateMe(req, res) {
  const { name, avatar_url } = req.body;
  try {
    db.prepare('UPDATE users SET name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url) WHERE id = ?').run(name || null, avatar_url || null, req.user.userId);
    const user = db.prepare('SELECT id, email, name, avatar_url, status FROM users WHERE id = ?').get(req.user.userId);
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

module.exports = { getUsers, getMe, updateMe };
