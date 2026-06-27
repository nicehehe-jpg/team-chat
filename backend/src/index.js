require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const setupSocket = require('./socket');

const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://192.168.219.100:3000',
  'http://192.168.219.100:8081',
  'http://192.168.123.146:8081',
];

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors({ origin: (origin, cb) => cb(null, true), credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/upload', require('./routes/upload'));

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.get('/health/db', async (_, res) => {
  const pool = require('./config/db');
  try {
    const result = await pool.query('SELECT NOW() as time, COUNT(*) as users FROM users');
    res.json({ status: 'ok', time: result.rows[0].time, users: result.rows[0].users });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

setupSocket(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
