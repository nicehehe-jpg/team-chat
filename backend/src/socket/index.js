const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

function setupSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket;

    db.prepare("UPDATE users SET status = 'online' WHERE id = ?").run(userId);
    socket.broadcast.emit('user_online', { userId });

    const rooms = db.prepare('SELECT room_id FROM room_members WHERE user_id = ?').all(userId);
    rooms.forEach(({ room_id }) => socket.join(room_id));

    socket.on('join_room', (roomId) => socket.join(roomId));

    socket.on('send_message', ({ roomId, content, type = 'text' }) => {
      if (!roomId || !content?.trim()) return;
      const member = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, userId);
      if (!member) return;

      const id = uuidv4();
      db.prepare('INSERT INTO messages (id, room_id, sender_id, content, type) VALUES (?, ?, ?, ?, ?)').run(id, roomId, userId, content.trim(), type);
      const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
      const sender = db.prepare('SELECT id, name, avatar_url FROM users WHERE id = ?').get(userId);
      io.to(roomId).emit('new_message', { ...message, sender });
    });

    socket.on('mark_read', (roomId) => {
      db.prepare("UPDATE room_members SET last_read_at = datetime('now') WHERE room_id = ? AND user_id = ?").run(roomId, userId);
      socket.to(roomId).emit('message_read', { roomId, userId, readAt: new Date().toISOString() });
    });

    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('typing_indicator', { userId, roomId, isTyping });
    });

    socket.on('disconnect', () => {
      db.prepare("UPDATE users SET status = 'offline' WHERE id = ?").run(userId);
      socket.broadcast.emit('user_offline', { userId });
    });
  });
}

module.exports = setupSocket;
