const pool = require('../config/db');

// auth 미들웨어 뒤에 사용 — req.user.userId가 admin인지 확인
async function requireAdmin(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.userId]);
    if (!rows[0] || rows[0].role !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다' });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

module.exports = requireAdmin;
