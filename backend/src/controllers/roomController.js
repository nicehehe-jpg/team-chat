const pool = require('../config/db');

async function getRooms(req, res) {
  try {
    const { rows: rooms } = await pool.query(`
      SELECT r.id, r.type, r.name, r.created_at
      FROM rooms r
      JOIN room_members rm ON rm.room_id = r.id AND rm.user_id = $1
      ORDER BY r.created_at DESC
    `, [req.user.userId]);

    const result = await Promise.all(rooms.map(async (room) => {
      const { rows: [lastMsg] } = await pool.query(
        'SELECT content, created_at, type FROM messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT 1',
        [room.id]
      );
      const { rows: [unread] } = await pool.query(`
        SELECT COUNT(*) as cnt FROM messages m
        JOIN room_members rm ON rm.room_id = m.room_id AND rm.user_id = $1
        WHERE m.room_id = $2 AND m.created_at > rm.last_read_at AND m.sender_id != $1
      `, [req.user.userId, room.id]);
      const { rows: members } = await pool.query(`
        SELECT u.id, u.name, u.avatar_url, u.status
        FROM users u JOIN room_members rm ON rm.user_id = u.id
        WHERE rm.room_id = $1 AND u.id != $2
      `, [room.id, req.user.userId]);

      return { ...room, last_message: lastMsg || null, unread_count: parseInt(unread.cnt), members };
    }));

    result.sort((a, b) => {
      const ta = new Date(a.last_message?.created_at || a.created_at);
      const tb = new Date(b.last_message?.created_at || b.created_at);
      return tb - ta;
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

async function createDirectRoom(req, res) {
  const { targetUserId } = req.body;
  const myId = req.user.userId;
  if (!targetUserId) return res.status(400).json({ message: 'targetUserId가 필요합니다' });
  if (targetUserId === myId) return res.status(400).json({ message: '자기 자신과 채팅할 수 없습니다' });

  try {
    const { rows } = await pool.query(`
      SELECT r.id FROM rooms r
      JOIN room_members rm1 ON rm1.room_id = r.id AND rm1.user_id = $1
      JOIN room_members rm2 ON rm2.room_id = r.id AND rm2.user_id = $2
      WHERE r.type = 'direct'
    `, [myId, targetUserId]);

    if (rows.length) return res.json({ id: rows[0].id, existing: true });

    const { rows: [room] } = await pool.query(
      "INSERT INTO rooms (type) VALUES ('direct') RETURNING id"
    );
    await pool.query(
      'INSERT INTO room_members (room_id, user_id) VALUES ($1,$2),($1,$3)',
      [room.id, myId, targetUserId]
    );
    res.status(201).json({ id: room.id, type: 'direct', existing: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

async function createGroupRoom(req, res) {
  const { name, memberIds } = req.body;
  const myId = req.user.userId;
  if (!name?.trim()) return res.status(400).json({ message: '그룹명을 입력하세요' });
  if (!Array.isArray(memberIds) || memberIds.length === 0) return res.status(400).json({ message: '멤버를 1명 이상 선택하세요' });

  try {
    const { rows: [room] } = await pool.query(
      "INSERT INTO rooms (type, name) VALUES ('group', $1) RETURNING id",
      [name.trim()]
    );
    const allMembers = [...new Set([myId, ...memberIds])];
    for (const uid of allMembers) {
      await pool.query('INSERT INTO room_members (room_id, user_id) VALUES ($1,$2)', [room.id, uid]);
    }
    res.status(201).json({ id: room.id, type: 'group', name: name.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

async function getMessages(req, res) {
  const { id: roomId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  try {
    const { rows: [member] } = await pool.query(
      'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, req.user.userId]
    );
    if (!member) return res.status(403).json({ message: '접근 권한이 없습니다' });

    const { rows } = await pool.query(`
      SELECT m.*, u.id as uid, u.name as uname, u.avatar_url as uavatar
      FROM messages m LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.room_id = $1
      ORDER BY m.created_at DESC LIMIT $2
    `, [roomId, limit]);

    const messages = rows.reverse().map((m) => ({
      id: m.id, room_id: m.room_id, sender_id: m.sender_id,
      content: m.content, type: m.type, created_at: m.created_at,
      sender: { id: m.uid, name: m.uname, avatar_url: m.uavatar },
    }));
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

async function getRoomMembers(req, res) {
  const { id: roomId } = req.params;
  try {
    const { rows: [member] } = await pool.query(
      'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, req.user.userId]
    );
    if (!member) return res.status(403).json({ message: '접근 권한이 없습니다' });
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.avatar_url, u.status, rm.joined_at
      FROM users u JOIN room_members rm ON rm.user_id = u.id
      WHERE rm.room_id = $1 ORDER BY u.name
    `, [roomId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

async function inviteMembers(req, res) {
  const { id: roomId } = req.params;
  const { userIds } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ message: 'userIds가 필요합니다' });
  try {
    const { rows: [room] } = await pool.query(
      "SELECT 1 FROM rooms WHERE id = $1 AND type = 'group'", [roomId]
    );
    if (!room) return res.status(404).json({ message: '그룹 채팅방을 찾을 수 없습니다' });
    for (const uid of userIds) {
      await pool.query(
        'INSERT INTO room_members (room_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [roomId, uid]
      );
    }
    res.json({ message: '초대 완료' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

module.exports = { getRooms, createDirectRoom, createGroupRoom, getMessages, getRoomMembers, inviteMembers };
