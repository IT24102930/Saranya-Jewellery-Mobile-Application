import { useEffect, useState } from 'react';
import authManager from '../auth.js';
import { FiBarChart2, FiGift, FiMessageCircle, FiStar, FiLogOut, FiCalendar, FiMenu, FiX } from 'react-icons/fi';

const DASHBOARD_LINKS = [
  { href: '/customer-care-dashboard', label: 'Messages' },
  { href: '/order-management-dashboard', label: 'Orders' },
  { href: '/admin-dashboard', label: 'Admin' }
];

const SEASON_TYPES = ['Seasonal Offer', 'Clearance Sale', 'Flash Sale', 'New Collection', 'Alert'];

const APPOINTMENT_TYPES = [
  'In-Store Consultation',
  'Custom Order Meeting',
  'Jewelry Fitting',
  'Repair Drop-off',
  'Resize',
  'Valuation',
  'Gift Consultation'
];

const BLOCK_REASONS = ['Holiday', 'Staff Leave', 'Maintenance', 'Training', 'Other'];

// Fixed operating hours: 7am to 10pm, 1 hour slots = 15 slots
const FIXED_TIME_SLOTS = [
  { display: '7:00 AM - 8:00 AM', start: '07:00', end: '08:00' },
  { display: '8:00 AM - 9:00 AM', start: '08:00', end: '09:00' },
  { display: '9:00 AM - 10:00 AM', start: '09:00', end: '10:00' },
  { display: '10:00 AM - 11:00 AM', start: '10:00', end: '11:00' },
  { display: '11:00 AM - 12:00 PM', start: '11:00', end: '12:00' },
  { display: '12:00 PM - 1:00 PM', start: '12:00', end: '13:00' },
  { display: '1:00 PM - 2:00 PM', start: '13:00', end: '14:00' },
  { display: '2:00 PM - 3:00 PM', start: '14:00', end: '15:00' },
  { display: '3:00 PM - 4:00 PM', start: '15:00', end: '16:00' },
  { display: '4:00 PM - 5:00 PM', start: '16:00', end: '17:00' },
  { display: '5:00 PM - 6:00 PM', start: '17:00', end: '18:00' },
  { display: '6:00 PM - 7:00 PM', start: '18:00', end: '19:00' },
  { display: '7:00 PM - 8:00 PM', start: '19:00', end: '20:00' },
  { display: '8:00 PM - 9:00 PM', start: '20:00', end: '21:00' },
  { display: '9:00 PM - 10:00 PM', start: '21:00', end: '22:00' }
];

