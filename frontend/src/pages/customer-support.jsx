import { useEffect, useMemo, useState } from 'react';
import authManager from '../auth.js';

export default function CustomerSupportPage() {
  const [customer, setCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [cart] = useState(() => JSON.parse(localStorage.getItem('saranyaCart') || '[]'));

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  );

  useEffect(() => {
    document.title = 'Customer Support - Saranya Jewellery';
  }, []);

  useEffect(() => {
    let intervalId;

    async function init() {
      const loggedInCustomer = await authManager.checkCustomerAuth();
      if (!loggedInCustomer) return;

      setCustomer(loggedInCustomer);
      await loadMessages();
      intervalId = window.setInterval(loadMessages, 5000);
    }

    init();
    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  async function loadMessages() {
    try {
      const response = await authManager.apiRequest('/api/chat/my-messages');
      if (!response.ok) return;
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      const response = await authManager.apiRequest('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({ message: trimmed })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || 'Failed to send message');
        return;
      }

      setMessageInput('');
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      alert(`Failed to send message. Please try again. Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  }

  function logout() {
    authManager.logout();
  }

  return (
    <>
      <div className="top-bar">
        <div>
          <i className="fas fa-phone" /> <a href="tel:+1234567890">Contact Us</a>
        </div>
        <div>
          <span style={{ marginRight: '1rem', color: 'var(--brand-gold-strong)' }}>{customer?.fullName || customer?.email || 'Loading...'}</span>
          <span style={{ marginRight: '1rem' }}>Loyalty: {customer?.loyaltyPoints || 0} Points</span>
          <button type="button" className="logout-btn" onClick={logout} style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}>
            Logout
          </button>
        </div>
      </div>

      <header className="header">
        <div className="nav">
          <a href="/">Home</a>
          <a href="/customer-shop">Shop</a>
          <a href="/customer-orders">My Orders</a>
          <a href="/customer-loyalty">Loyalty</a>
          <a href="/customer-support" className="active">Support</a>
        </div>

        <div className="logo">SARANYA JEWELLERY</div>

        <div className="header-icons">
          <i className="fas fa-search header-icon" />
          <i
            className="fas fa-user header-icon"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              window.location.href = '/customer-dashboard?openProfile=true';
            }}
          />
          <a href="/customer-cart" style={{ position: 'relative' }}>
            <i className="fas fa-shopping-cart header-icon" />
            {cartCount > 0 ? (
              <span
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: 'var(--brand-gold-strong)',
                  color: 'white',
                  borderRadius: '50%',
                  padding: '2px 6px',
                  fontSize: '0.7rem'
                }}
              >
                {cartCount}
              </span>
            ) : null}
          </a>
        </div>
      </header>

      <main>
        <div className="dashboard-container">
          <div className="chat-container">
            <div className="chat-header">
              <h2>Customer Support Chat</h2>
              <p style={{ margin: '0.5rem 0 0', opacity: 0.9, fontSize: '0.9rem' }}>Our customer care team is here to help you</p>
            </div>

            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="empty-chat">
                  <i className="fas fa-comments" />
                  <p>Start a conversation with our customer care team</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const time = new Date(msg.timestamp).toLocaleString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                    month: 'short',
                    day: 'numeric'
                  });

                  return (
                    <div key={msg._id || `${msg.timestamp}-${msg.message}`} className={`message ${msg.sender}`}>
                      <div className="message-bubble">
                        <div className="message-sender">{msg.senderName}</div>
                        <div className="message-text">{msg.message}</div>
                        <div className="message-time">{time}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="chat-input-area">
              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Type your message..."
                  required
                  autoComplete="off"
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                />
                <button type="submit" className="chat-send-btn" disabled={sending}>
                  <i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} /> {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <p>&copy; 2026 Saranya Jewellery. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
