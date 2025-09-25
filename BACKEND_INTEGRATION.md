# Backend Integration Guide (Node.js + MongoDB) for Chat Rooms

This document specifies the HTTP and Socket.IO contracts used by the frontend (Vite + React + Firebase Auth). It also includes suggested MongoDB schemas.

Important: The frontend authenticates with Firebase. It will send a Firebase ID token in:
- HTTP: Authorization: Bearer <idToken>
- Socket.IO: auth.token = <idToken>
You must verify this token on the backend using Firebase Admin SDK and derive user identity (uid, email, name, photoURL).

## Environment variables expected by frontend
- VITE_API_BASE_URL: Base URL for HTTP API (e.g., `https://api.example.com`)
- VITE_SOCKET_URL: Socket server URL (e.g., `https://api.example.com`)

## HTTP API

Base header on all requests: `Authorization: Bearer <FirebaseIdToken>`

1) GET `/rooms`
- Response 200: Array<ChatRoom>
  - ChatRoom: `{ id: string, name: string, lastMessagePreview?: string, updatedAt?: string }`
- Behavior: Return rooms that the current user (decoded uid) can access.

2) GET `/rooms/:roomId/messages`
- Query params:
  - `before?`: ISO timestamp to paginate backwards
  - `limit?`: number (default 50)
- Response 200: Array<ChatMessage>
  - ChatMessage:
    - `_id: string`
    - `roomId: string`
    - `senderUid: string`
    - `senderName?: string`
    - `text?: string`
    - `attachments?: Array<{ url: string, type: string }>`
    - `createdAt: string`
- Behavior: Return messages in any order; frontend will sort ascending by `createdAt` for display.

3) POST `/rooms/direct`
- Body: `{ participantUid: string }`
- Response 200: `ChatRoom` (existing direct room or newly created)
- Behavior: Create or retrieve a 1-1 room between current user and participant.

## Socket.IO
Namespace: default (`/`) is fine.

Client connects with: `io(VITE_SOCKET_URL, { auth: { token: <idToken> } })`

Events expected by client:
- Client -> Server
  - `join`: `{ roomId: string }`
  - `leave`: `{ roomId: string }`
  - `sendMessage`: `{ roomId: string, text: string }`

- Server -> Client
  - `message`: `ChatMessage` (type above)

Server responsibilities:
- On connection, verify Firebase ID token. Attach user info to socket (`socket.user = { uid, name, email, picture }`). Disconnect if invalid.
- `join`: authorize user for `roomId`; join socket to room; optional: emit backlog or rely on HTTP for history.
- `leave`: leave room.
- `sendMessage`: authorize user for room; create message in MongoDB; emit `message` to the room (`io.to(roomId).emit('message', msg)`).

## Suggested MongoDB schemas

Collections: `rooms`, `messages` (you may also maintain a `memberships` collection or embed `members` in rooms).

Room document (`rooms`):
```
{
  _id: ObjectId,
  name: string,
  type: 'group' | 'direct',
  members: string[],          // array of user uids
  createdAt: Date,
  updatedAt: Date,
  lastMessagePreview?: string
}
```

Message document (`messages`):
```
{
  _id: ObjectId,
  roomId: ObjectId | string,
  senderUid: string,
  senderName?: string,
  text?: string,
  attachments?: [{ url: string, type: string }],
  createdAt: Date
}
```

Indexes:
- `messages`: `{ roomId: 1, createdAt: -1 }`
- `rooms`: `{ updatedAt: -1 }`
- `rooms.members`: `1` (for user room lookup)

## Auth: Firebase Admin verification

