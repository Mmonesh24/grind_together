import { useEffect, useState, useRef } from 'react';
import useAuthStore from '../../store/authStore';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import './Chat.css';

const BRANCHES = ['Downtown', 'Uptown', 'Westside', 'Eastside', 'Central'];

export default function Chat() {
  const { user } = useAuthStore();
  const [room, setRoom] = useState(user?.profile?.gymBranch || BRANCHES[0]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  // Fetch message history
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/chat/${room}?limit=50`);
        setMessages(data.data);
      } catch {}
      setLoading(false);
    };
    fetchHistory();
  }, [room]);

  // Listen for new messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit('chat:join', { roomId: room });

    const handleMessage = (msg) => {
      if (msg.roomId === room) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('chat:message', handleMessage);
    return () => socket.off('chat:message', handleMessage);
  }, [room]);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    const socket = getSocket();
    if (!socket || !input.trim()) return;

    socket.emit('chat:message', { roomId: room, message: input.trim() });
    setInput('');
  };

  return (
    <div className="chat-page page-enter">
      <div className="chat-sidebar">
        <h3 className="chat-sidebar__title">💬 Rooms</h3>
        {BRANCHES.map((b) => (
          <button
            key={b}
            className={`chat-room-btn ${room === b ? 'active' : ''}`}
            onClick={() => setRoom(b)}
          >
            <span className="chat-room-btn__icon">🏢</span>
            <span>{b}</span>
          </button>
        ))}
      </div>

      <div className="chat-main">
        <div className="chat-header">
          <h2>#{room}</h2>
          <span className="chat-header__sub">Branch chat room</span>
        </div>

        <div className="chat-messages">
          {loading ? (
            <p className="empty-state">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="empty-state">No messages yet. Start the conversation!</p>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.senderId?.toString() === user?.id;
              return (
                <div key={msg._id || i} className={`chat-bubble ${isMe ? 'me' : ''}`}>
                  {!isMe && <span className="chat-bubble__name">{msg.senderName}</span>}
                  <p className="chat-bubble__text">{msg.message}</p>
                  <span className="chat-bubble__time">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <form className="chat-input" onSubmit={sendMessage}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${room}...`}
            autoComplete="off"
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}
