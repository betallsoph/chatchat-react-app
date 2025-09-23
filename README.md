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
