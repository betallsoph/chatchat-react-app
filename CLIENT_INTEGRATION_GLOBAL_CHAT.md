## React Client Integration - Global Chat (Firebase Auth)

Mục tiêu: Kết nối React client với backend Global Chat đã bật Firebase Auth, REST `/messages`, và Socket.IO `message:send` → `message:new`.

### 1) Biến môi trường client
```bash
VITE_API_BASE_URL=http://localhost:3000
```

### 2) Lấy Firebase ID token (bắt buộc)
```ts
import { getAuth } from 'firebase/auth';

export async function getIdTokenOrThrow() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not signed in');
  return await user.getIdToken();
}
```

### 3) REST: lấy lịch sử tin nhắn
```ts
export async function fetchMessages() {
  const token = await getIdTokenOrThrow();
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/messages`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Array<{
    _id: string; userId: string; displayName?: string; text: string; createdAt: string;
  }>;
}
```

### 4) Socket.IO: gửi/nhận tin nhắn
```ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export async function connectSocket() {
  const token = await getIdTokenOrThrow();
  socket = io(import.meta.env.VITE_API_BASE_URL!, {
    transports: ['websocket'],
    auth: { token },
  });
  socket.on('connect', () => console.log('socket connected'));
  socket.on('message:new', (msg) => console.log('message:new', msg));
  socket.on('connect_error', (e) => console.error('socket connect_error', e?.message));
  return socket;
}

export function sendMessage(text: string) {
  if (!socket || !socket.connected) throw new Error('Socket not connected');
  socket.emit('message:send', { text });
}
```

### 5) UI tích hợp nhanh (Chat.tsx – pseudo)
```tsx
useEffect(() => {
  fetchMessages().then(setMessages).catch(console.error);
  connectSocket().catch(console.error);
}, []);

const onSend = () => {
  sendMessage(input);
  setInput('');
};
```

### 6) Checklist nếu lỗi CORS/Network
- Kiểm tra Origin đang chạy: `http://localhost:5173`
- Gọi thử:
```bash
curl -i -X OPTIONS http://localhost:3000/messages \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization,content-type"

curl -i http://localhost:3000/messages \
  -H "Origin: http://localhost:5173" \
  -H "Authorization: Bearer <ID_TOKEN>"
```
- Kỳ vọng response có: `Access-Control-Allow-Origin: http://localhost:5173`
- Đảm bảo client KHÔNG dùng `credentials: 'include'` (không cần cookie)
- Socket phải khởi tạo với `{ transports: ['websocket'], auth: { token } }`

### 7) Shape dữ liệu
- REST `/messages` và event `message:new` trả về: `{ _id, userId, displayName?, text, createdAt }` (ISO date string)

---
Nếu vẫn gặp lỗi, gửi giúp: request/response headers, log console, và đoạn code fetch/socket hiện tại.


