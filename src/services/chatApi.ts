import axios from 'axios';
import { auth } from '../firebase';
import { type ChatMessage, type ChatRoom } from '../types/chat';

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured');
  }
  return baseUrl.replace(/\/$/, '');
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const currentUser = auth.currentUser;
  const headers: Record<string, string> = {};
  if (currentUser) {
    const idToken = await currentUser.getIdToken();
    headers.Authorization = `Bearer ${idToken}`;
  }
  return headers;
}

export async function fetchRooms(): Promise<ChatRoom[]> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();
  const res = await axios.get(`${baseUrl}/rooms`, { headers });
  return res.data as ChatRoom[];
}

export async function fetchRoomMessages(roomId: string, params?: { before?: string; limit?: number }): Promise<ChatMessage[]> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();
  const res = await axios.get(`${baseUrl}/rooms/${encodeURIComponent(roomId)}/messages`, {
    headers,
    params,
  });
  return res.data as ChatMessage[];
}

export async function createOrGetDirectRoom(participantUid: string): Promise<ChatRoom> {
  const baseUrl = getApiBaseUrl();
  const headers = await getAuthHeaders();
  const res = await axios.post(`${baseUrl}/rooms/direct`, { participantUid }, { headers });
  return res.data as ChatRoom;
}

