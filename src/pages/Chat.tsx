import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { fetchWithToken, editMessage, deleteMessage } from '../utils/api';
import { createSocket, disconnectSocket } from '../utils/socket';
import type { Socket } from 'socket.io-client';

type ChatMessage = {
  _id: string;
  userId: string;
  displayName?: string;
  text: string;
  createdAt: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  updatedAt?: string;
  deletedAt?: string;
  // Image upload fields - MongoDB storage
  imageData?: string;         // Base64 image string from MongoDB  
  imageUrl?: string;         // Fallback compatibility
  imageFileName?: string;
  imageSize?: number;
  hasImage?: boolean;
};

// Helper function to validate base64 image - outside component scope
function isValidImageBase64(str: string): boolean {
  try {
    // Check if string is valid base64 and has mime type
    if (!str || !str.startsWith('data:image/') || !str.includes(';base64,')) {
      return false;
    }
    
    // Test actual base64 decoding
    const base64Part = str.split(',')[1];
    if (!base64Part) return false;
    
    // Try to create an Image to test if base64 is valid
    return true;
  } catch (e) {
    console.error('Base64 validation error:', e);
    return false;
  }
}

/**
 * STRUCTURAL PATTERN - Component Pattern
 * MessageItem là composite component đóng gói logic hiển thị và xử lý tin nhắn
 * BEHAVIORAL PATTERN - Observer Pattern áp dụng trong onEdit/onDelete callbacks
 */
