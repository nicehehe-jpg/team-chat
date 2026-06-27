const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

function getRooms(req, res) {
  try {
    const rooms = db.prepare(`
      SELECT r.id, r.type, r.name, r.created_at
      FROM rooms r
      JOIN room_members rm ON rm.room_id = r.id AND rm.user_id = ?
      ORDER BY r.created_at DESC
    `).all(req.user.userId);

    const result = rooms.map((room) => {
      const lastMsg = db.prepare(
        'SELECT content, created_at, type FROM messages WHERE room_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(room.id);

      const unread = db.prepare(`
        SELECT COUNT(*) as cnt FROM messages m
        JOIN room_members rm ON rm.room_id = m.room_id AND rm.user_id = ?
        WHERE m.room_id = ? AND m.created_at > rm.last_read_at AND m.sender_id != ?
      `).get(req.user.userId, room.id, req.user.userId);

      const members = db.prepare(`
        SELECT u.id, u.name, u.avatar_url, u.status
        FROM users u JOIN room_members rm ON rm.user_id = u.id
        WHERE rm.room_id = ? AND u.id != ?
      `).all(room.id, req.user.userId);

      return { ...room, last_message: lastMsg || null, unread_count: unread.cnt, members };
    });

    res.json(result.sort((a, b) => {
      const ta = a.last_message?.created_at || a.created_at;
      const tb = b.last_message?.created_at || b.created_at;
      return tb.localeCompare(ta);
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

function createDirectRoom(req, res) {
  const { targetUserId } = req.body;
  const myId = req.user.userId;
  if (!targetUserId) return res.status(400).json({ message: 'targetUserId가 필요합니다' });
  if (targetUserId === myId) return res.status(400).json({ message: '자기 자신과 채팅할 수 없습니다' });

  try {
    const existing = db.prepare(`
      SELECT r.id FROM rooms r
      JOIN room_members rm1 ON rm1.room_id = r.id AND rm1.user_id = ?
      JOIN room_members rm2 ON rm2.room_id = r.id AND rm2.user_id = ?
      WHERE r.type = 'direct'
    `).get(myId, targetUserId);

    if (existing) return res.json({ id: existing.id, existing: true });

    const id = uuidv4();
    db.prepare("INSERT INTO rooms (id, type) VALUES (?, 'direct')").run(id);
    db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?), (?, ?)').run(id, myId, id, targetUserId);
    res.status(201).json({ id, type: 'direct', existing: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

function createGroupRoom(req, res) {
  const { name, memberIds } = req.body;
  const myId = req.user.userId;
  if (!name?.trim()) return res.status(400).json({ message: '그룹명을 입력하세요' });
  if (!Array.isArray(memberIds) || memberIds.length === 0) return res.status(400).json({ message: '멤버를 1명 이상 선택하세요' });

  try {
    const id = uuidv4();
    db.prepare("INSERT INTO rooms (id, type, name) VALUES (?, 'group', ?)").run(id, name.trim());
    const allMembers = [...new Set([myId, ...memberIds])];
    const insertMember = db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)');
    allMembers.forEach((uid) => insertMember.run(id, uid));
    res.status(201).json({ id, type: 'group', name: name.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

function getMessages(req, res) {
  const { id: roomId } = req.params;
  const limit = parseInt(req.query.limit) || 50;

  try {
    const member = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, req.user.userId);
    if (!member) return res.status(403).json({ message: '접근 권한이 없습니다' });

    const rows = db.prepare(`
      SELECT m.*, u.id as uid, u.name as uname, u.avatar_url as uavatar
      FROM messages m LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.room_id = ?
      ORDER BY m.created_at DESC LIMIT ?
    `).all(roomId, limit);

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

function getRoomMembers(req, res) {
  const { id: roomId } = req.params;
  try {
    const member = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, req.user.userId);
    if (!member) return res.status(403).json({ message: '접근 권한이 없습니다' });
    const rows = db.prepare(`
      SELECT u.id, u.name, u.avatar_url, u.status, rm.joined_at
      FROM users u JOIN room_members rm ON rm.user_id = u.id
      WHERE rm.room_id = ? ORDER BY u.name
    `).all(roomId);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

function inviteMembers(req, res) {
  const { id: roomId } = req.params;
  const { userIds } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ message: 'userIds가 필요합니다' });

  try {
    const room = db.prepare("SELECT 1 FROM rooms WHERE id = ? AND type = 'group'").get(roomId);
    if (!room) return res.status(404).json({ message: '그룹 채팅방을 찾을 수 없습니다' });
    const member = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, req.user.userId);
    if (!member) return res.status(403).json({ message: '권한이 없습니다' });

    const insert = db.prepare('INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)');
    userIds.forEach((uid) => insert.run(roomId, uid));
    res.json({ message: '초대 완료' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
}

module.exports = { getRooms, createDirectRoom, createGroupRoom, getMessages, getRoomMembers, inviteMembers };
