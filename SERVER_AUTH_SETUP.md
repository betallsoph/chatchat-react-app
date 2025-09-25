## Server Auth + Chat (Express + MongoDB + Socket.IO + Firebase Admin)

Tài liệu này hướng dẫn cấu hình server Node.js xác thực Firebase ID Token để lấy `uid`, phục vụ chat realtime qua Socket.IO và REST lấy lịch sử từ MongoDB.

### 1) Yêu cầu
- Node.js 18+
- MongoDB (Atlas hoặc local)
- Firebase project đã bật Authentication (Google, Email Link nếu dùng)

### 2) Biến môi trường (.env)
```bash
PORT=3000
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority

# Firebase Admin (Service Account JSON hoặc biến tách rời)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# CORS cho client (Vercel + local)
CLIENT_ORIGINS=https://your-app.vercel.app,http://localhost:5173
```
Lưu ý: nếu dùng CI/CD, hãy lưu PRIVATE_KEY với escape xuống dòng (`\n`) như trên.

### 3) Cài đặt
```bash
npm install express cors mongoose socket.io firebase-admin
```

### 4) Khởi tạo Firebase Admin
```ts
// src/firebaseAdmin.ts
import admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID as string;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL as string;
let privateKey = process.env.FIREBASE_PRIVATE_KEY as string;

// Hỗ trợ case key có \n dạng chuỗi env
if (privateKey?.includes('\\n')) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export default admin;
```

### 5) Mongoose Model tối giản
```ts
// src/models/Message.ts
import { Schema, model, type InferSchemaType } from 'mongoose';

const messageSchema = new Schema({
  userId: { type: String, required: true },
  displayName: { type: String },
  text: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() },
});

export type MessageDoc = InferSchemaType<typeof messageSchema> & { _id: any };
export const Message = model('Message', messageSchema);
```

### 6) Server Express + Socket.IO
```ts
// src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import admin from './firebaseAdmin';
import { Message } from './models/Message';

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});

// Verify ID token từ client (Socket.IO handshake)
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Unauthorized'));

    const decoded = await admin.auth().verifyIdToken(token);
    socket.data.user = {
      uid: decoded.uid,
      name: decoded.name,
      email: decoded.email,
      picture: decoded.picture,
    };
    next();
  } catch (err) {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.on('message:send', async ({ text }: { text: string }) => {
    const user = socket.data.user as { uid: string; name?: string; email?: string } | undefined;
    if (!user || typeof text !== 'string' || !text.trim()) return;

    const doc = await Message.create({
      userId: user.uid,
      displayName: user.name || user.email,
      text: text.trim(),
      createdAt: new Date(),
    });

    const payload = {
      _id: doc._id.toString(),
      userId: doc.userId,
      displayName: doc.displayName,
      text: doc.text,
      createdAt: doc.createdAt.toISOString(),
    };

    io.emit('message:new', payload);
  });
});

// REST: lấy lịch sử tin nhắn
app.get('/messages', async (_req, res) => {
  const items = await Message.find().sort({ createdAt: 1 }).limit(200).lean();
  res.json(
    items.map((m: any) => ({
      _id: m._id.toString(),
      userId: m.userId,
      displayName: m.displayName,
      text: m.text,
      createdAt: new Date(m.createdAt).toISOString(),
    }))
  );
});

async function bootstrap() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const port = Number(process.env.PORT || 3000);
  server.listen(port, () => console.log(`API listening on :${port}`));
}

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

### 7) Luồng xác thực từ Client
- Client lấy ID token Firebase và gửi qua `Socket.IO` bằng `auth: { token }` trong handshake.
- Server verify token để lấy `uid` rồi gán vào `socket.data.user`.
- Client emit `message:send` -> server lưu MongoDB -> `io.emit('message:new', payload)`.
- Client REST `GET /messages` để lấy lịch sử khi vào phòng chat.

### 8) CORS & Domain
- Thêm domain Vercel và localhost vào `CLIENT_ORIGINS`.
- Trong Firebase Authentication → Authorized domains: thêm domain Vercel của client.

### 9) Chạy local
```bash
npm run build && node dist/index.js # nếu dùng tsup/tsc
# hoặc nếu dùng ts-node-dev
npx ts-node-dev src/index.ts
```

### 10) Kiểm thử nhanh
- Lịch sử:
```bash
curl http://localhost:3000/messages
```
- Realtime: mở 2 tab client `/chat`, gửi tin và quan sát tab còn lại nhận `message:new`.

### 11) Bảo mật & vận hành
- Luôn verify ID token server-side, không tin cậy `uid` từ client.
- Hạn chế kích thước message, rate-limit theo `socket.data.user.uid`.
- Log audit: lưu `uid`, IP nếu cần điều tra abuse.
- Triển khai HTTPS trong production, kiểm soát CORS chặt chẽ.

### 12) Ghi chú triển khai
- Nếu deploy sau reverse proxy (Nginx), cho phép WebSocket upgrade (`Upgrade`, `Connection`).
- Nếu dùng serverless, đảm bảo nền tảng hỗ trợ WebSocket, hoặc tách Socket.IO ra dịch vụ riêng.

---
Nếu cần, tôi có thể cung cấp phiên bản JavaScript thuần (không TypeScript).