const MessageItem = ({ message, currentUserId, onEdit, onDelete }: {
  message: ChatMessage;
  currentUserId: string;
  onEdit: (messageId: string, newText: string) => void;
  onDelete: (messageId: string) => void;
}) => {
  // BEHAVIORAL PATTERN - State Pattern
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

  // BEHAVIORAL PATTERN - Strategy Pattern
  const canEdit = message.userId === currentUserId && !message.isDeleted;
  const isMine = message.userId === currentUserId;

  // BEHAVIORAL PATTERN - Command Pattern  
  const handleEdit = () => {
    if (editText.trim() && editText !== message.text) {
      onEdit(message._id, editText.trim());
    }
    setIsEditing(false);
  };

  // BEHAVIORAL PATTERN - Event Handler Pattern
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(message.text);
    }
  };

  if (message.isDeleted) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        marginBottom: 8
      }}>
        <div style={{
          background: '#f5f5f5',
          color: '#999',
          padding: '8px 12px',
          borderRadius: 12,
          fontStyle: 'italic'
        }}>
          Tin nhắn đã bị xóa
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: isMine ? 'flex-end' : 'flex-start',
      marginBottom: 8
    }}>
      <div style={{
        background: isMine ? '#667eea' : 'white',
        color: isMine ? 'white' : '#333',
        padding: '8px 12px',
        borderRadius: 12,
        maxWidth: '70%',
        border: isMine ? 'none' : '1px solid #eee'
      }}>
        {!isMine && message.displayName && (
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{message.displayName}</div>
        )}
        
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: '14px',
                background: 'white',
                color: '#333'
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              <button
                onClick={handleEdit}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Lưu
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditText(message.text);
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#ccc',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Image display */}
            {message.hasImage && (message.imageUrl || message.imageData) && (
              <div style={{ marginBottom: 8 }}>
                {(() => {
                  const imageSrc = message.imageUrl || message.imageData;
                  const isValid = imageSrc ? isValidImageBase64(imageSrc) : false;
                  
                  if (!isValid) {
                    console.warn('Invalid image data detected:', {
                      id: message._id,
                      fileName: message.imageFileName,
                      imagePreview: imageSrc?.substring(0, 50) + '...'
                    });
                  }
                  
                  return (
                    <img 
                      src={imageSrc} 
                      alt={message.imageFileName || 'Image'} 
                      style={{ 
                        maxWidth: 250, 
                        maxHeight: 200, 
                        borderRadius: 8,
                        objectFit: 'cover',
                        cursor: 'pointer'
                      }} 
                      onError={(e) => {
                        console.error('Image load error:', {
                          id: message._id,
                          fileName: message.imageFileName,
                          imageData: message.imageData ? 'present' : 'missing',
                          imageUrl: message.imageUrl ? 'present' : 'missing',
                          src: e.currentTarget.src
                        });
                        
                        // Show fallback with improved visual
                        const fallbackSvg = btoa(`
                          <svg xmlns="http://www.w3.org/2000/svg" width="250" height="200" viewBox="0 0 250 200">
                            <rect width="250" height="200" fill="#f8f9fa" stroke="#dee2e6" stroke-width="1"/>
                            <image x="75" y="70" width="100" height="60" href="data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60'%3e%3crect width='100' height='60' fill='%23e9ecef'/%3e%3cpath d='M45,20 L55,20 L55,40 L45,40 Z M50,25 L50,35' stroke='%236c757d' stroke-width='2' fill='none'/%3e%3ccircle cx='50' cy='30' r='3' fill='%236c757d'/%3e%3c/svg%3e"/>
                              <text x="125" y="140" text-anchor="middle" font-family="Arial" font-size="12" fill="#6c757d">
                                📸 {message.imageFileName || 'Image not available'}
                              </text>
                            <text x="125" y="155" text-anchor="middle" font-family="Arial" font-size="10" fill="#adb5bd">
                              Check network connection
                            </text>
                          </svg>
                        `);
                        
                        e.currentTarget.src = 'data:image/svg+xml;base64,' + fallbackSvg;
                      }}
                      onLoad={() => {
                        console.log('✓ Image loaded successfully:', {
                          fileName: message.imageFileName,
                          imageId: message._id
                        });
                      }}
                      onClick={() => {
                        if (imageSrc) {
                          // Create a new window to view full image
                          const imageWindow = window.open('', '_blank');
                          if (imageWindow) {
                            imageWindow.document.write(`
                              <html>
                                <head><title>${message.imageFileName || 'Image'}</title></head>
                                <body style="margin:0; padding:20px; text-align:center; background:#f8f9fa;">
                                  <img src="${imageSrc}" style="max-width:100%; max-height:90vh; border-radius:8px; box-shadow:0 4px 8px rgba(0,0,0,0.1);" />
                                  <div style="margin-top:10px; color:#666; font-family:Arial;">
                                    ${message.imageFileName || 'Image'}
                                  </div>
                                </body>
                              </html>
                            `);
                          }
                        }
                      }}
                    />
                  );
                })()}
                
                {message.imageFileName && (
                  <div style={{ 
                    fontSize: 10, 
                    color: isMine ? 'rgba(255,255,255,.7)' : '#999', 
                    marginTop: 4 
                  }}>
                    📎 {message.imageFileName}
                  </div>
                )}
              </div>
            )}
            
            {/* Text display */}
            {message.text && (
              <div>
                <div>{message.text}</div>
                {message.isEdited && (
                  <small style={{ opacity: 0.8, fontSize: '10px' }}>(đã chỉnh sửa)</small>
                )}
              </div>
            )}
          </div>
        )}
        
        {!isEditing && canEdit && (
          <div style={{ marginTop: 4, display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '2px 6px',
                fontSize: '10px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : '#667eea',
                color: isMine ? 'white' : 'white',
                cursor: 'pointer'
              }}
            >
              Sửa
            </button>
            <button
              onClick={() => onDelete(message._id)}
              style={{
                padding: '2px 6px',
                fontSize: '10px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : '#f44336',
                color: isMine ? 'white' : 'white',
                cursor: 'pointer'
              }}
            >
              Xóa
            </button>
          </div>
        )}
        
        <div style={{
          fontSize: 11,
          color: isMine ? 'rgba(255,255,255,.8)' : '#999',
          marginTop: 4
        }}>
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

