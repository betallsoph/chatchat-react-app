# chatchat-react-app

Một ứng dụng React + TypeScript + Vite tối giản, hiển thị màn hình đăng nhập với kiểm tra form cơ bản và thông báo thành công inline.

## Chạy dự án

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build && npm run preview
```

## Ghi chú kỹ thuật
- Dùng `@vitejs/plugin-react-swc` cho Fast Refresh.
- Dọn dẹp dependency dư thừa và chuyển `vite` về bản chính thức.
- ESLint đã bật các rule cơ bản cho React Hooks và TypeScript.

### Gọi REST với Firebase ID token
Sử dụng helper có sẵn để tự động đính `Authorization: Bearer <ID_TOKEN>`:

```ts
import { fetchWithToken } from './src/utils/api';

const rooms = await fetchWithToken('/rooms');
const messages = await fetchWithToken('/messages');
```

Lưu ý:
- `VITE_API_BASE_URL` chỉ là origin, ví dụ `http://localhost:3000`.
- Server cần bật CORS với header `Authorization`.
