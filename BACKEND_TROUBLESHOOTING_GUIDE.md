# Backend Troubleshooting Guide - Chatchat React Client

Tài liệu này mô tả chi tiết cách khắc phục các lỗi thường gặp khi tích hợp React client với Backend Express + MongoDB + Socket.IO.

## 1) Lỗi CORS (Cross-Origin Request Blocked)

### Triệu chứng
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at http://localhost:3000/messages. 
(Reason: CORS header 'Access-Control-Allow-Origin' missing). Status code: 204.
```

### Nguyên nhân
- Backend chưa cấu hình CORS đúng
- Thiếu header `Access-Control-Allow-Origin`
- Không xử lý preflight OPTIONS request

### Giải pháp
```js
// 1. Cài đặt cors
npm install cors

// 2. Cấu hình CORS cho REST API
const cors = require('cors');

app.use(cors({
  origin: ['http://localhost:5173', 'https://your-app.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true
}));

// 3. Xử lý OPTIONS preflight
app.options('*', cors());

// 4. Cấu hình CORS cho Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://your-app.vercel.app'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

### Kiểm tra
```bash
# Test CORS
curl -i -X OPTIONS http://localhost:3000/messages \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization,content-type"

# Phải thấy headers:
# Access-Control-Allow-Origin: http://localhost:5173
# Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
# Access-Control-Allow-Headers: Authorization,Content-Type
```

## 2) Lỗi "Missing Bearer token"

### Triệu chứng
- Server trả về 401 Unauthorized
- Log backend: "Missing Bearer token"

### Nguyên nhân
- Client không gửi header `Authorization: Bearer <token>`
- Token bị mất do redirect
- Proxy/Nginx strip header Authorization

### Giải pháp

#### Backend middleware
```js
// Middleware xác thực Firebase token
const admin = require('firebase-admin');

app.use('/api', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Bearer token' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      name: decoded.name,
      email: decoded.email
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

#### Nginx proxy (nếu có)
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### Kiểm tra
```bash
# Test với token
curl -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" http://localhost:3000/messages
```

## 3) Lỗi Socket.IO Connection Failed

### Triệu chứng
- Client console: "Failed to connect: TypeError: NetworkError"
- Socket không kết nối được

### Nguyên nhân
- Backend chưa khởi tạo Socket.IO
- CORS Socket.IO chưa đúng
- Port bị chặn

### Giải pháp
```js
// 1. Khởi tạo Socket.IO
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173'],
    credentials: true
  }
});

// 2. Middleware xác thực Socket.IO
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token provided'));
    
    const decoded = await admin.auth().verifyIdToken(token);
    socket.data.user = {
      uid: decoded.uid,
      name: decoded.name,
      email: decoded.email
    };
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

// 3. Xử lý events
io.on('connection', (socket) => {
  console.log('User connected:', socket.data.user.uid);
  
  socket.on('message:send', async ({ text }) => {
    const user = socket.data.user;
    // Lưu vào MongoDB
    const message = await Message.create({
      userId: user.uid,
      displayName: user.name || user.email,
      text,
      createdAt: new Date()
    });
    
    // Gửi cho tất cả clients
    io.emit('message:new', {
      _id: message._id.toString(),
      userId: message.userId,
      displayName: message.displayName,
      text: message.text,
      createdAt: message.createdAt.toISOString()
    });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.data.user.uid);
  });
});
```

## 4) Lỗi MongoDB Connection

### Triệu chứng
- Server crash khi khởi động
- "MongoServerError: connection failed"

### Giải pháp
```js
// 1. Cấu hình MongoDB connection
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();
```

### Kiểm tra
```bash
# Test MongoDB connection
mongosh "mongodb://localhost:27017/chatchat"
```

## 5) Lỗi Firebase Admin SDK

### Triệu chứng
- "Firebase Admin SDK not initialized"
- "Invalid service account key"

### Giải pháp
```js
// 1. Cài đặt Firebase Admin
npm install firebase-admin

// 2. Khởi tạo với service account
const admin = require('firebase-admin');

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

### Biến môi trường (.env)
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 6) Lỗi Port đã được sử dụng

### Triệu chứng
- "EADDRINUSE: address already in use :::3000"

### Giải pháp
```bash
# Tìm process đang dùng port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Hoặc dùng port khác
PORT=3001 npm start
```

## 7) Lỗi 404 khi reload trang (Production)

### Triệu chứng
- Reload trang bất kỳ → 404 Not Found
- Chỉ có `/` hoạt động

### Giải pháp
```js
// Express fallback cho SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
```

## 8) Checklist Debugging

### Kiểm tra Backend
- [ ] Server có chạy trên đúng port không?
- [ ] CORS đã cấu hình đúng chưa?
- [ ] Firebase Admin SDK đã khởi tạo chưa?
- [ ] MongoDB đã kết nối chưa?
- [ ] Socket.IO đã khởi tạo chưa?

### Kiểm tra Client
- [ ] `.env` có đúng `VITE_API_BASE_URL` không?
- [ ] Firebase config có đúng không?
- [ ] User đã đăng nhập chưa?
- [ ] Console có lỗi gì không?

### Test Commands
```bash
# 1. Test server health
curl http://localhost:3000/health

# 2. Test CORS
curl -H "Origin: http://localhost:5173" http://localhost:3000/messages

# 3. Test với token
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/messages

# 4. Test Socket.IO
# Mở browser console và chạy:
# const socket = io('http://localhost:3000', { auth: { token: 'YOUR_TOKEN' } });
```

## 9) Log Debugging

### Backend logging
```js
// Thêm log chi tiết
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    headers: req.headers,
    body: req.body
  });
  next();
});

// Socket.IO logging
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id, socket.data.user);
  
  socket.on('message:send', (data) => {
    console.log('Received message:', data);
  });
});
```

### Client logging
```js
// Trong Chat.tsx
console.log('Socket status:', socket?.connected);
console.log('User:', user);
console.log('Can send:', canSend);
```

## 10) Common Issues & Solutions

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| CORS error | Thiếu CORS config | Thêm cors middleware |
| 401 Unauthorized | Thiếu Bearer token | Kiểm tra Authorization header |
| Socket connection failed | CORS Socket.IO sai | Cấu hình cors cho Socket.IO |
| MongoDB connection failed | URI sai hoặc DB down | Kiểm tra MONGO_URI |
| Firebase token invalid | Service account sai | Kiểm tra private key format |
| 404 on reload | Thiếu SPA fallback | Thêm `app.get('*', ...)` |

---

**Lưu ý:** Sau khi sửa bất kỳ cấu hình nào, nhớ restart server và reload client để áp dụng thay đổi.
