import { useEffect, useMemo, useState } from 'react';
import authManager from '../auth.js';

const ZAPIER_CHATBOT_SCRIPT_SRC =
  'https://interfaces.zapier.com/assets/web-components/zapier-interfaces/zapier-interfaces.esm.js';

export default function CustomerSupportPage() {
  const [customer, setCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatStatus, setChatStatus] = useState('active');
  const [lastMessageAt, setLastMessageAt] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [cart] = useState(() => JSON.parse(localStorage.getItem('saranyaCart') || '[]'));
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [bookingModal, setBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [appointmentStats, setAppointmentStats] = useState({
    total: 0,
    completed: 0,
    noShow: 0,
    cancelled: 0,
    confirmed: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [myBookings, setMyBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  );

  useEffect(() => {
    document.title = 'Customer Support - Saranya Jewellery';
  }, []);

  useEffect(() => {
    if (document.querySelector(`script[src="${ZAPIER_CHATBOT_SCRIPT_SRC}"]`)) {
      return;
    }

    const script = document.createElement('script');
    script.src = ZAPIER_CHATBOT_SCRIPT_SRC;
    script.type = 'module';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    let intervalId;
    async function init() {
      const loggedInCustomer = await authManager.checkCustomerAuth();
      if (!loggedInCustomer) return;

      setCustomer(loggedInCustomer);
      await loadMessages();
      await loadAvailableSlots();
      await loadAppointmentStats();
      await loadMyBookings();
      // Reload slots and messages periodically for real-time updates
      intervalId = window.setInterval(async () => {
        await loadMessages();
        await loadAvailableSlots(); // Refresh slots to show real-time bookings
        await loadMyBookings();
      }, 2000); // Reduced to 2 seconds for faster cross-browser sync
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
      setChatStatus(data.status || 'active');
      setLastMessageAt(data.lastMessageAt || null);
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

  async function loadAvailableSlots() {
    try {
      setSlotsLoading(true);
      // Load available slots from the customer endpoint
      const response = await authManager.apiRequest('/api/appointments/available');
      if (!response.ok) return;
      const data = await response.json();
      // The API returns slots with the available filter already applied
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      setSlotsLoading(false);
    }
  }

  async function loadAppointmentStats() {
    try {
      setStatsLoading(true);
      const response = await authManager.apiRequest('/api/appointments/my-bookings');
      if (!response.ok) return;
      const data = await response.json();
      if (data.bookings && Array.isArray(data.bookings)) {
        const bookings = data.bookings;
        setAppointmentStats({
          total: bookings.length,
          completed: bookings.filter(a => a.status === 'completed').length,
          noShow: bookings.filter(a => a.status === 'no-show').length,
          cancelled: bookings.filter(a => a.status === 'cancelled').length,
          confirmed: bookings.filter(a => a.status === 'confirmed').length
        });
      }
    } catch (error) {
      console.error('Error loading appointment stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadMyBookings() {
    try {
      setBookingsLoading(true);
      const response = await authManager.apiRequest('/api/appointments/my-bookings');
      if (!response.ok) return;
      const data = await response.json();
      if (data.bookings) {
        setMyBookings(data.bookings);
      }
    } catch (error) {
      console.error('Error loading my bookings:', error);
    } finally {
      setBookingsLoading(false);
    }
  }

  async function cancelAppointment(appointmentId) {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    setCancellingId(appointmentId);
    try {
      const response = await authManager.apiRequest(`/api/appointments/${appointmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('✓ Appointment cancelled successfully');
        await loadMyBookings();
        await loadAppointmentStats();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to cancel appointment'}`);
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('Error cancelling appointment. Please try again.');
    } finally {
      setCancellingId(null);
    }
  }

  async function handleBookAppointment(e) {
    e.preventDefault();
    if (!selectedSlot || !customer) return;

    setBookingError('');
    setBookingInProgress(true);

    try {
      // Check if slot is still available before booking
      if (isSlotFullyBooked(selectedSlot.date, selectedSlot.startTime, selectedSlot.endTime)) {
        setBookingError('Sorry, this time slot is no longer available. Please refresh and select another slot.');
        setBookingInProgress(false);
        return;
      }

      const response = await authManager.apiRequest('/api/appointments/book', {
        method: 'POST',
        body: JSON.stringify({
          slotId: selectedSlot._id,
          type: selectedSlot.type,
          notes: bookingNotes
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('✓ Appointment booked successfully! Check your email for confirmation.');
        setBookingModal(false);
        setSelectedSlot(null);
        setBookingNotes('');
        await loadAvailableSlots(); // Refresh slots
      } else {
        setBookingError(data.message || 'Failed to book appointment');
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      setBookingError(error.message || 'Error booking appointment');
    } finally {
      setBookingInProgress(false);
    }
  }

  function logout() {
    authManager.logout();
  }

  function formatMessageTime(timestamp) {
    return new Date(timestamp).toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      month: 'short',
      day: 'numeric'
    });
  }

  function formatStatusLabel(status) {
    if (status === 'resolved') return 'Resolved';
    if (status === 'pending') return 'Pending';
    return 'Active';
  }

  function getStatusClass(status) {
    if (status === 'resolved') return 'support-status-resolved';
    if (status === 'pending') return 'support-status-pending';
    return 'support-status-active';
  }

  function formatSlotDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function isSlotFullyBooked(date, startTime, endTime) {
    // Find if a slot with this exact date/time combo is fully booked
    const slotForDateTime = slots.find(s => {
      const slotDate = new Date(s.date);
      const checkDate = new Date(date);
      slotDate.setHours(0, 0, 0, 0);
      checkDate.setHours(0, 0, 0, 0);
      return slotDate.getTime() === checkDate.getTime() && s.startTime === startTime && s.endTime === endTime;
    });
    
    if (!slotForDateTime) return false;
    return slotForDateTime.bookedCount >= slotForDateTime.capacity || slotForDateTime.isBlocked;
  }

  function getUpcomingSlots() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return slots
      .filter(slot => {
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);
        // Only show slots that are truly available (not full, not blocked, and in future)
        return slotDate >= today && slot.bookedCount < slot.capacity && !slot.isBlocked;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5); // Show next 5 available slots
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
              window.location.href = '/customer-dashboard';
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
        <div className="dashboard-container support-shell">
          <section className="support-hero">
            <div>
              <p className="support-eyebrow">Need Assistance?</p>
              <h2>Customer Care Messaging</h2>
              <p>Connect directly with our customer care manager for order updates, product help, or any issue.</p>
            </div>
            <div className={`support-status-chip ${getStatusClass(chatStatus)}`}>
              <i className="fas fa-circle" />
              <span>{formatStatusLabel(chatStatus)}</span>
            </div>
          </section>

          <section className="support-layout">
            <aside className="support-info-card">
              <h3>Conversation Details</h3>
              <p>
                You are messaging with <strong>Customer Care Manager</strong>.
              </p>
              <ul>
                <li>Average response time: within business hours</li>
                <li>Share order number for faster support</li>
                <li>Be specific so we can resolve quickly</li>
              </ul>
              <div className="support-last-updated">
                Last update: {lastMessageAt ? formatMessageTime(lastMessageAt) : 'No messages yet'}
              </div>
            </aside>

            <div className="support-chat-panel">
              <div className="support-chat-header">
                <h3>Secure Chat</h3>
                <p>Customer and customer care manager can exchange messages here.</p>
              </div>

              <div className="support-chat-messages">
                {messages.length === 0 ? (
                  <div className="support-empty-chat">
                    <i className="fas fa-comments" />
                    <p>Start a conversation with customer care manager.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isCustomer = msg.sender === 'customer';
                    return (
                      <div
                        key={msg._id || `${msg.timestamp}-${msg.message}`}
                        className={`support-message-row ${isCustomer ? 'support-message-customer' : 'support-message-manager'}`}
                      >
                        <div className="support-message-bubble">
                          <div className="support-message-sender">
                            {isCustomer ? 'You' : msg.senderName || 'Customer Care Manager'}
                          </div>
                          <div className="support-message-text">{msg.message}</div>
                          <div className="support-message-time">{formatMessageTime(msg.timestamp)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="support-chat-input-wrap">
                <form className="support-chat-input-form" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    className="support-chat-input"
                    placeholder="Type your message to customer care manager..."
                    required
                    autoComplete="off"
                    value={messageInput}
                    onChange={(event) => setMessageInput(event.target.value)}
                  />
                  <button type="submit" className="support-chat-send-btn" disabled={sending}>
                    <i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} /> {sending ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </div>
            </div>
          </section>

          <section className="support-appointments-section" style={{ marginTop: '2rem', padding: '2rem', background: 'linear-gradient(135deg, rgba(224, 191, 99, 0.08) 0%, rgba(111, 0, 34, 0.04) 100%)', borderRadius: '8px', border: '1px solid rgba(224, 191, 99, 0.2)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                textAlign: 'center',
                border: '1px solid rgba(224, 191, 99, 0.2)'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.5rem' }}>Total Appointments</div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--brand-burgundy)' }}>
                  {statsLoading ? '-' : appointmentStats.total}
                </div>
              </div>

              <div style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                textAlign: 'center',
                border: '1px solid rgba(224, 191, 99, 0.2)'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.5rem' }}>Completed</div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#4CAF50' }}>
                  {statsLoading ? '-' : appointmentStats.completed}
                </div>
              </div>

              <div style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                textAlign: 'center',
                border: '1px solid rgba(224, 191, 99, 0.2)'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.5rem' }}>No Shows</div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#FF9800' }}>
                  {statsLoading ? '-' : appointmentStats.noShow}
                </div>
              </div>

              <div style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                textAlign: 'center',
                border: '1px solid rgba(224, 191, 99, 0.2)'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.5rem' }}>Cancelled</div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#F44336' }}>
                  {statsLoading ? '-' : appointmentStats.cancelled}
                </div>
              </div>
            </div>

            {/* My Bookings Section */}
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem', color: 'var(--brand-burgundy)' }}>✦ My Booked Appointments</h3>
            {bookingsLoading ? (
              <p style={{ fontSize: '0.95rem', color: '#999', marginBottom: '2rem' }}>Loading your appointments...</p>
            ) : myBookings.length === 0 ? (
              <p style={{ fontSize: '0.95rem', color: '#999', marginBottom: '2rem' }}>No appointments booked yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {myBookings.map((booking) => {
                  const isCancelled = booking.status === 'cancelled';
                  const isCompleted = booking.status === 'completed';
                  return (
                    <div
                      key={booking._id}
                      style={{
                        padding: '1.2rem',
                        background: isCancelled ? '#ffebee' : isCompleted ? '#e8f5e9' : 'white',
                        border: isCancelled ? '2px solid #f44336' : isCompleted ? '2px solid #4caf50' : '2px solid rgba(224, 191, 99, 0.4)',
                        borderRadius: '8px',
                        opacity: isCancelled ? 0.7 : 1,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.8rem' }}>
                        <div style={{ fontWeight: '700', color: 'var(--brand-burgundy)', fontSize: '1.05rem' }}>
                          {new Date(booking.slotId?.date || booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <span style={{
                          padding: '0.3rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: isCancelled ? '#ffcdd2' : isCompleted ? '#c8e6c9' : '#e0bf63',
                          color: isCancelled ? '#c62828' : isCompleted ? '#1b5e20' : '#6f0022'
                        }}>
                          {booking.status?.toUpperCase() || 'CONFIRMED'}
                        </span>
                      </div>
                      <div style={{ color: '#555', marginBottom: '0.6rem', fontSize: '0.95rem' }}>
                        <span style={{ fontWeight: '600' }}>⏰ Time:</span> {booking.slotId?.startTime || booking.time} - {booking.slotId?.endTime}
                      </div>
                      <div style={{ color: '#555', marginBottom: '0.6rem', fontSize: '0.95rem' }}>
                        <span style={{ fontWeight: '600' }}>📋 Type:</span> {booking.appointmentType}
                      </div>
                      {booking.notes && (
                        <div style={{ color: '#666', marginBottom: '0.8rem', fontSize: '0.9rem', padding: '0.6rem', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                          <span style={{ fontWeight: '600' }}>Notes:</span> {booking.notes}
                        </div>
                      )}
                      {!isCancelled && !isCompleted && (
                        <button
                          onClick={() => cancelAppointment(booking._id)}
                          disabled={cancellingId === booking._id}
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            background: cancellingId === booking._id ? '#ccc' : '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: cancellingId === booking._id ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s ease',
                            marginTop: '0.8rem'
                          }}
                          onMouseEnter={(e) => !cancellingId && (e.target.style.background = '#d32f2f')}
                          onMouseLeave={(e) => !cancellingId && (e.target.style.background = '#f44336')}
                        >
                          {cancellingId === booking._id ? 'Cancelling...' : '✕ Cancel Appointment'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem', color: 'var(--brand-burgundy)' }}>✦ Available Appointment Slots</h3>
            {slotsLoading ? (
              <p style={{ fontSize: '0.95rem', color: '#999' }}>Loading slots...</p>
            ) : getUpcomingSlots().length === 0 ? (
              <p style={{ fontSize: '0.95rem', color: '#999' }}>No available slots at the moment. Check back soon!</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                {getUpcomingSlots().map((slot) => (
                  <div
                    key={slot._id}
                    style={{
                      padding: '1.2rem',
                      background: 'white',
                      border: '1px solid rgba(224, 191, 99, 0.4)',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(224, 191, 99, 0.2)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ fontWeight: '700', color: 'var(--brand-burgundy)', marginBottom: '0.8rem', fontSize: '1.05rem' }}>
                      {formatSlotDate(slot.date)}
                    </div>
                    <div style={{ color: '#555', marginBottom: '0.6rem', fontSize: '0.95rem' }}>
                      <span style={{ fontWeight: '600' }}>⏰ Time:</span> {slot.startTime} - {slot.endTime}
                    </div>
                    <div style={{ color: '#555', marginBottom: '0.8rem', fontSize: '0.95rem' }}>
                      <span style={{ fontWeight: '600' }}>📋 Type:</span> {slot.type}
                    </div>
                    <div style={{ paddingTop: '0.8rem', borderTop: '1px solid rgba(224, 191, 99, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem' }}>
                        <div>
                          <div style={{ color: 'var(--brand-gold-strong)', fontWeight: '600', fontSize: '0.9rem' }}>
                            {slot.capacity - slot.bookedCount} spot{(slot.capacity - slot.bookedCount) !== 1 ? 's' : ''} available
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.3rem' }}>
                            {slot.bookedCount} / {slot.capacity} booked
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedSlot(slot);
                            setBookingModal(true);
                            setBookingError('');
                          }}
                          disabled={slot.bookedCount >= slot.capacity}
                          style={{
                            padding: '0.5rem 1rem',
                            background: slot.bookedCount >= slot.capacity ? '#ccc' : 'var(--brand-burgundy)',
                            color: slot.bookedCount >= slot.capacity ? '#999' : 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: slot.bookedCount >= slot.capacity ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (slot.bookedCount < slot.capacity) {
                              e.currentTarget.style.background = 'var(--brand-gold-strong)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (slot.bookedCount < slot.capacity) {
                              e.currentTarget.style.background = 'var(--brand-burgundy)';
                            }
                          }}
                        >
                          {slot.bookedCount >= slot.capacity ? 'Full' : 'Book Now'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <p>&copy; 2026 Saranya Jewellery. All rights reserved.</p>
        </div>
      </footer>

      {bookingModal && selectedSlot && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            animation: 'slideUp 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: 'var(--brand-burgundy)', margin: 0 }}>Book Appointment</h2>
              <button
                onClick={() => {
                  setBookingModal(false);
                  setSelectedSlot(null);
                  setBookingNotes('');
                  setBookingError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'rgba(224, 191, 99, 0.1)', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '0.8rem' }}>
                <strong style={{ color: 'var(--brand-burgundy)' }}>📅 {formatSlotDate(selectedSlot.date)}</strong>
              </div>
              <div style={{ marginBottom: '0.5rem', color: '#555' }}>
                <strong>⏰ Time:</strong> {selectedSlot.startTime} - {selectedSlot.endTime}
              </div>
              <div style={{ color: '#555' }}>
                <strong>📋 Type:</strong> {selectedSlot.type}
              </div>
            </div>

            <form onSubmit={handleBookAppointment}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>
                  Your Name
                </label>
                <input
                  type="text"
                  value={customer?.fullName || ''}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: '#f9f9f9',
                    color: '#666'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={customer?.email || ''}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: '#f9f9f9',
                    color: '#666'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>
                  Notes (Optional)
                </label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Any specific requests or notes about your appointment..."
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: '80px'
                  }}
                />
              </div>

              {bookingError && (
                <div style={{
                  background: '#fee',
                  color: '#c33',
                  padding: '0.8rem',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  fontSize: '0.9rem'
                }}>
                  ⚠ {bookingError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setBookingModal(false);
                    setSelectedSlot(null);
                    setBookingNotes('');
                    setBookingError('');
                  }}
                  style={{
                    flex: 1,
                    padding: '0.8rem',
                    background: '#eee',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    color: '#333'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingInProgress}
                  style={{
                    flex: 1,
                    padding: '0.8rem',
                    background: bookingInProgress ? '#ccc' : 'var(--brand-burgundy)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: bookingInProgress ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!bookingInProgress) e.currentTarget.style.background = 'var(--brand-gold-strong)';
                  }}
                  onMouseLeave={(e) => {
                    if (!bookingInProgress) e.currentTarget.style.background = 'var(--brand-burgundy)';
                  }}
                >
                  {bookingInProgress ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <zapier-interfaces-chatbot-embed
        is-popup="true"
        chatbot-id="cmo5zldf1004p4ftzwiocldrz"
      />
    </>
  );
}
