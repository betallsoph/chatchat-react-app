import { useEffect, useMemo, useRef, useState } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { ensureSocketConnected, getSocket, disconnectSocket } from '../services/socket';

type ChatMessage = {
  _id: string;
  userId: string;
  displayName?: string;
  text: string;
  createdAt: string; // ISO string
};

const SERVER_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const DEFAULT_ROOM = import.meta.env.VITE_CHAT_ROOM as string | undefined; // tuỳ chọn

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadError, setLoadError] = useState<string>('');
  const [input, setInput] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;

  const currentUserId = user?.uid ?? '';

  const scrollToBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setConnecting(true);
        await ensureSocketConnected(SERVER_URL);
        const socket = getSocket();
        if (!socket) return;

        // Nhận lịch sử ban đầu qua REST (yêu cầu Authorization: Bearer <ID_TOKEN>)
        const idToken = await auth.currentUser?.getIdToken();
        const headers = idToken ? { Authorization: `Bearer ${idToken}` } : undefined;
        const url = DEFAULT_ROOM
          ? `${SERVER_URL}/api/chat/messages/${encodeURIComponent(DEFAULT_ROOM)}`
          : `${SERVER_URL}/messages`;
        fetch(url, { headers })
          .then(async (r) => {
            if (!r.ok) {
              throw new Error(`HTTP ${r.status}`);
            }
            const raw = await r.json();
            // Chấp nhận nhiều dạng: [..] hoặc { data: [...] } hoặc { items: [...] }
            const arrayLike = Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);
            if (!Array.isArray(arrayLike)) throw new Error('Invalid response shape');
            return arrayLike as ChatMessage[];
          })
          .then((data) => {
            if (!isMounted) return;
            setMessages(data);
            setTimeout(scrollToBottom, 0);
          })
          .catch((err) => {
            if (!isMounted) return;
            console.warn('Load history failed', err);
            setLoadError('Không tải được lịch sử tin nhắn');
          });

        socket.on('message:new', (msg: ChatMessage) => {
          if (!isMounted) return;
          setMessages((prev) => [...prev, msg]);
          setTimeout(scrollToBottom, 0);
        });

      } finally {
        if (isMounted) setConnecting(false);
      }
    })();
    return () => {
      isMounted = false;
      disconnectSocket();
    };
  }, []);

  const canSend = useMemo(() => input.trim().length > 0 && !!currentUserId, [input, currentUserId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    const socket = getSocket();
    if (!socket) return;
    const payload = { text: input.trim() };
    socket.emit('message:send', payload);
    setInput('');
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      // (Tuỳ chọn) gọi REST logout nếu server có
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          await fetch(`${SERVER_URL}/api/auth/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch {}
      await signOut(auth);
      disconnectSocket();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontWeight: 700 }}>Chat</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ color: '#666', fontSize: 14 }}>
            {user?.displayName || user?.email || 'Bạn'}
          </div>
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
          >
            {isSigningOut ? 'Đang thoát…' : 'Đăng xuất'}
          </button>
        </div>
      </div>

      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#fafafa' }}>
        {connecting && <div style={{ color: '#888', textAlign: 'center', padding: 12 }}>Đang kết nối…</div>}
        {messages.map((m) => {
          const isMine = m.userId === currentUserId;
          return (
            <div key={m._id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
              <div style={{
                background: isMine ? '#667eea' : 'white',
                color: isMine ? 'white' : '#333',
                padding: '8px 12px',
                borderRadius: 12,
                maxWidth: '70%',
                border: isMine ? 'none' : '1px solid #eee'
              }}>
                {!isMine && m.displayName && (
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{m.displayName}</div>
                )}
                <div>{m.text}</div>
                <div style={{ fontSize: 11, color: isMine ? 'rgba(255,255,255,.8)' : '#999', marginTop: 4 }}>
                  {new Date(m.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #eee' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập tin nhắn…"
          style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
        />
        <button type="submit" disabled={!canSend} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#667eea', color: 'white', fontWeight: 600 }}>
          Gửi
        </button>
      </form>
    </div>
  );
}


