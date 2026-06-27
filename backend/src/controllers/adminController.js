const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// 전체 사용자 목록 (대기 포함)
async function listUsers(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, avatar_url, status, status_message, role, approved, created_at
       FROM users ORDER BY approved ASC, created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

// 계정 승인
async function approveUser(req, res) {
  try {
    const { rows } = await pool.query(
      'UPDATE users SET approved = true WHERE id = $1 RETURNING id, email, name, role, approved',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

// 계정 수정 (이름/이메일/권한/승인/비밀번호)
async function updateUser(req, res) {
  const { name, email, role, approved, password } = req.body;
  try {
    let passwordHash = null;
    if (password) passwordHash = await bcrypt.hash(password, 12);

    const { rows } = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        approved = COALESCE($4, approved),
        password_hash = COALESCE($5, password_hash)
       WHERE id = $6
       RETURNING id, email, name, avatar_url, status, status_message, role, approved, created_at`,
      [name ?? null, email ?? null, role ?? null, approved ?? null, passwordHash, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ message: '이미 사용 중인 이메일입니다' });
    res.status(500).json({ message: '서버 오류' });
  }
}

// 계정 삭제
async function deleteUser(req, res) {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ message: '본인 계정은 삭제할 수 없습니다' });
    }
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

module.exports = { listUsers, approveUser, updateUser, deleteUser };