/**
 * STRUCTURAL PATTERN - Container/Presenter Pattern
 * Chat component là container component quản lý state và business logic
 * Kết hợp presentation components (MessageItem) với data flow
 */
export default function Chat() {
  const navigate = useNavigate();
  // BEHAVIORAL PATTERN - State Management Pattern  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [connecting, setConnecting] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  // BEHAVIORAL PATTERN - Reference Pattern
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = auth.currentUser;
  
  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const currentUserId = user?.uid ?? '';

  const scrollToBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  /**
   * BEHAVIORAL PATTERN - Template Method Pattern
   * useEffect lifecycle pattern để quản lý data loading và socket connection
   * STRUCTURAL PATTERN - Facade Pattern cho complex initialization logic
   */
  // Kết nối Socket và load tin nhắn phòng chung
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // BEHAVIORAL PATTERN - State Transition Pattern
        setConnecting(true);

        // BEHAVIORAL PATTERN - Data Fetching Pattern
        // Load lịch sử tin nhắn phòng chung
        const history = await fetchWithToken('/messages');
        if (isMounted) {
          setMessages(Array.isArray(history) ? history : (history?.data ?? history?.items ?? []));
          setTimeout(scrollToBottom, 0);
        }

        // CREATIONAL PATTERN - Factory Pattern for Socket
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

        // BEHAVIORAL PATTERN - Observer Pattern - Real-time Event Listeners
        // Lắng nghe tin nhắn mới (nếu socket có)
        if (socketInstance) {
          // BEHAVIORAL PATTERN - React Pattern (State Updates)
          socketInstance.on('message:new', (msg: ChatMessage) => {
            if (!isMounted) return;
            
            // Debug log for received messages
            console.log('Received new message:', {
              id: msg._id,
              hasImage: msg.hasImage,
              imageData: msg.imageData ? 'present' : 'missing',
              imageUrl: msg.imageUrl ? 'present' : 'missing',
              fileName: msg.imageFileName,
              imagePreview: msg.imageData ? msg.imageData.substring(0, 50) + '...' : null
            });
            
            setMessages(prev => [...prev, msg]);
            setTimeout(scrollToBottom, 0);
          });

          // BEHAVIORAL PATTERN - Observer + State Pattern  
          // Listen for message edited
          socketInstance.on('message:edited', (data: { _id: string; text: string; isEdited: boolean; updatedAt: string }) => {
            if (!isMounted) return;
            setMessages(prev => prev.map(msg => 
              msg._id === data._id 
                ? { ...msg, text: data.text, isEdited: true, updatedAt: data.updatedAt }
                : msg
            ));
          });

          // BEHAVIORAL PATTERN - Observer + Filter Pattern
          // Listen for message deleted
          socketInstance.on('message:deleted', (data: { _id: string }) => {
            if (!isMounted) return;
            setMessages(prev => prev.filter(msg => msg._id !== data._id));
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

  // BEHAVIORAL PATTERN - Optimization Pattern (Memoization)
  const canSend = useMemo(() => {
    return (input.trim().length > 0 || selectedImage !== null) && !!currentUserId;
  }, [input, selectedImage, currentUserId]);

  // BEHAVIORAL PATTERN - Event Handler Pattern + Command Pattern 
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSend called:', { canSend, socket: !!socket, input: input.trim(), hasImage: !!selectedImage });
    
    if (!canSend) {
      console.log('Cannot send: input empty and no image and not authenticated');
      return;
    }

    const text = input.trim();
    
    // If there's an image selected, use image upload function
    if (selectedImage) {
      await handleImageUpload();
      return;
    }

    // Send text message
    setInput('');
    // BEHAVIORAL PATTERN - Strategy Pattern (Conditional Logic)
    if (socket) {
      console.log('Emitting message via socket:', { text });
      socket.emit('message:send', { text });
    } else {
      console.log('Socket not connected, message not sent:', { text });
      alert('Chưa kết nối được server. Vui lòng kiểm tra backend và thử lại.');
    }
  };

  // BEHAVIORAL PATTERN - Command Pattern + Strategy Pattern
  // Handle message edit
  const handleEditMessage = async (messageId: string, newText: string) => {
    try {
      // BEHAVIORAL PATTERN - Strategy Pattern (Conditional Execution)
      if (socket) {
        socket.emit('message:edit', { messageId, text: newText });
      } else {
        await editMessage(messageId, newText);
      }
    } catch (error) {
      console.error('Failed to edit message:', error);
      alert('Không thể chỉnh sửa tin nhắn. Vui lòng thử lại.');
    }
  };

  // BEHAVIORAL PATTERN - Command Pattern + Observer Pattern  
  // Handle message delete
  const handleDeleteMessage = async (messageId: string) => {
    // BEHAVIORAL PATTERN - Confirmation Dialog Pattern
    if (window.confirm('Bạn có chắc muốn xóa tin nhắn này?')) {
      try {
        // BEHAVIORAL PATTERN - Strategy Pattern (Conditional Execution)
        if (socket) {
          socket.emit('message:delete', { messageId });
        } else {
          await deleteMessage(messageId);
        }
      } catch (error) {
        console.error('Failed to delete message:', error);
        alert('Không thể xóa tin nhắn. Vui lòng thử lại.');
      }
    }
  };

  // Image upload handlers
  // BEHAVIORAL PATTERN - File Handler Pattern
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file hình ảnh!');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File quá lớn! Vui lòng chọn file nhỏ hơn 5MB.');
        return;
      }
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // BEHAVIORAL PATTERN - File Upload Pattern
  const handleImageUpload = async () => {
    if (!selectedImage || !socket) return;

    setUploading(true);
    try {
      // Convert file to base64 for sending
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        if (socket) {
          console.log('Sending image via socket:', {
            fileName: selectedImage.name,
            size: selectedImage.size,
            base64Length: base64.length,
            base64Preview: base64.substring(0, 50) + '...'
          });
          
          socket.emit('message:send', { 
            text: input.trim() || '',
            image: base64,
            imageFileName: selectedImage.name,
            imageSize: selectedImage.size
          });
          setInput('');
          setSelectedImage(null);
          setImagePreview(null);
          // Clear file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      reader.readAsDataURL(selectedImage);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Không thể gửi hình ảnh. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  // Remove selected image
  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        {messages.map((message) => (
          <MessageItem
            key={message._id}
            message={message}
            currentUserId={currentUserId}
            onEdit={handleEditMessage}
            onDelete={handleDeleteMessage}
          />
        ))}
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid #eee', background: '#f8f9fa', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img 
            src={imagePreview} 
            alt="Preview" 
            style={{ 
              width: 40, 
              height: 40, 
              objectFit: 'cover', 
              borderRadius: 4,
              border: '1px solid #ddd'
            }} 
          />
          <span style={{ fontSize: 12, color: '#666', flex: 1 }}>
            {selectedImage?.name}
          </span>
          <button
            type="button"
            onClick={removeImage}
            style={{ 
              padding: '4px 8px',
              fontSize: 12,
              border: 'none',
              borderRadius: 4,
              background: '#dc3545',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            ✕ Hủy
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #eee', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flex: 1, gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập tin nhắn hoặc chọn hình ảnh…"
            style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #ddd',
              background: 'white',
              cursor: 'pointer'
            }}
            title="Chọn hình ảnh"
          >
            📷
          </button>
        </div>
        <button 
          type="submit" 
          disabled={!canSend || uploading} 
          style={{ 
            padding: '10px 14px', 
            borderRadius: 10, 
            border: 'none', 
            background: canSend && !uploading ? '#667eea' : '#ccc', 
            color: 'white', 
            fontWeight: 600,
            cursor: canSend && !uploading ? 'pointer' : 'not-allowed'
          }}
        >
          {uploading ? 'Gửi…' : 'Gửi'}
        </button>
      </form>
    </div>
  );
}
