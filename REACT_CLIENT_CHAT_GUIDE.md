## React Client Guide: Auth, Chat Realtime, Lịch sử tin nhắn

Tài liệu này hướng dẫn frontend (React) kết nối backend này qua Firebase Auth + Socket.IO và REST để đồng bộ tin nhắn.

### 1) Xác thực (Firebase Web SDK)
- Sau khi người dùng đăng nhập Firebase (Google/Email), lấy ID token:
```ts
const idToken = await user.getIdToken();
```
- Với Socket.IO: luôn gắn token trong handshake.
  - Socket.IO handshake: `io(API_BASE_URL, { auth: { token: ID_TOKEN } })`
- Với REST: khuyến nghị gắn `Authorization: Bearer <ID_TOKEN>` (an toàn hơn). Ở client hiện tại, request lịch sử mẫu không gắn header; bạn có thể bật xác thực cho REST và thêm header này.

### 2) Realtime qua Socket.IO
- Kết nối socket sau khi có `idToken`:
```ts
import { io } from 'socket.io-client';
const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000', {
  auth: { token: await user.getIdToken() }
});
```

Có 2 luồng sự kiện (có thể dùng 1 trong 2, hoặc cả hai):

1) Chat theo phòng (room) – phù hợp UI nhiều phòng:
- Join phòng (ví dụ `general`):
```ts
socket.emit('join_room', { username: user.displayName || user.email || 'User', room: 'general' });
```
- Gửi tin:
```ts
socket.emit('send_message', { room: 'general', username: displayName, message: text });
```
- Lắng nghe:
```ts
socket.on('receive_message', (msg) => { /* { username, message, room, uid?, timestamp } */ });
socket.on('load_messages', (list) => { /* danh sách 50 tin gần nhất của phòng */ });
socket.on('user_joined', (info) => { /* thông báo join */ });
socket.on('user_typing', (info) => { /* typing indicator */ });
```

2) Kênh đơn giản – phù hợp với code hiện tại (`message:send` / `message:new`):
- Gửi tin: `socket.emit('message:send', { text })`
- Nhận tin: `socket.on('message:new', (payload) => { /* { _id, userId, displayName, text, createdAt } */ })`

Lưu ý: Backend sẽ gắn `uid` từ Firebase vào socket và lưu cùng tin nhắn.

### 3) REST APIs (lấy lịch sử)
1) Lịch sử chung (yêu cầu token):
```
GET /messages
Headers: Authorization: Bearer <ID_TOKEN>
Response: [{ _id, userId, displayName, text, createdAt }]
```

2) Lịch sử theo phòng (nếu dùng room):
```
GET /api/chat/messages/:room
Headers: Authorization: Bearer <ID_TOKEN>
Response: [{ username, message, room, uid?, createdAt, _id }]
```

3) Thông tin tài khoản (và upsert vào DB):
```
GET /api/auth/me
Headers: Authorization: Bearer <ID_TOKEN>
```

4) Logout (đánh dấu offline trong DB):
```
POST /api/auth/logout
Headers: Authorization: Bearer <ID_TOKEN>
```

### 4) Gợi ý kiến trúc React
- Tạo `AuthProvider` quản lý `user` và `idToken`.
- Tạo `SocketProvider` khởi tạo socket sau khi có `user` và `idToken`.
- Trang `Chat`:
  - Khi mount: gọi `GET /messages` (hoặc `/api/chat/messages/:room`) để lấy lịch sử.
  - Subscribe socket cho `message:new` hoặc `receive_message`.
  - On submit: `message:send` (hoặc `send_message` với phòng).

Pseudo-code tối giản:
```ts
// Lấy lịch sử (không header, theo code hiện tại)
const res = await fetch(`${API_BASE}/messages`);
const history = await res.json();
setMessages(history);

// Socket
const s = io(API_BASE, { auth: { token: idToken } });
s.on('message:new', (m) => setMessages(prev => [...prev, m]));

// Gửi tin
s.emit('message:send', { text });

// (Tùy chọn) Nếu dùng room-based API
// s.emit('join_room', { username, room: 'general' });
// s.on('receive_message', (m) => setMessages(prev => [...prev, m]));
// s.emit('send_message', { room: 'general', username, message: text });
```

### 5) CORS & cấu hình môi trường
- Backend dùng `CLIENT_ORIGINS` để whitelist domain frontend (VD: `http://localhost:5173`).
- React nên có `VITE_API_BASE_URL` trỏ về API (VD: `http://localhost:3000`).

### 6) Lưu ý bảo mật & UX
- Luôn gửi ID token mới (Firebase sẽ tự refresh). Gọi `await user.getIdToken(true)` nếu cần bắt buộc refresh.
- Hiển thị “my message” bằng so sánh `msg.userId === user.uid` (đối với kênh `message:new`) hoặc `msg.uid === user.uid` (đối với kênh room).
- Sanitize nội dung text khi render.


