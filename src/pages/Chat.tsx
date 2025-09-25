import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { fetchWithToken } from '../utils/api';
import { createSocket, disconnectSocket } from '../utils/socket';
import type { Socket } from 'socket.io-client';

type ChatMessage = {
  _id: string;
  userId: string;
  displayName?: string;
  text: string;
  createdAt: string;
};

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [connecting, setConnecting] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;

  const currentUserId = user?.uid ?? '';

  const scrollToBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // Kết nối Socket và load tin nhắn phòng chung
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setConnecting(true);

        // Load lịch sử tin nhắn phòng chung
        const history = await fetchWithToken('/messages');
        if (isMounted) {
          setMessages(Array.isArray(history) ? history : (history?.data ?? history?.items ?? []));
          setTimeout(scrollToBottom, 0);
        }

        // Kết nối Socket
        let socketInstance = null;
        try {
          socketInstance = await createSocket();
          if (!isMounted) {
            disconnectSocket(socketInstance);
            return;
          }
          setSocket(socketInstance);
          console.log('Socket connected successfully');
        } catch (socketError) {
          console.error('Socket connection failed:', socketError);
          // Tiếp tục mà không có socket
        }

        // Lắng nghe tin nhắn mới (nếu socket có)
        if (socketInstance) {
          socketInstance.on('message:new', (msg: ChatMessage) => {
            if (!isMounted) return;
            setMessages(prev => [...prev, msg]);
            setTimeout(scrollToBottom, 0);
          });
        }

      } catch (err) {
        console.error('Failed to connect:', err);
      } finally {
        if (isMounted) setConnecting(false);
      }
    })();

    return () => {
      isMounted = false;
      if (socket) {
        disconnectSocket(socket);
        setSocket(null);
      }
    };
  }, []);

  const canSend = useMemo(() => input.trim().length > 0 && !!currentUserId, [input, currentUserId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSend called:', { canSend, socket: !!socket, input: input.trim() });
    
    if (!canSend) {
      console.log('Cannot send: input empty or not authenticated');
      return;
    }

    const text = input.trim();
    setInput('');

    if (socket) {
      console.log('Emitting message via socket:', { text });
      socket.emit('message:send', { text });
    } else {
      console.log('Socket not connected, message not sent:', { text });
      alert('Chưa kết nối được server. Vui lòng kiểm tra backend và thử lại.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Phòng chat</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {user?.displayName || user?.email || 'Bạn'}
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
        >
          Về trang chủ
        </button>
      </div>

      {/* Messages */}
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

      {/* Input */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #eee' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập tin nhắn…"
          style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
        />
        <button 
          type="submit" 
          disabled={!canSend} 
          style={{ 
            padding: '10px 14px', 
            borderRadius: 10, 
            border: 'none', 
            background: canSend ? '#667eea' : '#ccc', 
            color: 'white', 
            fontWeight: 600,
            cursor: canSend ? 'pointer' : 'not-allowed'
          }}
        >
          Gửi
        </button>
      </form>
    </div>
  );
}