export default function CustomerCareDashboardPage() {
  const [staffUser, setStaffUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'offers', 'messages', 'reviews'
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false));
  
  // Dashboard Overview state
  const [dashboardStats, setDashboardStats] = useState({
    activeOffers: 0,
    qaArticles: 0,
    pendingQuestions: 0,
    answeredRate: 0,
    recentActivities: [],
    topViewedQuestions: []
  });
  
  // Offers state
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState('');
  const [totalOffers, setTotalOffers] = useState(0);
  const [offerForm, setOfferForm] = useState({
    title: '',
    description: '',
    offerType: 'Seasonal Offer',
    discountPercentage: '',
    discountAmount: '',
    validFrom: '',
    validUntil: '',
    couponCode: ''
  });
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [overviewLoading, setOverviewLoading] = useState(false);

  // Messages state
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [chatStats, setChatStats] = useState({ active: 0, resolved: 0, pending: 0 });
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState(null);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [selectedReview, setSelectedReview] = useState(null);
  const [staffReply, setStaffReply] = useState('');

  // Appointments state
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [appointmentStats, setAppointmentStats] = useState({ total: 0, completed: 0, noShow: 0, cancelled: 0, confirmed: 0 });
  const [slotForm, setSlotForm] = useState({ date: '', timeSlotIndex: 0, type: 'In-Store Consultation', capacity: 1, assignedStaff: '', isBlocked: false, blockReason: '' });
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentStatusForm, setAppointmentStatusForm] = useState({ status: '', internalNotesAfter: '', followUpNote: '', followUpSuggested: false });

  const [error, setError] = useState('');

  const todayDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    document.title = 'Customer Care Dashboard - Saranya Jewellery';
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const me = await authManager.checkStaffAuth('Customer Care');
      if (!me || me.needsApproval) return;
      setStaffUser(me);
      await Promise.all([loadDashboardOverview(), loadOffers(), loadChats(), loadReviews(), loadSlots(), loadAppointments()]);
    }
    bootstrap();
  }, []);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 1024;
      setIsMobileView(mobile);
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-refresh appointment slots every 30 seconds to reflect customer bookings
  useEffect(() => {
    const interval = setInterval(() => {
      loadSlots();
      loadAppointments();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // ============ DASHBOARD OVERVIEW FUNCTIONS ============
  async function loadDashboardOverview() {
    try {
      setOverviewLoading(true);
      // Fetch total offers (both Loyalty and Standard) from dashboard stats
      let totalOffers = 0;
      try {
        const statsResp = await authManager.apiRequest(`/api/loyalty/dashboard/stats?t=${Date.now()}`);
        const statsData = await statsResp.json();
        console.debug('Dashboard stats response:', statsResp.ok, 'statsData:', statsData);
        if (statsResp.ok && statsData.totalOffers !== undefined) {
          totalOffers = statsData.totalOffers;
          console.debug('Total offers fetched:', totalOffers);
        } else {
          console.warn('Failed to get total offers from stats, using fallback');
          totalOffers = 0;
        }
      } catch (e) {
        console.warn('Failed to load dashboard stats for total offers', e);
      }

      // Count total chats (not messages)
      let qaArticles = 0; // reused field for backward compatibility with UI
      let pendingQuestions = 0; // count of pending chats
      try {
        const chatsResp = await authManager.apiRequest(`/api/chat/all?t=${Date.now()}`);
        const chatsData = await chatsResp.json();
        console.debug('Chats data for chat count:', chatsData);
        if (chatsResp.ok && Array.isArray(chatsData)) {
          // Count total chats
          qaArticles = chatsData.length;
          console.debug('Total chats calculated:', qaArticles);
          
          // Count pending chats (status === 'pending')
          pendingQuestions = chatsData.filter(chat => chat.status === 'pending').length;
          console.debug('Pending chats calculated:', pendingQuestions);
        }
      } catch (e) {
        console.warn('Failed to load chats for chat count', e);
      }

      // Chat stats for answered rate
      let answeredRate = 0;
      try {
        const chatResp = await authManager.apiRequest(`/api/chat/stats/summary?t=${Date.now()}`);
        const chatStats = await chatResp.json();
        console.debug('chatResp.ok', chatResp.ok, 'chatStats', chatStats);
        const totalChats = chatResp.ok ? (chatStats.totalChats || 0) : 0;
        const resolvedChats = chatResp.ok ? (chatStats.resolvedChats || 0) : 0;
        answeredRate = totalChats > 0 ? Math.round((resolvedChats / totalChats) * 100) : 0;
      } catch (e) {
        console.warn('Failed to load chat stats', e);
      }

      // Keep a lightweight recent activity and top questions using available data
      const recentActivities = [];
      let topViewedQuestions = [];
      
      // Load recent promotional offers for activity feed
      try {
        const offersResp = await authManager.apiRequest(`/api/messages?type=promotion&t=${Date.now()}`);
        const offersData = await offersResp.json();
        if (offersResp.ok && Array.isArray(offersData)) {
          offersData.slice(0, 5).forEach((offer) => {
            recentActivities.push({
              type: 'offer',
              icon: '★',
              text: `Offer created: "${offer.title}"`,
              time: new Date(offer.createdAt || Date.now()),
              timestamp: new Date(offer.createdAt || Date.now()).getTime()
            });
          });
        }
      } catch (e) {
        console.warn('Failed to load offers for activity', e);
      }
      
      // Add recent customer messages to activity feed
      try {
        const chatsResp = await authManager.apiRequest(`/api/chat/all?t=${Date.now()}`);
        const chatsData = await chatsResp.json();
        if (chatsResp.ok && Array.isArray(chatsData)) {
          chatsData.slice(0, 5).forEach((chat) => {
            if (chat.lastMessage) {
              recentActivities.push({
                type: 'message',
                icon: '💬',
                text: `Message from ${chat.customerName}`,
                time: new Date(chat.lastMessageAt || Date.now()),
                timestamp: new Date(chat.lastMessageAt || Date.now()).getTime()
              });
            }
          });
        }
      } catch (e) {
        console.warn('Failed to load chats for activity', e);
      }
      
      // Add recent orders to activity feed
      try {
        const ordersResp = await authManager.apiRequest(`/api/order?t=${Date.now()}`);
        const ordersData = await ordersResp.json();
        if (ordersResp.ok && Array.isArray(ordersData)) {
          ordersData.slice(0, 5).forEach((order) => {
            recentActivities.push({
              type: 'order',
              icon: '🛍️',
              text: `Order placed: ${order.customerName} - ₹${order.totalAmount}`,
              time: new Date(order.createdAt || Date.now()),
              timestamp: new Date(order.createdAt || Date.now()).getTime()
            });
          });
        }
      } catch (e) {
        console.warn('Failed to load orders for activity', e);
      }
      
      // Add recent appointments to activity feed
      try {
        const appointmentsResp = await authManager.apiRequest(`/api/appointments?t=${Date.now()}`);
        const appointmentsData = await appointmentsResp.json();
        if (appointmentsResp.ok && Array.isArray(appointmentsData)) {
          appointmentsData.slice(0, 5).forEach((appt) => {
            recentActivities.push({
              type: 'appointment',
              icon: '📅',
              text: `Appointment booked: ${appt.customerName}`,
              time: new Date(appt.createdAt || Date.now()),
              timestamp: new Date(appt.createdAt || Date.now()).getTime()
            });
          });
        }
      } catch (e) {
        console.warn('Failed to load appointments for activity', e);
      }
      
      // Add recent reviews to activity feed
      try {
        const reviewsResp = await authManager.apiRequest(`/api/reviews?t=${Date.now()}`);
        const reviewsData = await reviewsResp.json();
        if (reviewsResp.ok && Array.isArray(reviewsData)) {
          reviewsData.slice(0, 5).forEach((review) => {
            recentActivities.push({
              type: 'review',
              icon: '⭐',
              text: `Review: "${review.title || review.message?.substring(0, 30)}"`,
              time: new Date(review.createdAt || Date.now()),
              timestamp: new Date(review.createdAt || Date.now()).getTime()
            });
          });
        }
      } catch (e) {
        console.warn('Failed to load reviews for activity', e);
      }
      
      // Sort activities by most recent and limit to 6
      recentActivities.sort((a, b) => b.timestamp - a.timestamp);
      const sortedActivities = recentActivities.slice(0, 6);
      
      // Load top customer questions/messages for top questions section
      try {
        const chatsResp = await authManager.apiRequest(`/api/chat/all?t=${Date.now()}`);
        const chatsData = await chatsResp.json();
        if (chatsResp.ok && Array.isArray(chatsData)) {
          // For each chat, get the full chat data to access all messages
          for (const chatSummary of chatsData.slice(0, 10)) {
            try {
              const chatDetailResp = await authManager.apiRequest(`/api/chat/${chatSummary._id}?t=${Date.now()}`);
              const chatDetail = await chatDetailResp.json();
              
              if (chatDetailResp.ok && chatDetail.messages && Array.isArray(chatDetail.messages)) {
                // Filter for customer-only messages (questions from customers)
                const customerMessages = chatDetail.messages.filter(m => m.sender === 'customer');
                if (customerMessages.length > 0) {
                  // Get the last customer message
                  const lastCustomerMsg = customerMessages[customerMessages.length - 1];
                  topViewedQuestions.push({
                    text: lastCustomerMsg.message?.substring(0, 100),
                    customerName: chatSummary.customerName,
                    views: customerMessages.length
                  });
                }
              }
            } catch (e) {
              console.warn(`Failed to load chat details for ${chatSummary._id}`, e);
            }
          }
          // Limit to 5
          topViewedQuestions = topViewedQuestions.slice(0, 5);
        }
      } catch (e) {
        console.warn('Failed to load top customer questions', e);
      }

      setDashboardStats({
        activeOffers: totalOffers,
        qaArticles,
        pendingQuestions,
        answeredRate,
        recentActivities: sortedActivities,
        topViewedQuestions,
      });
    } catch (err) {
      console.error('Error loading dashboard overview:', err);
    } finally {
      setOverviewLoading(false);
    }
  }

  // ============ OFFERS FUNCTIONS ============
  async function fetchTotalOffers() {
    try {
      // Count total offers from the loaded offers array
      if (offers && Array.isArray(offers)) {
        setTotalOffers(offers.length);
        console.debug('Total offers updated:', offers.length);
      } else {
        setTotalOffers(0);
      }
    } catch (e) {
      console.warn('Failed to count total offers', e);
      setTotalOffers(0);
    }
  }

  async function loadOffers() {
    try {
      setOffersLoading(true);
      setOffersError('');
      // Query the backend for standard offers with cache-busting timestamp
      const response = await authManager.apiRequest(`/api/loyalty/offers/standard?t=${Date.now()}`, { method: 'GET' });
      const data = await response.json();
      
      if (response.ok) {
        const standardOffers = Array.isArray(data) ? data : [];
        console.log('Loaded standard offers:', standardOffers, 'Count:', standardOffers.length);
        setOffers(standardOffers);
      } else {
        console.error('Failed to load offers:', data);
        setOffersError(data.message || 'Failed to load standard offers');
      }
      
      // Also fetch total offers count
      await fetchTotalOffers();
    } catch (err) {
      console.error('Error loading offers:', err);
      setOffersError(err.message || 'Error loading standard offers');
    } finally {
      setOffersLoading(false);
    }
  }

  async function createOffer(event) {
    event.preventDefault();
    if (!offerForm.title || !offerForm.description || !offerForm.validFrom || !offerForm.validUntil || !offerForm.couponCode) {
      setError('All fields including title, description, date range, and coupon code are required');
      return;
    }

    const parsedDiscount = Number(offerForm.discountPercentage || 0);
    if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
      setError('Discount percentage must be between 0 and 100');
      return;
    }

    if (offerForm.validFrom > offerForm.validUntil) {
      setError('Valid From date must be before Valid Until date');
      return;
    }

    // When creating a new offer, both dates must be current or future
    if (!editingOfferId) {
      if (offerForm.validUntil < todayDate) {
        setError('Valid Until date cannot be in the past');
        return;
      }

      if (offerForm.validFrom < todayDate) {
        setError('Valid From date cannot be in the past');
        return;
      }
    } else {
      // When editing, only ensure that the new dates make sense
      if (offerForm.validUntil < offerForm.validFrom) {
        setError('Valid Until date must be after Valid From date');
        return;
      }
    }

    setIsCreatingOffer(true);
    setError('');
    try {
      const endpoint = editingOfferId ? `/api/loyalty/offers/standard/${editingOfferId}` : '/api/loyalty/offers/standard/create';
      const method = editingOfferId ? 'PUT' : 'POST';

      const response = await authManager.apiRequest(endpoint, {
        method,
        body: JSON.stringify({
          title: offerForm.title,
          description: offerForm.description,
          validFrom: offerForm.validFrom,
          validUntil: offerForm.validUntil,
          discountPercentage: parsedDiscount,
          discountAmount: Number(offerForm.discountAmount || 0),
          couponCode: offerForm.couponCode.toUpperCase().trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Failed to create offer');
      } else {
        // Reload offers to ensure stats are updated before showing success
        await loadOffers();
        
        // Show success message
        const msg = editingOfferId ? 'Offer updated successfully!' : 'Offer created successfully!';
        setSuccessMessage(msg);
        setOfferForm({ title: '', description: '', offerType: 'Seasonal Offer', discountPercentage: '', discountAmount: '', validFrom: '', validUntil: '', couponCode: '' });
        setEditingOfferId(null);
        setError('');
        
        // Auto-clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Error creating offer');
    } finally {
      setIsCreatingOffer(false);
    }
  }

  function startEditOffer(offer) {
    setEditingOfferId(offer._id);
    setError('');
    setOfferForm({
      title: offer.title || '',
      description: offer.description || '',
      offerType: 'Seasonal Offer',
      discountPercentage: offer.discountPercentage ?? '',
      discountAmount: offer.discountAmount ?? '',
      validFrom: offer.validFrom ? new Date(offer.validFrom).toISOString().split('T')[0] : '',
      validUntil: offer.validUntil ? new Date(offer.validUntil).toISOString().split('T')[0] : '',
      couponCode: offer.couponCode || ''
    });
  }

  function cancelEditOffer() {
    setEditingOfferId(null);
    setOfferForm({ title: '', description: '', offerType: 'Seasonal Offer', discountPercentage: '', discountAmount: '', validFrom: '', validUntil: '', couponCode: '' });
    setError('');
  }

  async function sendOfferEmails(offerId) {
    if (!window.confirm('Send this offer to all standard customers?')) return;

    try {
      setError('');
      const response = await authManager.apiRequest(`/api/loyalty/offers/standard/${offerId}/send-coupons`, {
        method: 'POST'
      });

      const data = await response.json();
      if (response.ok) {
        // Reload offers to ensure stats are updated with new sentCount
        await loadOffers();
        
        const successCount = data.successCount || 0;
        const msg = `Offer sent to ${successCount} customer${successCount !== 1 ? 's' : ''}!`;
        setSuccessMessage(msg);
        
        // Auto-clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message || 'Failed to send offer');
      }
    } catch (err) {
      setError(err.message || 'Error sending offer');
    }
  }

  async function deleteOffer(offerId) {
    if (!window.confirm('Delete this offer and associated coupons?')) return;

    try {
      setError('');
      const response = await authManager.apiRequest(`/api/loyalty/offers/standard/${offerId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (response.ok) {
        await loadOffers();
      } else {
        setError(data.message || 'Failed to delete offer');
      }
    } catch (err) {
      setError(err.message || 'Error deleting offer');
    }
  }

  // ============ MESSAGES FUNCTIONS ============
  async function loadChats() {
    try {
      const response = await authManager.apiRequest('/api/chat/all');
      const data = await response.json();
      if (response.ok) {
        setChats(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading chats:', err);
    }
  }

  async function selectChat(chat) {
    if (!chat?._id) {
      setError('Invalid chat selected');
      return;
    }

    try {
      setError('');
      // Fetch full chat details with all messages
      const response = await authManager.apiRequest(`/api/chat/${chat._id}`);
      const fullChat = await response.json();
      if (response.ok) {
        setSelectedChat(fullChat);
        setChatMessages(fullChat.messages || []);
        setReplyText('');
      } else {
        setError(fullChat.message || 'Failed to load chat details');
      }
    } catch (err) {
      console.error('Error loading chat details:', err);
      setError('Failed to load chat details');
    }
  }

  async function sendChatReply() {
    if (!replyText.trim() || !selectedChat) return;

    try {
      setError('');
      const response = await authManager.apiRequest(`/api/chat/${selectedChat._id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText })
      });

      const data = await response.json();
      if (response.ok) {
        setReplyText('');
        await selectChat(selectedChat);
        await loadChats();
      } else {
        setError(data.message || 'Failed to send reply');
      }
    } catch (err) {
      setError(err.message || 'Error sending reply');
    }
  }

  async function updateChatStatus(chatId, newStatus) {
    try {
      setError('');
      const response = await authManager.apiRequest(`/api/chat/${chatId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (response.ok) {
        await loadChats();
      } else {
        setError(data.message || 'Failed to update status');
      }
    } catch (err) {
      setError(err.message || 'Error updating status');
    }
  }

  async function deleteMessage(chatId, messageIndex) {
    if (!window.confirm('Delete this message?')) return;

    try {
      setError('');
      const response = await authManager.apiRequest(`/api/chat/${chatId}/message/${messageIndex}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (response.ok) {
        await selectChat(selectedChat);
      } else {
        setError(data.message || 'Failed to delete message');
      }
    } catch (err) {
      setError(err.message || 'Error deleting message');
    }
  }

  // ============ REVIEWS FUNCTIONS ============
  async function loadReviews() {
    try {
      const response = await authManager.apiRequest('/api/reviews');
      const data = await response.json();
      if (response.ok) {
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        setReviewStats(data.stats || { pending: 0, approved: 0, rejected: 0 });
      }
    } catch (err) {
      console.error('Error loading reviews:', err);
    }
  }

  async function updateReviewStatus(reviewId, newStatus, reply = '') {
    try {
      setError('');
      const response = await authManager.apiRequest(`/api/reviews/${reviewId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, staffReply: reply })
      });

      const data = await response.json();
      if (response.ok) {
        setSelectedReview(null);
        setStaffReply('');
        await loadReviews();
      } else {
        setError(data.message || 'Failed to update review');
      }
    } catch (err) {
      setError(err.message || 'Error updating review');
    }
  }

  async function deleteReview(reviewId) {
    if (!window.confirm('Delete this review?')) return;

    try {
      setError('');
      const response = await authManager.apiRequest(`/api/reviews/${reviewId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (response.ok) {
        await loadReviews();
      } else {
        setError(data.message || 'Failed to delete review');
      }
    } catch (err) {
      setError(err.message || 'Error deleting review');
    }
  }

  // ============ APPOINTMENT SLOTS FUNCTIONS ============
  async function loadSlots() {
    try {
      const response = await authManager.apiRequest(`/api/appointments/slots?t=${Date.now()}`);
      const data = await response.json();
      if (response.ok) {
        setSlots(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading slots:', err);
    }
  }

  async function loadAppointments() {
    try {
      const response = await authManager.apiRequest(`/api/appointments?t=${Date.now()}`);
      const data = await response.json();
      if (response.ok) {
        setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
        setAppointmentStats(data.stats || { total: 0, completed: 0, noShow: 0, cancelled: 0, confirmed: 0 });
      }
    } catch (err) {
      console.error('Error loading appointments:', err);
    }
  }

  async function createOrUpdateSlot(e) {
    e.preventDefault();
    if (!slotForm.date || slotForm.timeSlotIndex === undefined || slotForm.timeSlotIndex === null) {
      setError('All fields required');
      return;
    }

    // Validate that the date is not in the past for new slots
    if (!editingSlotId && slotForm.date < todayDate) {
      setError('Appointment date cannot be in the past');
      return;
    }

    try {
      setError('');
      const selectedTimeSlot = FIXED_TIME_SLOTS[slotForm.timeSlotIndex];
      
      const url = editingSlotId ? `/api/appointments/slots/${editingSlotId}` : '/api/appointments/slots';
      const method = editingSlotId ? 'PATCH' : 'POST';

      const response = await authManager.apiRequest(url, {
        method,
        body: JSON.stringify({
          date: slotForm.date,
          startTime: selectedTimeSlot.start,
          endTime: selectedTimeSlot.end,
          type: slotForm.type,
          capacity: slotForm.capacity,
          assignedStaff: slotForm.assignedStaff,
          isBlocked: slotForm.isBlocked,
          blockReason: slotForm.blockReason
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSlotForm({ date: '', timeSlotIndex: 0, type: 'In-Store Consultation', capacity: 1, assignedStaff: '', isBlocked: false, blockReason: '' });
        setEditingSlotId(null);
        await loadSlots();
        setSuccessMessage('Appointment slot saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message || 'Failed to save slot');
      }
    } catch (err) {
      setError(err.message || 'Error saving slot');
    }
  }

  async function deleteSlot(slotId) {
    if (!window.confirm('Delete this slot?')) return;

    try {
      setError('');
      const response = await authManager.apiRequest(`/api/appointments/slots/${slotId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadSlots();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete slot');
      }
    } catch (err) {
      setError(err.message || 'Error deleting slot');
    }
  }

  async function blockMultipleSlots(startDate, endDate, reason) {
    try {
      setError('');
      const response = await authManager.apiRequest('/api/appointments/slots/block-multiple', {
        method: 'POST',
        body: JSON.stringify({ startDate, endDate, blockReason: reason })
      });

      const data = await response.json();
      if (response.ok) {
        await loadSlots();
      } else {
        setError(data.message || 'Failed to block slots');
      }
    } catch (err) {
      setError(err.message || 'Error blocking slots');
    }
  }

  async function updateAppointmentStatus(appointmentId, newStatus, notes) {
    try {
      setError('');
      const response = await authManager.apiRequest(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          internalNotesAfter: notes,
          followUpSuggested: newStatus === 'no-show' || newStatus === 'cancelled'
        })
      });

      const data = await response.json();
      if (response.ok) {
        await loadAppointments();
        setSelectedAppointment(null);
      } else {
        setError(data.message || 'Failed to update appointment');
      }
    } catch (err) {
      setError(err.message || 'Error updating appointment');
    }
  }

  if (!staffUser) return <p style={{ padding: '1rem' }}>Checking customer care access...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#470012", position: 'relative' }}>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          overflow: "auto",
          padding: "2rem 0.75rem 6.5rem 0.75rem",
          backgroundImage: "url('/jewelry-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          position: "relative",
        }}
      >
        {/* Background Overlay */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
        {/* Content Wrapper */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {error && (
            <div
              style={{
                background: "#fee",
                border: "1px solid #fcc",
                color: "#c33",
                padding: "0.75rem 1rem",
                borderRadius: 8,
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          {/* DASHBOARD OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div>
              {/* Header with Refresh Button */}
              <div
                style={{
                  marginBottom: "2.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: "0 0 0.5rem",
                      color: "#FFFFFF",
                      fontSize: isMobileView ? "1.5rem" : "2rem",
                      fontWeight: 700,
                    }}
                  >
                    Dashboard Overview
                  </h2>
                  <p style={{ margin: 0, color: "#666", fontSize: isMobileView ? "0.85rem" : "0.95rem" }}>
                    Welcome back! Here's what is happening today
                  </p>
                </div>
                <button
                  onClick={loadDashboardOverview}
                  disabled={overviewLoading}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "#6f0022",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    cursor: overviewLoading ? "not-allowed" : "pointer",
                    opacity: overviewLoading ? 0.6 : 1,
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) =>
                    !overviewLoading && (e.target.style.background = "#8b0033")
                  }
                  onMouseLeave={(e) =>
                    !overviewLoading && (e.target.style.background = "#6f0022")
                  }
                  title="Refresh overview data"
                >
                  {overviewLoading ? "Loading..." : "↻ Refresh"}
                </button>
              </div>

              {/* Stats Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobileView ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: isMobileView ? "1rem" : "1.5rem",
                  marginBottom: "2.5rem",
                }}
              >
                {/* Total Customer Messages Card */}
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #6f0022 0%, #8b0033 100%)",
                    borderRadius: "12px",
                    padding: isMobileView ? "1.25rem" : "1.5rem",
                    color: "#fff",
                    boxShadow: "0 4px 15px rgba(111, 0, 34, 0.2)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: "1rem",
                      gap: isMobileView ? "0.5rem" : "1rem",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#e0bf63",
                          fontSize: isMobileView ? "0.75rem" : "0.85rem",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Total Customer Messages
                      </p>
                      <h3
                        style={{
                          margin: "0.8rem 0 0",
                          fontSize: isMobileView ? "2rem" : "2.5rem",
                          fontWeight: 700,
                          color: "#e0bf63",
                        }}
                      >
                        {dashboardStats.qaArticles}
                      </h3>
                    </div>
                    <span style={{ fontSize: isMobileView ? "2rem" : "2.5rem", flexShrink: 0 }}>💬</span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: "#e0bf63",
                      fontSize: "0.85rem",
                    }}
                  >
                    from customers
                  </p>
                </div>

                {/* Pending Messages Card */}
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #6f0022 0%, #8b0033 100%)",
                    borderRadius: "12px",
                    padding: isMobileView ? "1.25rem" : "1.5rem",
                    color: "#fff",
                    boxShadow: "0 4px 15px rgba(111, 0, 34, 0.2)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: "1rem",
                      gap: isMobileView ? "0.5rem" : "1rem",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#e0bf63",
                          fontSize: isMobileView ? "0.75rem" : "0.85rem",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Pending Messages
                      </p>
                      <h3
                        style={{
                          margin: "0.8rem 0 0",
                          fontSize: isMobileView ? "2rem" : "2.5rem",
                          fontWeight: 700,
                          color: "#e0bf63",
                        }}
                      >
                        {dashboardStats.pendingQuestions}
                      </h3>
                    </div>
                    <span style={{ fontSize: isMobileView ? "2rem" : "2.5rem", flexShrink: 0 }}>⏳</span>
                  </div>
                  <p
                    style={{ margin: 0, color: "#e0bf63", fontSize: "0.85rem" }}
                  >
                    awaiting response
                  </p>
                </div>

                {/* Answered Rate Card */}
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #6f0022 0%, #8b0033 100%)",
                    borderRadius: "12px",
                    padding: isMobileView ? "1.25rem" : "1.5rem",
                    color: "#fff",
                    boxShadow: "0 4px 15px rgba(111, 0, 34, 0.2)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: "1rem",
                      gap: isMobileView ? "0.5rem" : "1rem",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#e0bf63",
                          fontSize: isMobileView ? "0.75rem" : "0.85rem",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Answered Rate
                      </p>
                      <h3
                        style={{
                          margin: "0.8rem 0 0",
                          fontSize: isMobileView ? "2rem" : "2.5rem",
                          fontWeight: 700,
                          color: "#e0bf63",
                        }}
                      >
                        {dashboardStats.answeredRate}%
                      </h3>
                    </div>
                    <span style={{ fontSize: isMobileView ? "2rem" : "2.5rem", flexShrink: 0 }}>✓</span>
                  </div>
                  <p
                    style={{ margin: 0, color: "#e0bf63", fontSize: "0.85rem" }}
                  >
                    questions answered
                  </p>
                </div>
              </div>

              {/* Recent Activity & Top Questions */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr",
                  gap: isMobileView ? "1.5rem" : "2rem",
                  gridAutoFlow: isMobileView ? "dense" : "row",
                }}
              >
                {/* Recent Activity - First */}
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: "12px",
                    padding: isMobileView ? "1.5rem" : "2rem",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    order: 1,
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 1.5rem",
                      color: "#1a1a1a",
                      fontSize: isMobileView ? "1rem" : "1.1rem",
                      fontWeight: 600,
                    }}
                  >
                    Recent Activity
                  </h3>
                  <div style={{ display: "grid", gap: "1rem" }}>
                    {dashboardStats.recentActivities.length === 0 ? (
                      <p
                        style={{
                          color: "#aaa",
                          textAlign: "center",
                          padding: "2rem 0",
                          fontSize: isMobileView ? "0.9rem" : "0.95rem",
                        }}
                      >
                        No recent activities
                      </p>
                    ) : (
                      dashboardStats.recentActivities.map((activity, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            gap: "1rem",
                            paddingBottom: "1rem",
                            borderBottom:
                              idx !== dashboardStats.recentActivities.length - 1
                                ? "1px solid #e5e5e5"
                                : "none",
                          }}
                        >
                          <div
                            style={{
                              width: isMobileView ? "36px" : "40px",
                              height: isMobileView ? "36px" : "40px",
                              borderRadius: "8px",
                              background:
                                activity.type === "offer"
                                  ? "#6f0022"
                                  : activity.type === "message"
                                    ? "#d4a850"
                                    : activity.type === "order"
                                      ? "#1e88e5"
                                      : activity.type === "appointment"
                                        ? "#7b1fa2"
                                        : activity.type === "review"
                                          ? "#f57c00"
                                          : "#e5e5e5",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color:
                                activity.type === "offer" || activity.type === "appointment" || activity.type === "order" 
                                  ? "#fff" 
                                  : "#333",
                              fontSize: isMobileView ? "1rem" : "1.2rem",
                              flexShrink: 0,
                            }}
                          >
                            {activity.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                margin: 0,
                                color: "#333",
                                fontSize: isMobileView ? "0.9rem" : "0.95rem",
                                fontWeight: 500,
                                wordBreak: "break-word",
                              }}
                            >
                              {activity.text}
                            </p>
                            <p
                              style={{
                                margin: "0.3rem 0 0",
                                color: "#999",
                                fontSize: "0.8rem",
                              }}
                            >
                              {activity.time instanceof Date 
                                ? activity.time.toLocaleDateString() 
                                : activity.time}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Top Viewed Questions - Second */}
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: "12px",
                    padding: isMobileView ? "1.5rem" : "2rem",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    order: 2,
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 1.5rem",
                      color: "#1a1a1a",
                      fontSize: isMobileView ? "1rem" : "1.1rem",
                      fontWeight: 600,
                    }}
                  >
                    Top Viewed Questions
                  </h3>
                  <div style={{ display: "grid", gap: "1rem" }}>
                    {dashboardStats.topViewedQuestions.length === 0 ? (
                      <p
                        style={{
                          color: "#aaa",
                          textAlign: "center",
                          padding: "2rem 0",
                          fontSize: isMobileView ? "0.9rem" : "0.95rem",
                        }}
                      >
                        No questions yet
                      </p>
                    ) : (
                      dashboardStats.topViewedQuestions.map((question, idx) => (
                        <div
                          key={idx}
                          style={{
                            paddingBottom: "1rem",
                            borderBottom:
                              idx !==
                              dashboardStats.topViewedQuestions.length - 1
                                ? "1px solid #e5e5e5"
                                : "none",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: isMobileView ? "0.75rem" : "1rem",
                              flexDirection: isMobileView ? "column" : "row",
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  margin: 0,
                                  color: "#333",
                                  fontSize: isMobileView ? "0.9rem" : "0.95rem",
                                  fontWeight: 500,
                                  lineHeight: 1.4,
                                  wordBreak: "break-word",
                                }}
                              >
                                {question.text}
                              </p>
                              {question.customerName && (
                                <p
                                  style={{
                                    margin: "0.4rem 0 0",
                                    color: "#999",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  from {question.customerName}
                                </p>
                              )}
                            </div>
                            <span
                              style={{
                                background: "#fff3cd",
                                color: "#856404",
                                padding: "0.3rem 0.8rem",
                                borderRadius: "20px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                flexShrink: 0,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {question.views} msg
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OFFERS TAB */}
          {activeTab === "offers" && (
            <div>
              {/* Header with Refresh Button */}
              <div
                style={{
                  marginBottom: "2.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: "0 0 0.5rem",
                      color: "#FFFFFF",
                      fontSize: "2rem",
                      fontWeight: 700,
                    }}
                  >
                    Promotional Offers
                  </h2>
                  <p style={{ margin: 0, color: "#666", fontSize: "0.95rem" }}>
                    Create and manage customer offers and promotions
                  </p>
                </div>
                <button
                  onClick={loadOffers}
                  disabled={offersLoading}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "#6f0022",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    cursor: offersLoading ? "not-allowed" : "pointer",
                    opacity: offersLoading ? 0.6 : 1,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) =>
                    !offersLoading && (e.target.style.background = "#8b0033")
                  }
                  onMouseLeave={(e) =>
                    !offersLoading && (e.target.style.background = "#6f0022")
                  }
                  title="Refresh promotional offers"
                >
                  {offersLoading ? "Loading..." : "↻ Refresh"}
                </button>
              </div>

              {/* Error Message */}
              {offersError && (
                <div
                  style={{
                    background: "#fff3cd",
                    border: "1px solid #ffc107",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "2rem",
                    color: "#856404",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>⚠ {offersError}</div>
                  <button
                    onClick={() => setOffersError("")}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "1.2rem",
                      cursor: "pointer",
                      color: "#856404",
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div
                  style={{
                    background: "#d4edda",
                    border: "1px solid #28a745",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "2rem",
                    color: "#155724",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>✓ {successMessage}</div>
                  <button
                    onClick={() => setSuccessMessage("")}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "1.2rem",
                      cursor: "pointer",
                      color: "#155724",
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Stats Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "1.5rem",
                  marginBottom: "2.5rem",
                  opacity: offersLoading ? 0.6 : 1,
                  transition: "opacity 0.2s ease",
                }}
              >
                <div
                  style={{
                    background: "#6f0022",
                    border: "1px solid #5a001a",
                    borderRadius: "10px",
                    padding: "1.5rem",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    transition: "all 0.3s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: "0 0 0.8rem",
                          color: "#e0bf63",
                          fontSize: "0.85rem",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Total Offers
                      </p>
                      <h3
                        style={{
                          margin: 0,
                          color: "#fff",
                          fontSize: "2.2rem",
                          fontWeight: 700,
                        }}
                      >
                        {totalOffers}
                      </h3>
                      <p
                        style={{
                          margin: "0.5rem 0 0",
                          fontSize: "0.75rem",
                          color: "#d0d0d0",
                        }}
                      >
                        across all types
                      </p>
                    </div>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "8px",
                        background:
                          "linear-gradient(135deg, #6f0022 0%, #9d0033 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: "1.5rem",
                      }}
                    >
                      ★
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: "#6f0022",
                    border: "1px solid #5a001a",
                    borderRadius: "10px",
                    padding: "1.5rem",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    transition: "all 0.3s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: "0 0 0.8rem",
                          color: "#e0bf63",
                          fontSize: "0.85rem",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Total Sent
                      </p>
                      <h3
                        style={{
                          margin: 0,
                          color: "#fff",
                          fontSize: "2.2rem",
                          fontWeight: 700,
                        }}
                      >
                        {offers.reduce((sum, o) => sum + (o.recipientsCount || 0), 0)}
                      </h3>
                      <p
                        style={{
                          margin: "0.5rem 0 0",
                          fontSize: "0.75rem",
                          color: "#d0d0d0",
                        }}
                      >
                        across all promotions
                      </p>
                    </div>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "8px",
                        background:
                          "linear-gradient(135deg, #e0bf63 0%, #d4a850 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#6f0022",
                        fontSize: "1.5rem",
                      }}
                    >
                      ✉
                    </div>
                  </div>
                </div>
              </div>

              {/* Create/Edit Form */}
              <section
                style={{
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: "12px",
                  padding: "2rem",
                  marginBottom: "2.5rem",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 1.5rem",
                    color: "#1a1a1a",
                    fontSize: "1.3rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.8rem",
                  }}
                >
                  {editingOfferId ? "✎ Edit Campaign" : "✚ Create New Campaign"}
                </h3>

                <form
                  onSubmit={createOffer}
                  style={{ display: "grid", gap: "1.5rem" }}
                >
                  {/* Row 1: Title & Type */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr",
                      gap: "1.5rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          margin: "0 0 0.6rem",
                          color: "#333",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                        }}
                      >
                        Promo Title *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Holiday Special Discount"
                        value={offerForm.title}
                        onChange={(e) =>
                          setOfferForm({ ...offerForm, title: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "0.85rem 1rem",
                          border: "1px solid #d0d0d0",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          fontFamily: "Arial, sans-serif",
                          boxSizing: "border-box",
                          transition: "border-color 0.2s ease",
                          background: "#fafbfc",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "#6f0022")
                        }
                        onBlur={(e) => (e.target.style.borderColor = "#d0d0d0")}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          margin: "0 0 0.6rem",
                          color: "#333",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                        }}
                      >
                        Promo Type *
                      </label>
                      <select
                        value={offerForm.offerType}
                        onChange={(e) =>
                          setOfferForm({
                            ...offerForm,
                            offerType: e.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "0.85rem 1rem",
                          border: "1px solid #d0d0d0",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          fontFamily: "Arial, sans-serif",
                          boxSizing: "border-box",
                          background: "#fafbfc",
                          cursor: "pointer",
                          color: "#333",
                        }}
                      >
                        {SEASON_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        margin: "0 0 0.6rem",
                        color: "#333",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      Promo Description *
                    </label>
                    <textarea
                      placeholder="Describe your offer, terms, and any special conditions..."
                      value={offerForm.description}
                      onChange={(e) =>
                        setOfferForm({
                          ...offerForm,
                          description: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.85rem 1rem",
                        border: "1px solid #d0d0d0",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontFamily: "Arial, sans-serif",
                        minHeight: "100px",
                        resize: "vertical",
                        boxSizing: "border-box",
                        background: "#fafbfc",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#6f0022")}
                      onBlur={(e) => (e.target.style.borderColor = "#d0d0d0")}
                    />
                  </div>

                  {/* Row 2: Discount, Valid From, Valid Until, Coupon Code */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr 1fr 1fr",
                      gap: "1.5rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          margin: "0 0 0.6rem",
                          color: "#333",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                        }}
                      >
                        Discount Percentage (Optional)
                      </label>
                      <input
                        type="number"
                        placeholder="0-100"
                        value={offerForm.discountPercentage}
                        onChange={(e) =>
                          setOfferForm({
                            ...offerForm,
                            discountPercentage: e.target.value,
                          })
                        }
                        min="0"
                        max="100"
                        step="0.01"
                        style={{
                          width: "100%",
                          padding: "0.85rem 1rem",
                          border: "1px solid #d0d0d0",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          fontFamily: "Arial, sans-serif",
                          boxSizing: "border-box",
                          background: "#fafbfc",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          margin: "0 0 0.6rem",
                          color: "#333",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                        }}
                      >
                        Discount Amount (Optional)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 500"
                        value={offerForm.discountAmount}
                        onChange={(e) =>
                          setOfferForm({
                            ...offerForm,
                            discountAmount: e.target.value,
                          })
                        }
                        min="0"
                        step="0.01"
                        style={{
                          width: "100%",
                          padding: "0.85rem 1rem",
                          border: "1px solid #d0d0d0",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          fontFamily: "Arial, sans-serif",
                          boxSizing: "border-box",
                          background: "#fafbfc",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          margin: "0 0 0.6rem",
                          color: "#333",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                        }}
                      >
                        Valid From *
                      </label>
                      <input
                        type="date"
                        value={offerForm.validFrom}
                        onChange={(e) =>
                          setOfferForm({
                            ...offerForm,
                            validFrom: e.target.value,
                          })
                        }
                        min={editingOfferId ? "" : todayDate}
                        style={{
                          width: "100%",
                          padding: "0.85rem 1rem",
                          border: "1px solid #d0d0d0",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          fontFamily: "Arial, sans-serif",
                          boxSizing: "border-box",
                          background: "#fafbfc",
                          cursor: "pointer",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          margin: "0 0 0.6rem",
                          color: "#333",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                        }}
                      >
                        Valid Until *
                      </label>
                      <input
                        type="date"
                        value={offerForm.validUntil}
                        onChange={(e) =>
                          setOfferForm({
                            ...offerForm,
                            validUntil: e.target.value,
                          })
                        }
                        min={editingOfferId ? "" : todayDate}
                        style={{
                          width: "100%",
                          padding: "0.85rem 1rem",
                          border: "1px solid #d0d0d0",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          fontFamily: "Arial, sans-serif",
                          boxSizing: "border-box",
                          background: "#fafbfc",
                          cursor: "pointer",
                        }}
                      />
                    </div>
                  </div>

                  {/* Coupon Code */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        margin: "0 0 0.6rem",
                        color: "#333",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      Coupon Code (will be converted to UPPERCASE) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., SUMMER21"
                      value={offerForm.couponCode}
                      onChange={(e) =>
                        setOfferForm({
                          ...offerForm,
                          couponCode: e.target.value.toUpperCase(),
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.85rem 1rem",
                        border: "1px solid #d0d0d0",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontFamily: "Arial, sans-serif",
                        boxSizing: "border-box",
                        background: "#fafbfc",
                      }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <button
                      type="submit"
                      disabled={isCreatingOffer}
                      style={{
                        padding: "0.9rem 2rem",
                        background: isCreatingOffer ? "#ccc" : "#6f0022",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        cursor: isCreatingOffer ? "not-allowed" : "pointer",
                        fontFamily: "Arial, sans-serif",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) =>
                        !isCreatingOffer &&
                        (e.target.style.background = "#8b0033")
                      }
                      onMouseLeave={(e) =>
                        !isCreatingOffer &&
                        (e.target.style.background = "#6f0022")
                      }
                    >
                      {isCreatingOffer
                        ? editingOfferId
                          ? "Updating..."
                          : "Creating..."
                        : editingOfferId
                          ? "Update Promotion"
                          : "Create Promotion"}
                    </button>
                    {editingOfferId && (
                      <button
                        type="button"
                        onClick={cancelEditOffer}
                        style={{
                          padding: "0.9rem 2rem",
                          background: "#f5f5f5",
                          color: "#666",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "Arial, sans-serif",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.background = "#efefef")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.background = "#f5f5f5")
                        }
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </section>

              {/* Offers List */}
              {offersLoading ? (
                <div
                  style={{
                    background: "#fff",
                    border: "1px dashed #d0d0d0",
                    borderRadius: "10px",
                    padding: "3rem 1.5rem",
                    textAlign: "center",
                  }}
                >
                  <p style={{ margin: 0, color: "#666", fontSize: "1rem" }}>
                    ⟳ Loading promotional offers...
                  </p>
                </div>
              ) : offers.length === 0 ? (
                <div
                  style={{
                    background: "#fff",
                    border: "1px dashed #d0d0d0",
                    borderRadius: "10px",
                    padding: "3rem 1.5rem",
                    textAlign: "center",
                  }}
                >
                  <p style={{ margin: 0, color: "#999", fontSize: "1rem" }}>
                    ◇ No campaigns yet
                  </p>
                  <p
                    style={{
                      margin: "0.5rem 0 0",
                      color: "#bbb",
                      fontSize: "0.9rem",
                    }}
                  >
                    Create your first campaign to get started
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "1.2rem" }}>
                  <h3
                    style={{
                      margin: "0 0 1rem",
                      color: "#1a1a1a",
                      fontSize: "1.1rem",
                      fontFamily: "Arial, sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    All Promotions ({offers.length})
                  </h3>
                  {offers.map((offer) => (
                    <div
                      key={offer._id}
                      style={{
                        background: "#fff",
                        border: "1px solid #e5e5e5",
                        borderRadius: "10px",
                        padding: isMobileView ? "1.25rem" : "1.5rem",
                        display: "grid",
                        gridTemplateColumns: isMobileView ? "1fr" : "1fr auto",
                        alignItems: "start",
                        gap: isMobileView ? "1.5rem" : "2rem",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 4px 12px rgba(0, 0, 0, 0.1)";
                        e.currentTarget.style.borderColor = "#d0d0d0";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 1px 3px rgba(0, 0, 0, 0.05)";
                        e.currentTarget.style.borderColor = "#e5e5e5";
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            marginBottom: "0.8rem",
                          }}
                        >
                          <h4
                            style={{
                              margin: 0,
                              color: "#1a1a1a",
                              fontSize: "1.1rem",
                              fontWeight: 600,
                            }}
                          >
                            {offer.title}
                            {offer.couponCode && (
                              <span
                                style={{
                                  marginLeft: "0.6rem",
                                  background: "#fff3cd",
                                  color: "#856404",
                                  padding: "0.15rem 0.6rem",
                                  borderRadius: "12px",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  verticalAlign: "middle",
                                }}
                              >
                                {offer.couponCode}
                              </span>
                            )}
                          </h4>
                          {offer.discountPercentage > 0 && (
                            <span
                              style={{
                                background: "#fff3cd",
                                color: "#856404",
                                padding: "0.25rem 0.75rem",
                                borderRadius: "20px",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                              }}
                            >
                              {offer.discountPercentage}% OFF
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            margin: "0 0 1rem",
                            color: "#555",
                            fontSize: "0.95rem",
                            lineHeight: 1.5,
                          }}
                        >
                          {offer.description}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            gap: "2rem",
                            fontSize: "0.9rem",
                            color: "#777",
                            flexWrap: "wrap"
                          }}
                        >
                          <div>
                            <span style={{ color: "#999" }}>◆ Valid From: </span>
                            <strong style={{ color: "#333" }}>
                              {offer.validFrom
                                ? new Date(
                                    offer.validFrom,
                                  ).toLocaleDateString()
                                : "-"}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: "#999" }}>
                              ◆ Valid Until: </span>
                            <strong style={{ color: "#333" }}>
                              {offer.validUntil
                                ? new Date(
                                    offer.validUntil,
                                  ).toLocaleDateString()
                                : "-"}
                            </strong>
                          </div>
                          {offer.discountPercentage > 0 && (
                            <div>
                              <span style={{ color: "#999" }}>Discount: </span>
                              <strong style={{ color: "#333" }}>
                                {offer.discountPercentage}%
                              </strong>
                            </div>
                          )}
                          {offer.discountAmount > 0 && (
                            <div>
                              <span style={{ color: "#999" }}>Discount: </span>
                              <strong style={{ color: "#333" }}>
                                Rs. {offer.discountAmount}
                              </strong>
                            </div>
                          )}
                          {offer.couponCode && (
                            <div>
                              <span style={{ color: "#999" }}>Code: </span>
                              <strong style={{ color: "#333" }}>
                                {offer.couponCode}
                              </strong>
                            </div>
                          )}
                          <div>
                            <span style={{ color: "#999" }}>✉ Sent To: </span>
                            <strong style={{ color: offer.recipientsCount > 0 ? "#28a745" : "#999" }}>
                              {offer.recipientsCount || 0} {offer.recipientsCount === 1 ? 'person' : 'people'}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div
                        style={{
                          display: "flex",
                          gap: "0.8rem",
                          flexDirection: isMobileView ? "row" : "column",
                          minWidth: isMobileView ? "auto" : "130px",
                          width: isMobileView ? "100%" : "auto",
                        }}
                      >
                        <button
                          onClick={() => sendOfferEmails(offer._id)}
                          style={{
                            padding: "0.75rem 1rem",
                            background: "#6f0022",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "Arial, sans-serif",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.target.style.background = "#8b0033")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.background = "#6f0022")
                          }
                        >
                          ✉ Send Email
                        </button>
                        <button
                          onClick={() => startEditOffer(offer)}
                          style={{
                            padding: "0.75rem 1rem",
                            background: "#f0f0f0",
                            color: "#333",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "Arial, sans-serif",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = "#e8e8e8";
                            e.target.style.borderColor = "#6f0022";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = "#f0f0f0";
                            e.target.style.borderColor = "#ddd";
                          }}
                        >
                          ✎ Edit
                        </button>
                        <button
                          onClick={() => deleteOffer(offer._id)}
                          style={{
                            padding: "0.75rem 1rem",
                            background: "#ffebee",
                            color: "#c33",
                            border: "1px solid #ffcdd2",
                            borderRadius: "6px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "Arial, sans-serif",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = "#ffcdd2";
                            e.target.style.color = "#933";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = "#ffebee";
                            e.target.style.color = "#c33";
                          }}
                        >
                          ✕ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MESSAGES TAB */}
          {activeTab === "messages" && (
            <div>
              {/* Header */}
              <div style={{ marginBottom: "2.5rem" }}>
                <h2
                  style={{
                    margin: "0 0 0.5rem",
                    color: "#FFFFFF",
                    fontSize: isMobileView ? "1.5rem" : "2rem",
                    fontWeight: 700,
                  }}
                >
                  Customer Messages
                </h2>
                <p style={{ margin: 0, color: "#666", fontSize: isMobileView ? "0.85rem" : "0.95rem" }}>
                  Manage customer inquiries and provide support
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobileView ? "1fr" : "280px 1fr",
                  gap: isMobileView ? "1rem" : "2rem",
                  minHeight: isMobileView ? "auto" : "600px",
                }}
              >
                {/* Chat List Sidebar */}
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: "12px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <div
                    style={{
                      padding: isMobileView ? "1.25rem" : "1.5rem",
                      borderBottom: "1px solid #e5e5e5",
                      background: "#f9f9f9",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        color: "#1a1a1a",
                        fontSize: isMobileView ? "0.95rem" : "1rem",
                        fontWeight: 600,
                      }}
                    >
                      Conversations
                    </h3>
                    <p
                      style={{
                        margin: "0.3rem 0 0",
                        color: "#888",
                        fontSize: "0.8rem",
                      }}
                    >
                      {chats.length} {chats.length === 1 ? "chat" : "chats"}
                    </p>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      padding: isMobileView ? "0.6rem" : "0.8rem",
                      display: "grid",
                      gap: isMobileView ? "0.5rem" : "0.6rem",
                    }}
                  >
                    {chats.length === 0 ? (
                      <p
                        style={{
                          color: "#aaa",
                          fontSize: "0.9rem",
                          textAlign: "center",
                          padding: "2rem 1rem",
                        }}
                      >
                        No conversations yet
                      </p>
                    ) : (
                      chats.map((chat) => {
                        const isSelected = selectedChat?._id === chat._id;
                        return (
                          <div
                            key={chat._id}
                            onClick={() => selectChat(chat)}
                            style={{
                              padding: "1rem",
                              background: isSelected ? "#6f0022" : "#fff",
                              border: isSelected ? "none" : "1px solid #e5e5e5",
                              borderRadius: "8px",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              boxShadow: isSelected
                                ? "0 2px 8px rgba(111, 0, 34, 0.15)"
                                : "none",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = "#f9f9f9";
                                e.currentTarget.style.borderColor = "#d0d0d0";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = "#fff";
                                e.currentTarget.style.borderColor = "#e5e5e5";
                              }
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontWeight: "600",
                                color: isSelected ? "#fff" : "#333",
                                fontSize: "0.95rem",
                              }}
                            >
                              {chat.customerName}
                            </p>
                            <p
                              style={{
                                margin: "0.4rem 0 0",
                                color: isSelected ? "#e0bf63" : "#666",
                                fontSize: "0.8rem",
                              }}
                            >
                              {chat.customerEmail}
                            </p>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                marginTop: "0.6rem",
                                fontSize: "0.75rem",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background:
                                    chat.status === "active"
                                      ? "#10b981"
                                      : chat.status === "pending"
                                        ? "#f59e0b"
                                        : "#888",
                                }}
                              />
                              <span
                                style={{ color: isSelected ? "#fff" : "#888" }}
                              >
                                {chat.status}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Chat Detail */}
                {selectedChat ? (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid #e5e5e5",
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    {/* Chat Header */}
                    <div
                      style={{
                        padding: isMobileView ? "1.25rem" : "1.5rem",
                        borderBottom: "1px solid #e5e5e5",
                        background:
                          "linear-gradient(135deg, #6f0022 0%, #8b0033 100%)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "start",
                          justifyContent: "space-between",
                          gap: isMobileView ? "1rem" : "0",
                          flexDirection: isMobileView ? "column" : "row",
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              margin: 0,
                              color: "#fff",
                              fontSize: isMobileView ? "1rem" : "1.2rem",
                              fontWeight: 600,
                            }}
                          >
                            {selectedChat.customerName}
                          </h3>
                          <p
                            style={{
                              margin: "0.5rem 0 0",
                              color: "#e0bf63",
                              fontSize: "0.9rem",
                            }}
                          >
                            {selectedChat.customerEmail}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: isMobileView ? "wrap" : "nowrap" }}>
                          {["active", "pending", "resolved"].map((status) => (
                            <button
                              key={status}
                              onClick={() =>
                                updateChatStatus(selectedChat._id, status)
                              }
                              style={{
                                padding: "0.5rem 1rem",
                                background:
                                  status === selectedChat.status
                                    ? "#fff"
                                    : "rgba(255,255,255,0.2)",
                                color:
                                  status === selectedChat.status
                                    ? "#6f0022"
                                    : "#fff",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                if (status !== selectedChat.status) {
                                  e.target.style.background =
                                    "rgba(255,255,255,0.3)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (status !== selectedChat.status) {
                                  e.target.style.background =
                                    "rgba(255,255,255,0.2)";
                                }
                              }}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: isMobileView ? "1rem" : "1.5rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: isMobileView ? "0.75rem" : "1rem",
                      }}
                    >
                      {chatMessages.length === 0 ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            color: "#aaa",
                            fontSize: "0.95rem",
                          }}
                        >
                          ✉ No messages yet
                        </div>
                      ) : (
                        chatMessages.map((msg, idx) => {
                          const isStaff = msg.sender === "care-manager";
                          const isHovered = hoveredMessageIndex === idx;
                          return (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                justifyContent: isStaff
                                  ? "flex-start"
                                  : "flex-end",
                                alignItems: "flex-end",
                                gap: "0.5rem",
                              }}
                              onMouseEnter={() => setHoveredMessageIndex(idx)}
                              onMouseLeave={() => setHoveredMessageIndex(null)}
                            >
                              <div
                                style={{
                                  maxWidth: isMobileView ? "85%" : "70%",
                                  background: isStaff ? "#6f0022" : "#f0f0f0",
                                  color: isStaff ? "#fff" : "#333",
                                  borderRadius: "12px",
                                  padding: isMobileView ? "0.85rem" : "1rem",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                }}
                              >
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "0.85rem",
                                    fontWeight: "600",
                                    color: isStaff ? "#e0bf63" : "#999",
                                  }}
                                >
                                  {msg.senderName}
                                </p>
                                <p
                                  style={{
                                    margin: "0.6rem 0 0",
                                    color: isStaff ? "#fff" : "#333",
                                    fontSize: "0.95rem",
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {msg.message}
                                </p>
                                <p
                                  style={{
                                    margin: "0.6rem 0 0",
                                    color: isStaff ? "#e0bf63" : "#888",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  {new Date(msg.timestamp).toLocaleDateString()}{" "}
                                  {new Date(msg.timestamp).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </p>
                              </div>
                              {isHovered && isStaff && (
                                <button
                                  onClick={() =>
                                    deleteMessage(selectedChat._id, idx)
                                  }
                                  style={{
                                    background: "#ffebee",
                                    color: "#c33",
                                    border: "none",
                                    borderRadius: "6px",
                                    width: "32px",
                                    height: "32px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    fontSize: "1rem",
                                    transition: "all 0.2s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.background = "#ffcdd2";
                                    e.target.style.color = "#933";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.background = "#ffebee";
                                    e.target.style.color = "#c33";
                                  }}
                                  title="Delete message"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Reply Box */}
                    <div
                      style={{
                        padding: isMobileView ? "1rem" : "1.5rem",
                        borderTop: "1px solid #e5e5e5",
                        background: "#f9f9f9",
                        display: "grid",
                        gap: "0.75rem",
                      }}
                    >
                      <textarea
                        placeholder="Type your reply here..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        style={{
                          padding: "0.85rem 1rem",
                          border: "1px solid #d0d0d0",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          fontFamily: "Arial, sans-serif",
                          minHeight: "80px",
                          resize: "vertical",
                          boxSizing: "border-box",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "#6f0022")
                        }
                        onBlur={(e) => (e.target.style.borderColor = "#d0d0d0")}
                      />
                      <button
                        onClick={sendChatReply}
                        disabled={!replyText.trim()}
                        style={{
                          padding: "0.85rem 2rem",
                          background: replyText.trim() ? "#6f0022" : "#ccc",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          fontWeight: "600",
                          cursor: replyText.trim() ? "pointer" : "not-allowed",
                          fontFamily: "Arial, sans-serif",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (replyText.trim()) {
                            e.target.style.background = "#8b0033";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (replyText.trim()) {
                            e.target.style.background = "#6f0022";
                          }
                        }}
                      >
                        ↳ Send Reply
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid #e5e5e5",
                      borderRadius: "12px",
                      padding: "3rem 2rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#aaa",
                      textAlign: "center",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: "1rem", color: "#999" }}>
                        ✉ Select a conversation
                      </p>
                      <p
                        style={{
                          margin: "0.5rem 0 0",
                          color: "#bbb",
                          fontSize: "0.9rem",
                        }}
                      >
                        Choose a customer from the list to view and reply to
                        their messages
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REVIEWS TAB */}
          {activeTab === "reviews" && (
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "0.75rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    background: "#fafbfc",
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: "1rem",
                    textAlign: "center",
                  }}
                >
                  <p style={{ margin: 0, color: "#666", fontSize: "0.9rem" }}>
                    Pending
                  </p>
                  <h2
                    style={{
                      margin: "0.5rem 0 0",
                      color: "#f39c12",
                      fontSize: "1.8rem",
                    }}
                  >
                    {reviewStats.pending}
                  </h2>
                </div>
                <div
                  style={{
                    background: "#fafbfc",
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: "1rem",
                    textAlign: "center",
                  }}
                >
                  <p style={{ margin: 0, color: "#666", fontSize: "0.9rem" }}>
                    Approved
                  </p>
                  <h2
                    style={{
                      margin: "0.5rem 0 0",
                      color: "#27ae60",
                      fontSize: "1.8rem",
                    }}
                  >
                    {reviewStats.approved}
                  </h2>
                </div>
                <div
                  style={{
                    background: "#fafbfc",
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: "1rem",
                    textAlign: "center",
                  }}
                >
                  <p style={{ margin: 0, color: "#666", fontSize: "0.9rem" }}>
                    Rejected
                  </p>
                  <h2
                    style={{
                      margin: "0.5rem 0 0",
                      color: "#e74c3c",
                      fontSize: "1.8rem",
                    }}
                  >
                    {reviewStats.rejected}
                  </h2>
                </div>
              </div>

              <div style={{ display: "grid", gap: "0.8rem" }}>
                {reviews.length === 0 ? (
                  <p
                    style={{
                      color: "#999",
                      textAlign: "center",
                      padding: "2rem",
                    }}
                  >
                    No reviews yet
                  </p>
                ) : (
                  reviews.map((review) => (
                    <div
                      key={review._id}
                      style={{
                        background: "#fafbfc",
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: "1rem",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          alignItems: "start",
                          gap: "1rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              alignItems: "center",
                              marginBottom: "0.4rem",
                            }}
                          >
                            <h4
                              style={{
                                margin: 0,
                                color: "#6f0022",
                                fontSize: "0.95rem",
                              }}
                            >
                              {review.customerName} • {review.productName}
                            </h4>
                            <span
                              style={{
                                background:
                                  review.status === "approved"
                                    ? "#d4edda"
                                    : review.status === "rejected"
                                      ? "#f8d7da"
                                      : "#fff3cd",
                                color:
                                  review.status === "approved"
                                    ? "#155724"
                                    : review.status === "rejected"
                                      ? "#721c24"
                                      : "#856404",
                                padding: "0.2rem 0.6rem",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                borderRadius: 4,
                                textTransform: "capitalize",
                              }}
                            >
                              {review.status}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: "0.3rem 0",
                              color: "#6f0022",
                              fontSize: "0.9rem",
                              fontWeight: "600",
                            }}
                          >
                            {"⭐".repeat(review.rating)} ({review.rating}/5) -{" "}
                            {review.title}
                          </p>
                          <p
                            style={{
                              margin: "0.3rem 0 0",
                              color: "#333",
                              fontSize: "0.9rem",
                            }}
                          >
                            {review.comment}
                          </p>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                          }}
                        >
                          {review.status === "pending" && (
                            <>
                              <button
                                onClick={() =>
                                  setSelectedReview(
                                    selectedReview?._id === review._id
                                      ? null
                                      : review,
                                  )
                                }
                                style={{
                                  padding: "0.5rem 0.8rem",
                                  background: "#27ae60",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 6,
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                  fontFamily: "Arial, sans-serif",
                                }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  updateReviewStatus(review._id, "rejected")
                                }
                                style={{
                                  padding: "0.5rem 0.8rem",
                                  background: "#e74c3c",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 6,
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                  fontFamily: "Arial, sans-serif",
                                }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {review.status === "approved" && (
                            <button
                              onClick={() =>
                                setSelectedReview(
                                  selectedReview?._id === review._id
                                    ? null
                                    : review,
                                )
                              }
                              style={{
                                padding: "0.5rem 0.8rem",
                                background: "#3498db",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                fontSize: "0.8rem",
                                cursor: "pointer",
                                fontFamily: "Arial, sans-serif",
                              }}
                            >
                              Add Reply
                            </button>
                          )}
                          <button
                            onClick={() => deleteReview(review._id)}
                            style={{
                              padding: "0.5rem 0.8rem",
                              background: "#fff",
                              color: "#666",
                              border: "1px solid #ddd",
                              borderRadius: 6,
                              fontSize: "0.8rem",
                              cursor: "pointer",
                              fontFamily: "Arial, sans-serif",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Reply Section */}
                      {selectedReview?._id === review._id && (
                        <div
                          style={{
                            background: "#fff",
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            padding: "1rem",
                            marginTop: "1rem",
                            display: "grid",
                            gap: "0.5rem",
                          }}
                        >
                          {review.staffReply?.reply && (
                            <div
                              style={{
                                background: "#f5f5f5",
                                padding: "0.8rem",
                                borderRadius: 6,
                                marginBottom: "0.5rem",
                              }}
                            >
                              <p
                                style={{
                                  margin: 0,
                                  color: "#666",
                                  fontSize: "0.85rem",
                                  fontWeight: "600",
                                }}
                              >
                                Staff Reply:
                              </p>
                              <p
                                style={{
                                  margin: "0.3rem 0 0",
                                  color: "#333",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {review.staffReply.reply}
                              </p>
                            </div>
                          )}
                          {review.status === "pending" && (
                            <>
                              <textarea
                                placeholder="Add staff reply..."
                                value={staffReply}
                                onChange={(e) => setStaffReply(e.target.value)}
                                style={{
                                  padding: "0.6rem",
                                  border: "1px solid #ddd",
                                  borderRadius: 6,
                                  fontSize: "0.9rem",
                                  fontFamily: "Arial, sans-serif",
                                  minHeight: "60px",
                                }}
                              />
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button
                                  onClick={() =>
                                    updateReviewStatus(
                                      review._id,
                                      "approved",
                                      staffReply,
                                    )
                                  }
                                  style={{
                                    flex: 1,
                                    padding: "0.5rem",
                                    background: "#27ae60",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 6,
                                    fontSize: "0.9rem",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    fontFamily: "Arial, sans-serif",
                                  }}
                                >
                                  Approve with Reply
                                </button>
                                <button
                                  onClick={() => setSelectedReview(null)}
                                  style={{
                                    flex: 1,
                                    padding: "0.5rem",
                                    background: "#fff",
                                    color: "#666",
                                    border: "1px solid #ddd",
                                    borderRadius: 6,
                                    fontSize: "0.9rem",
                                    cursor: "pointer",
                                    fontFamily: "Arial, sans-serif",
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          )}
                          {review.status === "approved" && (
                            <>
                              <textarea
                                placeholder="Update staff reply..."
                                value={staffReply}
                                onChange={(e) => setStaffReply(e.target.value)}
                                style={{
                                  padding: "0.6rem",
                                  border: "1px solid #ddd",
                                  borderRadius: 6,
                                  fontSize: "0.9rem",
                                  fontFamily: "Arial, sans-serif",
                                  minHeight: "60px",
                                }}
                              />
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button
                                  onClick={() =>
                                    updateReviewStatus(
                                      review._id,
                                      "approved",
                                      staffReply,
                                    )
                                  }
                                  style={{
                                    flex: 1,
                                    padding: "0.5rem",
                                    background: "#3498db",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 6,
                                    fontSize: "0.9rem",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    fontFamily: "Arial, sans-serif",
                                  }}
                                >
                                  Update Reply
                                </button>
                                <button
                                  onClick={() => setSelectedReview(null)}
                                  style={{
                                    flex: 1,
                                    padding: "0.5rem",
                                    background: "#fff",
                                    color: "#666",
                                    border: "1px solid #ddd",
                                    borderRadius: 6,
                                    fontSize: "0.9rem",
                                    cursor: "pointer",
                                    fontFamily: "Arial, sans-serif",
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* APPOINTMENTS TAB */}
          {activeTab === "appointments" && (
            <div>
              {/* Header */}
              <div style={{ marginBottom: "2.5rem" }}>
                <h2
                  style={{
                    margin: "0 0 0.5rem",
                    color: "#FFFFFF",
                    fontSize: isMobileView ? "1.5rem" : "2rem",
                    fontWeight: 700,
                  }}
                >
                  Appointment Slots Management
                </h2>
                <p style={{ margin: 0, color: "#666", fontSize: isMobileView ? "0.85rem" : "0.95rem" }}>
                  Create, manage, and track appointment slots
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    background: "#fff3cd",
                    border: "1px solid #ffc107",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "2rem",
                    color: "#856404",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>⚠ {error}</div>
                  <button
                    onClick={() => setError("")}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "1.2rem",
                      cursor: "pointer",
                      color: "#856404",
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div
                  style={{
                    background: "#d4edda",
                    border: "1px solid #28a745",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "2rem",
                    color: "#155724",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>✓ {successMessage}</div>
                  <button
                    onClick={() => setSuccessMessage("")}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "1.2rem",
                      cursor: "pointer",
                      color: "#155724",
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Stats Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobileView ? "1fr 1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: isMobileView ? "1rem" : "1.5rem",
                  marginBottom: "2rem",
                }}
              >
                <div
                  style={{
                    background: "#800020",
                    borderRadius: "10px",
                    padding: isMobileView ? "1.25rem" : "1.5rem",
                    color: "#fff",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#d4af37",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                    }}
                  >
                    Total Appointments
                  </p>
                  <h3
                    style={{
                      margin: "0.8rem 0 0",
                      fontSize: isMobileView ? "1.5rem" : "2rem",
                      fontWeight: 700,
                      color: "#d4af37",
                    }}
                  >
                    {appointmentStats.total}
                  </h3>
                </div>
                <div
                  style={{
                    background: "#800020",
                    borderRadius: "10px",
                    padding: isMobileView ? "1.25rem" : "1.5rem",
                    color: "#fff",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#d4af37",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                    }}
                  >
                    Completed
                  </p>
                  <h3
                    style={{
                      margin: "0.8rem 0 0",
                      fontSize: isMobileView ? "1.5rem" : "2rem",
                      fontWeight: 700,
                      color: "#d4af37",
                    }}
                  >
                    {appointmentStats.completed}
                  </h3>
                </div>
                <div
                  style={{
                    background: "#800020",
                    borderRadius: "10px",
                    padding: isMobileView ? "1.25rem" : "1.5rem",
                    color: "#fff",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#d4af37",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                    }}
                  >
                    No-Shows
                  </p>
                  <h3
                    style={{
                      margin: "0.8rem 0 0",
                      fontSize: isMobileView ? "1.5rem" : "2rem",
                      fontWeight: 700,
                      color: "#d4af37",
                    }}
                  >
                    {appointmentStats.noShow}
                  </h3>
                </div>
                <div
                  style={{
                    background: "#800020",
                    borderRadius: "10px",
                    padding: isMobileView ? "1.25rem" : "1.5rem",
                    color: "#fff",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#d4af37",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                    }}
                  >
                    Cancelled
                  </p>
                  <h3
                    style={{
                      margin: "0.8rem 0 0",
                      fontSize: isMobileView ? "1.5rem" : "2rem",
                      fontWeight: 700,
                      color: "#d4af37",
                    }}
                  >
                    {appointmentStats.cancelled}
                  </h3>
                </div>
              </div>

              {/* Create Slot Form */}
              <section
                style={{
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: "12px",
                  padding: isMobileView ? "1.5rem" : "2rem",
                  marginBottom: "2rem",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 1.5rem",
                    color: "#1a1a1a",
                    fontSize: isMobileView ? "1.1rem" : "1.3rem",
                    fontWeight: 600,
                  }}
                >
                  {editingSlotId ? "✎ Edit Slot" : "✚ Create New Slot"}
                </h3>
                <form
                  onSubmit={createOrUpdateSlot}
                  style={{ display: "grid", gap: "1.5rem" }}
                >
                  {/* Date Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        margin: "0 0 0.6rem",
                        color: "#333",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      Date *
                    </label>
                    <input
                      type="date"
                      value={slotForm.date}
                      onChange={(e) =>
                        setSlotForm({ ...slotForm, date: e.target.value })
                      }
                      min={todayDate}
                      style={{
                        width: "100%",
                        padding: "0.85rem 1rem",
                        border: "1px solid #d0d0d0",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        boxSizing: "border-box",
                        background: "#fafbfc",
                      }}
                    />
                    <p
                      style={{
                        margin: "0.4rem 0 0",
                        fontSize: "0.75rem",
                        color: "#666",
                        fontStyle: "italic",
                      }}
                    >
                      Only current and future dates are allowed
                    </p>
                  </div>

                  {/* Time Slot Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        margin: "0 0 0.6rem",
                        color: "#333",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      Time Slot (7 AM - 10 PM) *
                    </label>
                    <select
                      value={slotForm.timeSlotIndex}
                      onChange={(e) =>
                        setSlotForm({
                          ...slotForm,
                          timeSlotIndex: parseInt(e.target.value),
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.85rem 1rem",
                        border: "1px solid #d0d0d0",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        boxSizing: "border-box",
                        background: "#fafbfc",
                        cursor: "pointer",
                        color: "#333",
                      }}
                    >
                      {FIXED_TIME_SLOTS.map((slot, idx) => (
                        <option key={idx} value={idx}>
                          {slot.display}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Appointment Type Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        margin: "0 0 0.6rem",
                        color: "#333",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      Appointment Type
                    </label>
                    <select
                      value={slotForm.type}
                      onChange={(e) =>
                        setSlotForm({
                          ...slotForm,
                          type: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.85rem 1rem",
                        border: "1px solid #d0d0d0",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        boxSizing: "border-box",
                        background: "#fafbfc",
                        cursor: "pointer",
                        color: "#333",
                      }}
                    >
                      {APPOINTMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Capacity Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        margin: "0 0 0.6rem",
                        color: "#333",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      Capacity
                    </label>
                    <input
                      type="number"
                      value={slotForm.capacity}
                      onChange={(e) =>
                        setSlotForm({
                          ...slotForm,
                          capacity: parseInt(e.target.value),
                        })
                      }
                      min="1"
                      style={{
                        width: "100%",
                        padding: "0.85rem 1rem",
                        border: "1px solid #d0d0d0",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        boxSizing: "border-box",
                        background: "#fafbfc",
                      }}
                    />
                  </div>

                  {/* Block Slot Field */}
                  <div>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        color: "#333",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={slotForm.isBlocked}
                        onChange={(e) =>
                          setSlotForm({
                            ...slotForm,
                            isBlocked: e.target.checked,
                          })
                        }
                        style={{
                          width: "18px",
                          height: "18px",
                          cursor: "pointer",
                        }}
                      />
                      Block Slot?
                    </label>
                  </div>

                  {/* Block Reason Field */}
                  {slotForm.isBlocked && (
                    <div>
                      <label
                        style={{
                          display: "block",
                          margin: "0 0 0.6rem",
                          color: "#333",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                        }}
                      >
                        Block Reason
                      </label>
                      <select
                        value={slotForm.blockReason}
                        onChange={(e) =>
                          setSlotForm({
                            ...slotForm,
                            blockReason: e.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "0.85rem 1rem",
                          border: "1px solid #d0d0d0",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          boxSizing: "border-box",
                          background: "#fafbfc",
                          cursor: "pointer",
                        }}
                      >
                        <option value="">Select reason...</option>
                        {BLOCK_REASONS.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: "1rem", flexWrap: isMobileView ? "wrap" : "nowrap" }}>
                    <button
                      type="submit"
                      style={{
                        padding: "0.9rem 2rem",
                        background: "#6f0022",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        flex: isMobileView ? "1" : "auto",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.background = "#8b0033")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.background = "#6f0022")
                      }
                    >
                      {editingSlotId ? "Update Slot" : "Create Slot"}
                    </button>
                    {editingSlotId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSlotId(null);
                          setSlotForm({
                            date: "",
                            timeSlotIndex: 0,
                            type: APPOINTMENT_TYPES[0],
                            capacity: 1,
                            assignedStaff: "",
                            isBlocked: false,
                            blockReason: "",
                          });
                        }}
                        style={{
                          padding: "0.9rem 2rem",
                          background: "#f5f5f5",
                          color: "#666",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          flex: isMobileView ? "1" : "auto",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.background = "#efefef")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.background = "#f5f5f5")
                        }
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </section>

              {/* Slots List */}
              <div style={{ display: "grid", gap: "1.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3
                    style={{
                      margin: 0,
                      color: "#FFFFFF",
                      fontSize: "1.1rem",
                      fontWeight: 600,
                    }}
                  >
                    Available Slots
                  </h3>
                  <button
                    onClick={() => {
                      loadSlots();
                      loadAppointments();
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "var(--brand-burgundy)",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.opacity = "0.9";
                      e.target.style.transform = "scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.opacity = "1";
                      e.target.style.transform = "scale(1)";
                    }}
                  >
                    🔄 Refresh
                  </button>
                </div>
                {slots.length === 0 ? (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px dashed #d0d0d0",
                      borderRadius: "10px",
                      padding: "2rem",
                      textAlign: "center",
                    }}
                  >
                    <p style={{ margin: 0, color: "#999", fontSize: "1rem" }}>
                      ◇ No slots created yet
                    </p>
                  </div>
                ) : (
                  slots.map((slot) => (
                    <div
                      key={slot._id}
                      style={{
                        background: "#fff",
                        border: "1px solid #e5e5e5",
                        borderRadius: "10px",
                        padding: "1.5rem",
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        alignItems: "center",
                        gap: "2rem",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            marginBottom: "0.8rem",
                          }}
                        >
                          <h4
                            style={{
                              margin: 0,
                              color: "#1a1a1a",
                              fontSize: "1.1rem",
                              fontWeight: 600,
                            }}
                          >
                            {slot.type}
                          </h4>
                          <span
                            style={{
                              background: slot.isBlocked
                                ? "#ff6b6b"
                                : slot.bookedCount < slot.capacity
                                  ? "#d4edda"
                                  : "#fff3cd",
                              color: slot.isBlocked ? "#fff" : "#333",
                              padding: "0.25rem 0.75rem",
                              borderRadius: "20px",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                            }}
                          >
                            {slot.isBlocked
                              ? "Blocked: " + slot.blockReason
                              : slot.bookedCount +
                                "/" +
                                slot.capacity +
                                " booked"}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: "0.5rem 0",
                            color: "#555",
                            fontSize: "0.95rem",
                          }}
                        >
                          📅 {new Date(slot.date).toLocaleDateString()} | ⏰{" "}
                          {slot.startTime} - {slot.endTime}
                        </p>
                        {slot.internalNotes && (
                          <p
                            style={{
                              margin: "0.5rem 0 0",
                              color: "#999",
                              fontSize: "0.85rem",
                            }}
                          >
                            📝 {slot.internalNotes}
                          </p>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.8rem",
                          flexDirection: "column",
                        }}
                      >
                        <button
                          onClick={() => {
                            const slotIndex = FIXED_TIME_SLOTS.findIndex(
                              (s) =>
                                s.start === slot.startTime &&
                                s.end === slot.endTime,
                            );
                            setEditingSlotId(slot._id);
                            setSlotForm({
                              date: slot.date.split("T")[0],
                              timeSlotIndex: slotIndex >= 0 ? slotIndex : 0,
                              type: slot.type,
                              capacity: slot.capacity,
                              assignedStaff: slot.assignedStaff,
                              isBlocked: slot.isBlocked,
                              blockReason: slot.blockReason,
                            });
                          }}
                          style={{
                            padding: "0.75rem 1rem",
                            background: "#f0f0f0",
                            color: "#333",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          ✎ Edit
                        </button>
                        <button
                          onClick={() => deleteSlot(slot._id)}
                          style={{
                            padding: "0.75rem 1rem",
                            background: "#ffebee",
                            color: "#c33",
                            border: "1px solid #ffcdd2",
                            borderRadius: "6px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          ✕ Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Upcoming Appointments */}
              <div style={{ marginTop: "3rem" }}>
                <h3
                  style={{
                    margin: "0 0 1rem",
                    color: "#FFFFFF",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                  }}
                >
                  Upcoming Appointments
                </h3>
                <div style={{ display: "grid", gap: "1.2rem" }}>
                  {appointments.filter((a) => a.status === "confirmed")
                    .length === 0 ? (
                    <p
                      style={{
                        color: "#999",
                        textAlign: "center",
                        padding: "2rem",
                      }}
                    >
                      No confirmed appointments
                    </p>
                  ) : (
                    appointments
                      .filter((a) => a.status === "confirmed")
                      .map((apt) => (
                        <div
                          key={apt._id}
                          style={{
                            background: "#fff",
                            border: "1px solid #e5e5e5",
                            borderRadius: "10px",
                            padding: "1.5rem",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(0,0,0,0.1)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.boxShadow =
                              "0 1px 3px rgba(0, 0, 0, 0.05)")
                          }
                          onClick={() => setSelectedAppointment(apt)}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "start",
                              justifyContent: "space-between",
                            }}
                          >
                            <div>
                              <h4
                                style={{
                                  margin: 0,
                                  color: "#1a1a1a",
                                  fontSize: "1rem",
                                  fontWeight: 600,
                                }}
                              >
                                {apt.customerName}
                              </h4>
                              <p
                                style={{
                                  margin: "0.5rem 0 0",
                                  color: "#555",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {apt.appointmentType}
                              </p>
                              <p
                                style={{
                                  margin: "0.3rem 0 0",
                                  color: "#999",
                                  fontSize: "0.85rem",
                                }}
                              >
                                📅 {new Date(apt.date).toLocaleDateString()} |
                                ⏰ {apt.startTime}
                              </p>
                              {apt.isVIP && (
                                <span
                                  style={{
                                    background: "#fff3cd",
                                    color: "#856404",
                                    padding: "0.25rem 0.75rem",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    marginTop: "0.5rem",
                                    display: "inline-block",
                                  }}
                                >
                                  ⭐ VIP Customer
                                </span>
                              )}
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <p
                                style={{
                                  margin: 0,
                                  color: "#555",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {apt.customerEmail}
                              </p>
                              <p
                                style={{
                                  margin: "0.3rem 0 0",
                                  color: "#999",
                                  fontSize: "0.85rem",
                                }}
                              >
                                {apt.customerPhone || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Appointment Detail Modal */}
              {selectedAppointment && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                  }}
                  onClick={() => setSelectedAppointment(null)}
                >
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      padding: "2rem",
                      maxWidth: "500px",
                      width: "90%",
                      maxHeight: "80vh",
                      overflowY: "auto",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3
                      style={{
                        margin: "0 0 1.5rem",
                        color: "#1a1a1a",
                        fontSize: "1.3rem",
                        fontWeight: 600,
                      }}
                    >
                      Appointment Details
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gap: "1rem",
                        marginBottom: "1.5rem",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: 0,
                            color: "#666",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                          }}
                        >
                          Customer
                        </p>
                        <p
                          style={{
                            margin: "0.3rem 0 0",
                            color: "#333",
                            fontSize: "0.95rem",
                          }}
                        >
                          {selectedAppointment.customerName}
                        </p>
                      </div>
                      <div>
                        <p
                          style={{
                            margin: 0,
                            color: "#666",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                          }}
                        >
                          Appointment Type
                        </p>
                        <p
                          style={{
                            margin: "0.3rem 0 0",
                            color: "#333",
                            fontSize: "0.95rem",
                          }}
                        >
                          {selectedAppointment.appointmentType}
                        </p>
                      </div>
                      <div>
                        <label
                          style={{
                            display: "block",
                            margin: "0 0 0.6rem",
                            color: "#333",
                            fontSize: "0.9rem",
                            fontWeight: 500,
                          }}
                        >
                          Status
                        </label>
                        <select
                          value={
                            appointmentStatusForm.status ||
                            selectedAppointment.status
                          }
                          onChange={(e) =>
                            setAppointmentStatusForm({
                              ...appointmentStatusForm,
                              status: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "0.6rem",
                            border: "1px solid #d0d0d0",
                            borderRadius: "6px",
                            boxSizing: "border-box",
                          }}
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="no-show">No-Show</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div>
                        <label
                          style={{
                            display: "block",
                            margin: "0 0 0.6rem",
                            color: "#333",
                            fontSize: "0.9rem",
                            fontWeight: 500,
                          }}
                        >
                          Internal Notes
                        </label>
                        <textarea
                          value={appointmentStatusForm.internalNotesAfter}
                          onChange={(e) =>
                            setAppointmentStatusForm({
                              ...appointmentStatusForm,
                              internalNotesAfter: e.target.value,
                            })
                          }
                          placeholder="Add notes..."
                          style={{
                            width: "100%",
                            padding: "0.6rem",
                            border: "1px solid #d0d0d0",
                            borderRadius: "6px",
                            fontSize: "0.9rem",
                            minHeight: "60px",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <button
                        onClick={() =>
                          updateAppointmentStatus(
                            selectedAppointment._id,
                            appointmentStatusForm.status ||
                              selectedAppointment.status,
                            appointmentStatusForm.internalNotesAfter,
                          )
                        }
                        style={{
                          flex: 1,
                          padding: "0.75rem",
                          background: "#6f0022",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Update Status
                      </button>
                      <button
                        onClick={() => setSelectedAppointment(null)}
                        style={{
                          flex: 1,
                          padding: "0.75rem",
                          background: "#f5f5f5",
                          color: "#666",
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#470012",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          zIndex: 210,
          boxShadow: "0 -2px 12px rgba(0, 0, 0, 0.3)",
          height: "70px",
          paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
        }}
      >
        {[
          {
            id: "overview",
            icon: FiBarChart2,
            label: "Overview",
          },
          { id: "offers", icon: FiGift, label: "Offers" },
          {
            id: "messages",
            icon: FiMessageCircle,
            label: "Messages",
          },
          { id: "reviews", icon: FiStar, label: "Reviews" },
          {
            id: "appointments",
            icon: FiCalendar,
            label: "Slots",
          },
        ].map((item) => {
          const isActive = activeTab === item.id;
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.3rem",
                flex: 1,
                height: "100%",
                background: "transparent",
                color: isActive ? "#e0bf63" : "rgba(255, 255, 255, 0.6)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s",
                borderTop: isActive ? "3px solid #e0bf63" : "3px solid transparent",
                fontSize: "0.65rem",
                fontFamily: "Arial, sans-serif",
                fontWeight: isActive ? 600 : 500,
                padding: "0 0.5rem",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = "rgba(224, 191, 99, 0.8)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
                }
              }}
              title={item.label}
            >
              <IconComponent size={24} />
              <span style={{ textAlign: "center", maxWidth: "50px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
            </button>
          );
        })}

        {/* Logout Button */}
        <button
          onClick={() => authManager.logout()}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.3rem",
            flex: 1,
            height: "100%",
            background: "transparent",
            color: "rgba(255, 255, 255, 0.6)",
            border: "none",
            cursor: "pointer",
            transition: "all 0.3s",
            borderTop: "3px solid transparent",
            fontSize: "0.65rem",
            fontFamily: "Arial, sans-serif",
            fontWeight: 500,
            padding: "0 0.5rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgba(255, 100, 100, 0.8)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
          }}
          title="Logout"
        >
          <FiLogOut size={24} />
          <span style={{ textAlign: "center", maxWidth: "50px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Logout</span>
        </button>
      </nav>
    </div>
  );
}
