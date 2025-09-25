export type ChatRoom = {
  id: string;
  name: string;
  lastMessagePreview?: string;
  updatedAt?: string;
};

export type ChatMessage = {
  _id: string;
  roomId: string;
  senderUid: string;
  senderName?: string;
  text?: string;
  attachments?: Array<{ url: string; type: string }>;
  createdAt: string;
};

export type SendMessagePayload = {
  roomId: string;
  text: string;
};

export type JoinRoomPayload = {
  roomId: string;
};

export type ServerToClientEvents = {
  message: (message: ChatMessage) => void;
};

export type ClientToServerEvents = {
  join: (payload: JoinRoomPayload) => void;
  leave: (payload: JoinRoomPayload) => void;
  sendMessage: (payload: SendMessagePayload) => void;
};

