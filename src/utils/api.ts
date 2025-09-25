import { getAuth } from 'firebase/auth';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function getIdToken(forceRefresh = false): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    // Đợi user sẵn sàng nếu chưa có
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        if (user) {
          user.getIdToken(forceRefresh).then(resolve).catch(reject);
        } else {
          reject(new Error('Not authenticated'));
        }
      });
    });
  }
  return user.getIdToken(forceRefresh);
}

export async function fetchWithToken(path: string, init: RequestInit = {}) {
  const token = await getIdToken();
  // Debug nhẹ trong dev
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[fetchWithToken] URL:', `${API_BASE_URL}${path}`, 'tokLen:', token.length);
  }
  
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[fetchWithToken] Response status:', res.status, 'Content-Type:', res.headers.get('content-type'));
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[fetchWithToken] Error response:', text);
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
    }
    
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      return res.json();
    } else {
      const text = await res.text();
      console.warn('[fetchWithToken] Non-JSON response:', text);
      return text;
    }
  } catch (error) {
    console.error('[fetchWithToken] Network error:', error);
    throw error;
  }
}


