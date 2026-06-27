const pool = require('../config/db');

async function getUsers(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, email, name, avatar_url, status FROM users WHERE id != $1 ORDER BY name',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

async function getMe(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, email, name, avatar_url, status, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

async function updateMe(req, res) {
  const { name, avatar_url } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        avatar_url = COALESCE($2, avatar_url)
       WHERE id = $3
       RETURNING id, email, name, avatar_url, status`,
      [name || null, avatar_url || null, req.user.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

module.exports = { getUsers, getMe, updateMe };
