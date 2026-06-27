const jwt = require('jsonwebtoken');
const pool = require('../config/db');

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

  io.on('connection', async (socket) => {
    const { userId } = socket;

    await pool.query("UPDATE users SET status = 'online' WHERE id = $1", [userId]);
    socket.broadcast.emit('user_online', { userId });

    const { rows } = await pool.query('SELECT room_id FROM room_members WHERE user_id = $1', [userId]);
    rows.forEach(({ room_id }) => socket.join(room_id));

    socket.on('join_room', (roomId) => socket.join(roomId));

    socket.on('send_message', async ({ roomId, content, type = 'text' }) => {
      if (!roomId || !content?.trim()) return;
      try {
        const { rows: [member] } = await pool.query(
          'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2', [roomId, userId]
        );
        if (!member) return;

        const { rows: [message] } = await pool.query(
          'INSERT INTO messages (room_id, sender_id, content, type) VALUES ($1,$2,$3,$4) RETURNING *',
          [roomId, userId, content.trim(), type]
        );
        const { rows: [sender] } = await pool.query(
          'SELECT id, name, avatar_url FROM users WHERE id = $1', [userId]
        );
        io.to(roomId).emit('new_message', { ...message, sender });
      } catch (err) {
        console.error('send_message error:', err);
      }
    });

    socket.on('mark_read', async (roomId) => {
      await pool.query(
        'UPDATE room_members SET last_read_at = NOW() WHERE room_id = $1 AND user_id = $2',
        [roomId, userId]
      );
      socket.to(roomId).emit('message_read', { roomId, userId, readAt: new Date().toISOString() });
    });

    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('typing_indicator', { userId, roomId, isTyping });
    });

    socket.on('disconnect', async () => {
      await pool.query("UPDATE users SET status = 'offline' WHERE id = $1", [userId]);
      socket.broadcast.emit('user_offline', { userId });
    });
  });
}

module.exports = setupSocket;