Express middleware example:
```js
const admin = require('firebase-admin');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

Socket.IO auth example:
```js
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Missing token'));
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    socket.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    };
    next();
  } catch (e) {
    next(new Error('Invalid token'));
  }
});
```

## Sample endpoints

GET `/rooms`
```js
app.get('/rooms', authMiddleware, async (req, res) => {
  const uid = req.user.uid;
  const rooms = await db.collection('rooms')
    .find({ members: uid })
    .sort({ updatedAt: -1 })
    .toArray();
  const payload = rooms.map(r => ({
    id: String(r._id),
    name: r.name,
    lastMessagePreview: r.lastMessagePreview,
    updatedAt: r.updatedAt?.toISOString(),
  }));
  res.json(payload);
});
```

GET `/rooms/:roomId/messages`
```js
app.get('/rooms/:roomId/messages', authMiddleware, async (req, res) => {
  const uid = req.user.uid;
  const roomId = req.params.roomId;
  const room = await db.collection('rooms').findOne({ _id: toObjectId(roomId), members: uid });
  if (!room) return res.status(403).json({ error: 'Forbidden' });

  const before = req.query.before ? new Date(String(req.query.before)) : null;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const query = { roomId: String(room._id) };
  if (before) query.createdAt = { $lt: before };

  const items = await db.collection('messages')
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const payload = items.map(m => ({
    _id: String(m._id),
    roomId: String(m.roomId),
    senderUid: m.senderUid,
    senderName: m.senderName,
    text: m.text,
    attachments: m.attachments,
    createdAt: m.createdAt.toISOString(),
  }));
  res.json(payload);
});
```

POST `/rooms/direct`
```js
app.post('/rooms/direct', authMiddleware, async (req, res) => {
  const uid = req.user.uid;
  const other = String(req.body.participantUid);
  if (!other) return res.status(400).json({ error: 'participantUid required' });

  // Find existing direct room
  let room = await db.collection('rooms').findOne({ type: 'direct', members: { $all: [uid, other], $size: 2 } });
  if (!room) {
    const now = new Date();
    const result = await db.collection('rooms').insertOne({
      name: 'Direct Chat',
      type: 'direct',
      members: [uid, other],
      createdAt: now,
      updatedAt: now,
    });
    room = await db.collection('rooms').findOne({ _id: result.insertedId });
  }
  res.json({ id: String(room._id), name: room.name, updatedAt: room.updatedAt?.toISOString() });
});
```

Socket handlers
```js
io.on('connection', (socket) => {
  socket.on('join', async ({ roomId }) => {
    const room = await db.collection('rooms').findOne({ _id: toObjectId(roomId), members: socket.user.uid });
    if (!room) return;
    socket.join(roomId);
  });

  socket.on('leave', ({ roomId }) => {
    socket.leave(roomId);
  });

  socket.on('sendMessage', async ({ roomId, text }) => {
    if (!text || !text.trim()) return;
    const room = await db.collection('rooms').findOne({ _id: toObjectId(roomId), members: socket.user.uid });
    if (!room) return;

    const now = new Date();
    const message = {
      roomId: String(room._id),
      senderUid: socket.user.uid,
      senderName: socket.user.name,
      text: text.trim(),
      createdAt: now,
    };
    const result = await db.collection('messages').insertOne(message);

    await db.collection('rooms').updateOne({ _id: room._id }, { $set: { updatedAt: now, lastMessagePreview: message.text } });

    const payload = {
      _id: String(result.insertedId),
      roomId: String(room._id),
      senderUid: message.senderUid,
      senderName: message.senderName,
      text: message.text,
      createdAt: now.toISOString(),
    };
    io.to(roomId).emit('message', payload);
  });
});
```

## Does the app send uid to backend?
- Yes, indirectly. The frontend sends a Firebase ID token over HTTP and Socket.IO. The backend should verify it and derive `uid` from the token. The frontend does not send raw `uid` in headers; it uses the ID token. If you need the uid explicitly, derive it server-side after verification.

## Notes
- Timezones: use ISO strings.
- Pagination: use `before` param; return most recent first or any order; client sorts for display.
- Security: always check membership before returning messages or accepting sends.
- Ensure CORS and Socket.IO origins allow the frontend origin.