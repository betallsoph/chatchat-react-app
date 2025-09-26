import { getAuth } from 'firebase/auth';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * CREATIONAL PATTERN - Static Factory Method Pattern
 * Hàm utility tạo và quản lý tokens một cách tập trung
 * Đóng gói logic authentication complex và caching
 */
export async function getIdToken(forceRefresh = false): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    // BEHAVIORAL PATTERN - Promise Pattern
    // Đợi user sẵn sàng nếu chưa có - async/await flow
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

/**
 * STRUCTURAL PATTERN - Facade Pattern  
 * Cung cấp interface higher-level, đơn giản cho việc gọi API
 * Đóng gói authentication logic, error handling, response parsing
 */
export async function fetchWithToken(path: string, init: RequestInit = {}) {
  const token = await getIdToken();
  // Debug nhẹ trong dev
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[fetchWithToken] URL:', `${API_BASE_URL}${path}`, 'tokLen:', token.length);
  }
  
  // BEHAVIORAL PATTERN - Template Method Pattern
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
      // BEHAVIORAL PATTERN - Strategy Pattern
      const text = await res.text().catch(() => '');
      console.error('[fetchWithToken] Error response:', text);
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
    }
    
    // BEHAVIORAL PATTERN - Strategy Pattern - Response parsing
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

/**
 * CREATIONAL PATTERN - Simple Factory Pattern  
 * API functions cho message operations
 * Đóng gói HTTP method và payload logic
 */
// Edit message function
export async function editMessage(messageId: string, newText: string) {
  return fetchWithToken(`/messages/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify({ text: newText }),
  });
}

// Delete message function
export async function deleteMessage(messageId: string) {
  return fetchWithToken(`/messages/${messageId}`, {
    method: 'DELETE',
  });
}


