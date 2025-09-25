import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchRoomMessages } from '../services/chatApi';
import { ensureSocketConnected, getSocket } from '../services/chatSocket';
import { type ChatMessage } from '../types/chat';
import { auth } from '../firebase';

export default function ChatRoom() {
  const { roomId = '' } = useParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [text, setText] = useState<string>('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const currentUid = auth.currentUser?.uid ?? '';

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages]);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await fetchRoomMessages(roomId, { limit: 50 });
        setMessages(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Không thể tải tin nhắn';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };
    if (roomId) void load();
  }, [roomId]);

  useEffect(() => {
    const connect = async () => {
      const socket = await ensureSocketConnected();
      socket.emit('join', { roomId });
      socket.on('message', (m) => {
        if (m.roomId === roomId) {
          setMessages((prev) => [...prev, m]);
        }
      });
    };
    if (roomId) void connect();
    return () => {
      const socket = getSocket();
      socket?.emit('leave', { roomId });
      socket?.off('message');
    };
  }, [roomId]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [sortedMessages.length]);

  const handleSend = () => {
    const socket = getSocket();
    const value = text.trim();
    if (!socket || !value) return;
    socket.emit('sendMessage', { roomId, text: value });
    setText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #eee' }}>
        <strong>Phòng: {roomId}</strong>
      </div>
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 12, background: '#fafafa' }}>
        {isLoading && <div>Đang tải…</div>}
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
        {sortedMessages.map((m) => {
          const isMine = m.senderUid === currentUid;
          return (
            <div key={m._id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
              <div style={{ maxWidth: '70%', background: isMine ? '#4f46e5' : 'white', color: isMine ? 'white' : '#111', border: '1px solid #eee', borderRadius: 12, padding: '8px 12px' }}>
                {m.senderName && !isMine && (
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{m.senderName}</div>
                )}
                {m.text && <div>{m.text}</div>}
                <div style={{ fontSize: 11, color: isMine ? 'rgba(255,255,255,0.8)' : '#888', marginTop: 4 }}>
                  {new Date(m.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #eee' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Nhập tin nhắn…"
          style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
        />
        <button onClick={handleSend} style={{ padding: '10px 12px', borderRadius: 10, border: 'none', background: '#4f46e5', color: 'white', fontWeight: 600 }}>
          Gửi
        </button>
      </div>
    </div>
  );
}

