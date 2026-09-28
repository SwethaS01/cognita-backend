require('dotenv').config();
const express = require('express'), cors = require('cors'), http = require('http'), path = require('path'), fs = require('fs');
const { Server } = require('socket.io');
const connectDB = require('./config/db'), error = require('./middleware/error');
const Conversation = require('./models/Conversation'), Message = require('./models/Message');
const ensureAdmin = require('./utils/ensureAdmin'), syncRoles = require('./utils/syncRoles');

const isProd = process.env.NODE_ENV === 'production';
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_this_secret')) {
  console.error('JWT_SECRET must be set to a long random value in production.'); process.exit(1);
}

// Local dev origins + CLIENT_URL. In production the frontend is served by this same server,
// so any request whose Origin host equals the Host header (same-origin) is allowed too.
const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5173'].filter(Boolean);
const corsDelegate = (req, cb) => {
  const origin = req.headers.origin;
  let ok = !origin || allowedOrigins.includes(origin);
  if (!ok) { try { ok = new URL(origin).host === req.headers.host; } catch (_) {} }
  cb(null, { origin: ok, credentials: true });
};

connectDB()
  .then(async () => { await ensureAdmin(); await syncRoles(); })
  .catch(e => { console.error('MongoDB connection failed. Check MONGO_URI (and Atlas network access).'); console.error(e.message); process.exit(1); });

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, methods: ['GET', 'POST'] } });
app.use(cors(corsDelegate));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/doubts', require('./routes/doubts'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/experiences', require('./routes/experiences'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/connections', require('./routes/connections'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/files', require('./routes/files'));
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));

// Serve the built React app (frontend/dist) from the same server -> one URL to host & share
const dist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const online = new Map();
io.on('connection', socket => {
  socket.on('join', id => { online.set(id, socket.id); socket.join(id); });
  socket.on('message', async data => {
    try {
      const c = await Conversation.findOne({ _id: data.conversation, participants: data.sender });
      if (!c) throw new Error('Conversation not found');
      const m = await Message.create({ conversation: c._id, sender: data.sender, text: String(data.text || '').trim() });
      c.lastMessage = data.text; await c.save();
      io.to(data.conversation).emit('message', await m.populate('sender', 'name role'));
    } catch (e) { socket.emit('chatError', { message: e.message }); }
  });
  socket.on('joinConversation', id => socket.join(id));
  socket.on('disconnect', () => { for (const [k, v] of online) if (v === socket.id) online.delete(k); });
});

app.use(error);
server.listen(process.env.PORT || 5000, () => console.log('API running on ' + (process.env.PORT || 5000)));
