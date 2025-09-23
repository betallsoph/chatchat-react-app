import { type FC, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '../firebase';

const Home: FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut(auth);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: 20
    }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 32, width: '100%', maxWidth: 720 }}>
        <h1 style={{ marginBottom: 8 }}>Xin chào{currentUser?.displayName ? `, ${currentUser.displayName}` : ''}!</h1>
        <p style={{ color: '#555', marginBottom: 24 }}>Bạn đã đăng nhập thành công.</p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: 16,
          border: '1px solid #eee', borderRadius: 12, marginBottom: 24
        }}>
          {currentUser?.photoURL && (
            <img src={currentUser.photoURL} alt="avatar" width={48} height={48} style={{ borderRadius: '50%' }} />
          )}
          <div style={{ lineHeight: 1.4 }}>
            <div style={{ fontWeight: 600 }}>{currentUser?.email ?? 'Ẩn danh'}</div>
            {currentUser?.uid && <div style={{ color: '#888', fontSize: 12 }}>UID: {currentUser.uid}</div>}
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          style={{
            padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #ff6a88 0%, #ff99ac 100%)', color: 'white', fontWeight: 600
          }}
        >
          {isSigningOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
        </button>
      </div>
    </div>
  );
};

export default Home;


