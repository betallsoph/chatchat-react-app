import { useEffect, useState } from 'react';
import { fetchRooms } from '../services/chatApi';
import { type ChatRoom } from '../types/chat';
import { Link } from 'react-router-dom';

export default function ChatList() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await fetchRooms();
        setRooms(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Không thể tải phòng chat';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <h2 style={{ marginBottom: 16 }}>Phòng chat</h2>
      {isLoading && <div>Đang tải…</div>}
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rooms.map((r) => (
          <li key={r.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
            <Link to={`/chat/${encodeURIComponent(r.id)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ fontWeight: 600 }}>{r.name}</div>
              {r.lastMessagePreview && (
                <div style={{ color: '#666', fontSize: 14 }}>{r.lastMessagePreview}</div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

