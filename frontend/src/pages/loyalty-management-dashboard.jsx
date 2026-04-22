import { useEffect, useMemo, useState } from 'react';
import authManager from '../auth.js';
import { FiUsers, FiSettings, FiGift, FiLogOut, FiStar, FiTrendingUp, FiPlus, FiEdit2, FiList, FiMail, FiTrash2, FiLoader } from 'react-icons/fi';

// Add CSS animation for loading spinner
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('style[data-loyalty-spinner]')) {
  style.setAttribute('data-loyalty-spinner', 'true');
  document.head.appendChild(style);
}

const TIER_OPTIONS = ['Silver', 'Gold', 'Platinum'];
const OFFER_TIER_OPTIONS = ['All', 'Silver', 'Gold', 'Platinum'];

const emptyOfferForm = {
  title: '',
  description: '',
  tierType: 'All',
  discountPercentage: '',
  discountAmount: '',
  validFrom: '',
  validUntil: '',
  couponCode: ''
};

export default function LoyaltyManagementDashboardPage() {
  const [staffUser, setStaffUser] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [activeSection, setActiveSection] = useState('memberAnalysis');
  const [offers, setOffers] = useState([]);
  const [offerForm, setOfferForm] = useState(emptyOfferForm);
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [busyOfferId, setBusyOfferId] = useState('');
  const [busyCouponOfferId, setBusyCouponOfferId] = useState('');
  const [error, setError] = useState('');
  const [editingPointsId, setEditingPointsId] = useState(null);
  const [editingPointsValue, setEditingPointsValue] = useState('');
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);

  const navItems = [
    { key: 'memberAnalysis', icon: FiUsers, label: 'Member Analysis' },
    { key: 'tierConfiguration', icon: FiSettings, label: 'Tier Configuration' },
    { key: 'loyaltyOffers', icon: FiGift, label: 'Loyalty Offers' }
  ];

  const loyaltyMembers = useMemo(
    () => members.filter((item) => item.isLoyalty),
    [members]
  );

  const nonMembers = useMemo(
    () => members.filter((item) => !item.isLoyalty),
    [members]
  );

  const tierBreakdown = useMemo(() => {
    const counts = { Silver: 0, Gold: 0, Platinum: 0 };
    loyaltyMembers.forEach((member) => {
      const tier = member.loyaltyTier || 'Silver';
      if (counts[tier] !== undefined) counts[tier] += 1;
    });
    return counts;
  }, [loyaltyMembers]);

  useEffect(() => {
    document.title = 'Loyalty Management Dashboard - Saranya Jewellery';
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const me = await authManager.checkStaffAuth('Loyalty Management');
      if (!me || me.needsApproval) return;
      setStaffUser(me);
      await Promise.all([loadTiers(), loadMembers(), loadOffers()]);
    }
    bootstrap();
  }, []);

  async function loadTiers() {
    setError('');
    try {
      const response = await authManager.apiRequest('/api/loyalty/tiers');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load tiers');
      setTiers(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load tiers');
      setTiers([]);
    }
  }

  async function loadMembers() {
    try {
      const response = await authManager.apiRequest('/api/loyalty/members');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load members');
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      setMembers([]);
    }
  }

  async function loadOffers() {
    try {
      const response = await authManager.apiRequest('/api/loyalty/offers');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load offers');
      setOffers(Array.isArray(data) ? data : []);
    } catch {
      setOffers([]);
    }
  }

  async function updateTier(tier) {
    setError('');
    try {
      const response = await authManager.apiRequest(`/api/loyalty/tiers/${tier._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          minSpent: Number(tier.minSpent),
          maxSpent: Number(tier.maxSpent),
          pointMultiplier: Number(tier.pointMultiplier),
          benefits: Array.isArray(tier.benefits) ? tier.benefits : String(tier.benefits || '').split('\n').filter(Boolean),
          description: tier.description || ''
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update tier');
      await loadTiers();
    } catch (updateError) {
      setError(updateError.message || 'Failed to update tier');
    }
  }

  async function addMember(event) {
    event.preventDefault();
    if (!selectedCustomerId) return;
    setError('');
    try {
      const response = await authManager.apiRequest('/api/loyalty/members/add', {
        method: 'POST',
        body: JSON.stringify({ customerId: selectedCustomerId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add customer');
      setSelectedCustomerId('');
      await loadMembers();
    } catch (addError) {
      setError(addError.message || 'Failed to add customer');
    }
  }

  async function removeMember(customerId) {
    if (!window.confirm('Remove this customer from loyalty program?')) return;
    setError('');
    try {
      const response = await authManager.apiRequest('/api/loyalty/members/remove', {
        method: 'POST',
        body: JSON.stringify({ customerId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to remove member');
      await loadMembers();
    } catch (removeError) {
      setError(removeError.message || 'Failed to remove member');
    }
  }

  async function changeTier(customerId, newTier) {
    setError('');
    try {
      const response = await authManager.apiRequest(`/api/loyalty/members/upgrade/${customerId}`, {
        method: 'POST',
        body: JSON.stringify({ newTier })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to change tier');
      await loadMembers();
    } catch (changeError) {
      setError(changeError.message || 'Failed to change tier');
    }
  }

  async function updateLoyaltyPoints(customerId, newPoints) {
    setError('');
    try {
      const response = await authManager.apiRequest(`/api/loyalty/members/points/${customerId}`, {
        method: 'POST',
        body: JSON.stringify({ points: Number(newPoints) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update points');
      setEditingPointsId(null);
      setEditingPointsValue('');
      await loadMembers();
    } catch (pointsError) {
      setError(pointsError.message || 'Failed to update points');
    }
  }

  async function createOffer(event) {
    event.preventDefault();
    const todayDate = new Date().toISOString().split('T')[0];
    if (!offerForm.title || !offerForm.description || !offerForm.validFrom || !offerForm.validUntil || !offerForm.couponCode) {
      setError('All fields including coupon code are required');
      return;
    }
    if (offerForm.validFrom < todayDate) {
      setError('Start date cannot be in the past');
      return;
    }
    if (offerForm.validUntil < todayDate) {
      setError('End date cannot be in the past');
      return;
    }
    if (new Date(offerForm.validFrom) > new Date(offerForm.validUntil)) {
      setError('Start date must be before end date');
      return;
    }
    setIsCreatingOffer(true);
    setError('');
    try {
      if (editingOfferId) {
        // Update existing offer
        const response = await authManager.apiRequest(`/api/loyalty/offers/${editingOfferId}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: offerForm.title,
            description: offerForm.description,
            tierType: offerForm.tierType,
            discountPercentage: Number(offerForm.discountPercentage || 0),
            discountAmount: Number(offerForm.discountAmount || 0),
            validFrom: offerForm.validFrom,
            validUntil: offerForm.validUntil,
            couponCode: offerForm.couponCode
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update offer');
        setEditingOfferId(null);
        setOfferForm(emptyOfferForm);
        await loadOffers();
      } else {
        // Create new offer
        const response = await authManager.apiRequest('/api/loyalty/offers', {
          method: 'POST',
          body: JSON.stringify({
            title: offerForm.title,
            description: offerForm.description,
            tierType: offerForm.tierType,
            discountPercentage: Number(offerForm.discountPercentage || 0),
            discountAmount: Number(offerForm.discountAmount || 0),
            validFrom: offerForm.validFrom,
            validUntil: offerForm.validUntil,
            couponCode: offerForm.couponCode
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to create offer');
        setOfferForm(emptyOfferForm);
        await loadOffers();
      }
    } catch (createError) {
      setError(createError.message || (editingOfferId ? 'Failed to update offer' : 'Failed to create offer'));
    } finally {
      setIsCreatingOffer(false);
    }
  }

  function cancelEdit() {
    setEditingOfferId(null);
    setOfferForm(emptyOfferForm);
    setError('');
  }

  async function sendOfferEmail(offerId) {
    setBusyOfferId(offerId);
    setError('');
    try {
      const response = await authManager.apiRequest(`/api/loyalty/offers/${offerId}/send-email`, {
        method: 'POST'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to send offer emails');
      await loadOffers();
    } catch (sendError) {
      setError(sendError.message || 'Failed to send offer emails');
    } finally {
      setBusyOfferId('');
    }
  }

  async function deleteOffer(offerId) {
    if (!window.confirm('Delete this loyalty offer?')) return;
    setBusyOfferId(offerId);
    setError('');
    try {
      const response = await authManager.apiRequest(`/api/loyalty/offers/${offerId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete offer');
      await loadOffers();
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete offer');
    } finally {
      setBusyOfferId('');
    }
  }

  async function sendCoupons(offerId) {
    const offer = offers.find(o => o._id === offerId);
    if (!offer || !offer.couponCode) {
      setError('This offer does not have a coupon code');
      return;
    }
    
    setBusyCouponOfferId(offerId);
    setError('');
    try {
      const response = await authManager.apiRequest(`/api/loyalty/offers/${offerId}/send-coupons`, {
        method: 'POST'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to send offer emails');
      await loadOffers();
    } catch (sendError) {
      setError(sendError.message || 'Failed to send offer emails');
    } finally {
      setBusyCouponOfferId('');
    }
  }

  if (!staffUser) return <p style={{ padding: '1rem' }}>Checking loyalty management access...</p>;

  const enrollmentPct = members.length > 0 ? Math.round((loyaltyMembers.length / members.length) * 100) : 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fafbfc' }}>
      {/* Sidebar */}
      <aside style={{
        width: '320px',
        background: '#6f0022',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        left: 0,
        top: 0,
        zIndex: 100
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '2rem 1.5rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '1.2rem',
            fontFamily: 'Cormorant Garamond, serif',
            fontWeight: 600,
            letterSpacing: '0.5px',
            color: '#e0bf63',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            textTransform: 'uppercase'
          }}>
            <FiStar size={28} />
            Loyalty Management
          </h1>
        </div>

        {/* Navigation Items */}
        <nav style={{
          flex: 1,
          padding: '1.5rem 1rem',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navItems.map((item) => {
              const isActive = activeSection === item.key;
              const IconComponent = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveSection(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    width: '100%',
                    padding: '1rem 1rem',
                    background: isActive ? '#e0bf63' : 'transparent',
                    color: isActive ? '#3d2b00' : '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '1.1rem',
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(224, 191, 99, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <IconComponent size={24} style={{ minWidth: '24px' }} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Profile Section */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#e0bf63',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#3d2b00',
            flexShrink: 0
          }}>
            {staffUser.fullName?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 600,
              fontSize: '0.95rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              Hello, {staffUser.fullName?.split(' ')[0]}
            </div>
          </div>
          <button
            onClick={() => authManager.logout()}
            style={{
              background: isLogoutHovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              transition: 'background 0.2s',
              flexShrink: 0
            }}
            title="Logout"
            onMouseEnter={() => setIsLogoutHovered(true)}
            onMouseLeave={() => setIsLogoutHovered(false)}
          >
            <FiLogOut size={20} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: '320px',
        padding: '2rem',
        overflowY: 'auto'
      }}>
        {activeSection === 'memberAnalysis' && (
        <>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Customers', value: members.length, color: '#6f0022', Icon: FiUsers },
          { label: 'Active Members', value: loyaltyMembers.length, color: '#b33f62', Icon: FiStar },
          { label: 'Enrollment Ratio', value: `${enrollmentPct}%`, color: '#1f7a55', Icon: FiTrendingUp },
          { label: 'Eligible To Add', value: nonMembers.length, color: '#8b5e1f', Icon: FiPlus }
        ].map((item) => (
          <article
            key={item.label}
            style={{
              background: '#fff',
              border: '1px solid #eee',
              borderRadius: '14px',
              padding: '1.5rem',
              boxShadow: '0 4px 16px rgba(51, 25, 35, 0.08)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
              <item.Icon style={{ fontSize: '2rem', color: item.color }} />
              <div style={{ width: '6px', height: '36px', borderRadius: '3px', background: item.color }} />
            </div>
            <p style={{ margin: 0, color: '#7a7279', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.7px', fontWeight: 600 }}>{item.label}</p>
            <h3 style={{ margin: '0.6rem 0 0', color: item.color, fontSize: '2.2rem', lineHeight: 1, fontWeight: 700 }}>{item.value}</h3>
          </article>
        ))}
      </section>

      {error && (
        <section style={{ border: '1px solid #e6b0b0', background: '#fff7f7', borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '1rem' }}>
          <p style={{ margin: 0, color: '#9f1c1c', fontWeight: 600 }}>{error}</p>
        </section>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <article style={{ background: '#fff', border: '1px solid #ebe6e8', borderRadius: '14px', padding: '1rem', boxShadow: '0 4px 16px rgba(51, 25, 35, 0.08)' }}>
          <h3 style={{ margin: '0 0 0.2rem', color: '#6f0022', fontSize: '1.2rem' }}>Add Member To Loyalty</h3>
          <p style={{ margin: '0 0 0.7rem', color: '#777', fontSize: '0.9rem' }}>Enroll customers that are currently outside the loyalty program.</p>

          <form onSubmit={addMember} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem' }}>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              style={{ border: '1px solid #d6d0d4', borderRadius: 11, padding: '0.65rem 0.8rem', background: '#fff' }}
            >
              <option value="">Select customer</option>
              {nonMembers.map((customer) => (
                <option key={customer._id} value={customer._id}>{customer.fullName} ({customer.email})</option>
              ))}
            </select>
            <button
              type="submit"
              style={{ border: 'none', borderRadius: 11, padding: '0.62rem 1rem', background: '#6f0022', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              Add Member
            </button>
          </form>

          <div style={{ marginTop: '1rem', borderTop: '1px dashed #eadfe4', paddingTop: '0.8rem' }}>
            <h4 style={{ margin: 0, color: '#4c3640', fontSize: '0.98rem' }}>Tier Snapshot</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.6rem' }}>
              <div style={{ background: '#f5f5f5', borderRadius: 10, padding: '0.55rem' }}>
                <p style={{ margin: 0, color: '#606060', fontSize: '0.8rem' }}>Silver</p>
                <strong style={{ color: '#454545' }}>{tierBreakdown.Silver}</strong>
              </div>
              <div style={{ background: '#fbf3df', borderRadius: 10, padding: '0.55rem' }}>
                <p style={{ margin: 0, color: '#86621a', fontSize: '0.8rem' }}>Gold</p>
                <strong style={{ color: '#86621a' }}>{tierBreakdown.Gold}</strong>
              </div>
              <div style={{ background: '#f1ebf7', borderRadius: 10, padding: '0.55rem' }}>
                <p style={{ margin: 0, color: '#5f4a78', fontSize: '0.8rem' }}>Platinum</p>
                <strong style={{ color: '#5f4a78' }}>{tierBreakdown.Platinum}</strong>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section style={{ background: '#fff', border: '1px solid #ebe6e8', borderRadius: 14, padding: '1rem', boxShadow: '0 4px 16px rgba(51, 25, 35, 0.08)' }}>
        <h3 style={{ marginTop: 0, color: '#6f0022', fontSize: '1.2rem' }}>Member Roster</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead>
              <tr style={{ background: '#f8f3f5' }}>
                <th align="left" style={{ padding: '0.72rem 0.55rem', color: '#5a434d' }}>Member</th>
                <th align="left" style={{ padding: '0.72rem 0.55rem', color: '#5a434d' }}>Tier</th>
                <th align="left" style={{ padding: '0.72rem 0.55rem', color: '#5a434d' }}>Points</th>
                <th align="left" style={{ padding: '0.72rem 0.55rem', color: '#5a434d' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loyaltyMembers.map((member) => (
                <tr key={member._id} style={{ borderTop: '1px solid #f1ecef' }}>
                  <td style={{ padding: '0.72rem 0.55rem' }}>
                    <div style={{ fontWeight: 600, color: '#3d2f35' }}>{member.fullName}</div>
                    <small style={{ color: '#7f7880' }}>{member.email}</small>
                  </td>
                  <td style={{ padding: '0.72rem 0.55rem' }}>
                    <span style={{ border: '1px solid #e8d8de', borderRadius: 999, background: '#fcf5f8', color: '#6f0022', padding: '0.17rem 0.58rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      {member.loyaltyTier || 'Silver'}
                    </span>
                  </td>
                  <td style={{ padding: '0.72rem 0.55rem' }}>
                    {editingPointsId === member._id ? (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          value={editingPointsValue}
                          onChange={(e) => {
                            const numVal = parseInt(e.target.value) || 0;
                            setEditingPointsValue(numVal < 0 ? '0' : e.target.value);
                          }}
                          style={{ border: '1px solid #d7d0d5', borderRadius: 6, padding: '0.35rem 0.5rem', fontSize: '0.85rem', width: '70px' }}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => updateLoyaltyPoints(member._id, editingPointsValue)}
                          style={{ border: 'none', background: '#1f7a55', color: '#fff', borderRadius: 6, padding: '0.3rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPointsId(null);
                            setEditingPointsValue('');
                          }}
                          style={{ border: '1px solid #d7d0d5', background: '#fff', color: '#666', borderRadius: 6, padding: '0.3rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#402f36' }}>{member.loyaltyPoints || 0}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPointsId(member._id);
                            setEditingPointsValue(String(member.loyaltyPoints || 0));
                          }}
                          style={{ border: '1px solid #d0c4ca', background: '#fff', color: '#6f0022', borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.72rem 0.55rem' }}>
                    <div style={{ display: 'flex', gap: '0.36rem', flexWrap: 'wrap' }}>
                      {TIER_OPTIONS.map((tierName) => (
                        <button key={tierName} type="button" onClick={() => changeTier(member._id, tierName)} style={{ border: '1px solid #d8c8cf', background: '#fff', color: '#6f0022', borderRadius: 8, padding: '0.32rem 0.5rem', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>
                          Set {tierName}
                        </button>
                      ))}
                      <button type="button" onClick={() => removeMember(member._id)} style={{ border: '1px solid #e6bfbf', background: '#fff', color: '#9b2e2e', borderRadius: 8, padding: '0.32rem 0.5rem', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {loyaltyMembers.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '1rem 0.55rem', color: '#666' }}>No loyalty members yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
        </>
        )}

        {activeSection === 'tierConfiguration' && (
          <section>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ margin: '0 0 0.5rem', color: '#6f0022', fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif" }}>Tier Configuration</h2>
              <p style={{ margin: 0, color: '#777', fontSize: '0.95rem' }}>Edit spending thresholds, rewards multiplier, and customer-facing benefit copy.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
              {tiers.map((tier) => {
                const tierColors = {
                  'Silver': { accent: '#b0b0b0', light: '#f8f8f8', border: '#e0e0e0' },
                  'Gold': { accent: '#e0bf63', light: '#fef9f0', border: '#ede3d0' },
                  'Platinum': { accent: '#c0a0d0', light: '#f9f6fc', border: '#e8dff5' }
                };
                const colors = tierColors[tier.tierName] || tierColors['Silver'];
                
                return (
                  <article key={tier._id} style={{ 
                    background: colors.light, 
                    border: `2px solid ${colors.border}`, 
                    borderRadius: 16, 
                    padding: '1.5rem',
                    boxShadow: '0 4px 12px rgba(51, 25, 35, 0.08)',
                    transition: 'all 0.3s',
                    overflow: 'hidden'
                  }}>
                    {/* Header */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem', 
                      marginBottom: '1.2rem',
                      paddingBottom: '1rem',
                      borderBottom: `1px solid ${colors.border}`
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: colors.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: tier.tierName === 'Gold' ? '#3d2b00' : '#fff',
                        fontSize: '1.8rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {tier.tierName.charAt(0)}
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 0.2rem', color: '#3d2f35', fontSize: '1.2rem', fontWeight: 700 }}>
                          {tier.tierName}
                        </h3>
                        <p style={{ margin: 0, color: '#777', fontSize: '0.8rem' }}>Editable</p>
                      </div>
                    </div>

                    {/* Spending Thresholds */}
                    <div style={{ marginBottom: '1.2rem' }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6f0022', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Spending Thresholds</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#555', marginBottom: '0.4rem', fontWeight: 500 }}>Min. Spent (LKR)</label>
                          <input 
                            type="number" 
                            min="0" 
                            value={tier.minSpent} 
                            onChange={(e) => {
                              const value = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                              setTiers((prev) => prev.map((item) => (item._id === tier._id ? { ...item, minSpent: value } : item)));
                            }} 
                            style={{ 
                              border: `1px solid ${colors.border}`, 
                              borderRadius: 8, 
                              padding: '0.6rem 0.8rem', 
                              width: '100%',
                              background: '#fff',
                              fontSize: '0.9rem',
                              fontWeight: 500
                            }} 
                            placeholder="0" 
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#555', marginBottom: '0.4rem', fontWeight: 500 }}>Max. Spent (LKR)</label>
                          <input 
                            type="number" 
                            min="0" 
                            value={tier.maxSpent} 
                            onChange={(e) => {
                              const value = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                              setTiers((prev) => prev.map((item) => (item._id === tier._id ? { ...item, maxSpent: value } : item)));
                            }} 
                            style={{ 
                              border: `1px solid ${colors.border}`, 
                              borderRadius: 8, 
                              padding: '0.6rem 0.8rem', 
                              width: '100%',
                              background: '#fff',
                              fontSize: '0.9rem',
                              fontWeight: 500
                            }} 
                            placeholder="Unlimited" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Point Multiplier */}
                    <div style={{ marginBottom: '1.2rem' }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6f0022', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Point Multiplier</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <input 
                          type="number" 
                          step="0.1" 
                          min="0" 
                          max="5" 
                          value={tier.pointMultiplier} 
                          onChange={(e) => {
                            const value = e.target.value === '' ? '' : Math.max(0, Math.min(5, Number(e.target.value)));
                            setTiers((prev) => prev.map((item) => (item._id === tier._id ? { ...item, pointMultiplier: value } : item)));
                          }} 
                          style={{ 
                            border: `1px solid ${colors.border}`, 
                            borderRadius: 8, 
                            padding: '0.6rem 0.8rem', 
                            width: '120px',
                            background: '#fff',
                            fontSize: '0.9rem',
                            fontWeight: 600
                          }} 
                          placeholder="1.0" 
                        />
                        <span style={{ color: '#666', fontSize: '0.9rem' }}>× base points</span>
                      </div>
                    </div>

                    {/* Benefits */}
                    <div style={{ marginBottom: '1.2rem' }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6f0022', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Benefits</label>
                      <textarea 
                        rows={3} 
                        value={Array.isArray(tier.benefits) ? tier.benefits.join('\n') : tier.benefits || ''} 
                        onChange={(e) => setTiers((prev) => prev.map((item) => (item._id === tier._id ? { ...item, benefits: e.target.value } : item)))} 
                        style={{ 
                          width: '100%', 
                          border: `1px solid ${colors.border}`, 
                          borderRadius: 8, 
                          padding: '0.8rem',
                          background: '#fff',
                          fontSize: '0.9rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          minHeight: '80px'
                        }} 
                        placeholder="One benefit per line&#10;e.g., 1 point per Rs. 100 spent&#10;Priority customer support" 
                      />
                      <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#999' }}>Tip: List each benefit on a new line</p>
                    </div>

                    {/* Description */}
                    <div style={{ marginBottom: '1.2rem' }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6f0022', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Description</label>
                      <textarea 
                        rows={2} 
                        value={tier.description || ''} 
                        onChange={(e) => setTiers((prev) => prev.map((item) => (item._id === tier._id ? { ...item, description: e.target.value } : item)))} 
                        style={{ 
                          width: '100%', 
                          border: `1px solid ${colors.border}`, 
                          borderRadius: 8, 
                          padding: '0.8rem',
                          background: '#fff',
                          fontSize: '0.9rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          minHeight: '60px'
                        }} 
                        placeholder="Brief description for customers..." 
                      />
                    </div>

                    {/* Save Button */}
                    <button 
                      type="button" 
                      onClick={() => updateTier(tier)} 
                      style={{ 
                        border: 'none', 
                        background: colors.accent, 
                        color: tier.tierName === 'Gold' ? '#3d2b00' : '#fff',
                        borderRadius: 8, 
                        padding: '0.7rem 1.5rem', 
                        fontWeight: 600, 
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        width: '100%',
                        transition: 'opacity 0.2s',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                      onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                      ✓ Save {tier.tierName} Tier
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {activeSection === 'loyaltyOffers' && (
          <>
          <section style={{ marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: '0 0 0.5rem', color: '#6f0022', fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {editingOfferId ? <><FiEdit2 /> Edit Loyalty Offer</> : <><FiGift /> Create Loyalty Offer</>}
              </h2>
              <p style={{ margin: 0, color: '#777', fontSize: '0.95rem' }}>
                {editingOfferId ? 'Update this offer and resend to customers.' : 'Create targeted offers and send to a specific loyalty tier or all tiers.'}
              </p>
            </div>

            <div style={{ background: '#fff', border: '1px solid #ebe6e8', borderRadius: 14, padding: '1.5rem', boxShadow: '0 4px 16px rgba(51, 25, 35, 0.08)' }}>
            <form onSubmit={createOffer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {/* Offer Title */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6f0022', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Offer Title *</label>
                <input
                  required
                  value={offerForm.title}
                  onChange={(e) => setOfferForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="E.g., Summer Sale, Gold Tier Exclusive"
                  style={{ border: '1px solid #d7d0d5', borderRadius: 8, padding: '0.7rem 0.8rem', width: '100%', fontSize: '0.95rem', fontFamily: 'inherit' }}
                />
              </div>

              {/* Offer Description */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6f0022', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Description *</label>
                <textarea
                  required
                  rows={3}
                  value={offerForm.description}
                  onChange={(e) => setOfferForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the offer details and benefits to customers"
                  style={{ border: '1px solid #d7d0d5', borderRadius: 8, padding: '0.8rem', width: '100%', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              {/* Apply To Tier */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6f0022', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Apply To Tier</label>
                <select
                  value={offerForm.tierType}
                  onChange={(e) => setOfferForm((prev) => ({ ...prev, tierType: e.target.value }))}
                  style={{ border: '1px solid #d7d0d5', borderRadius: 8, padding: '0.7rem 0.8rem', width: '100%', fontSize: '0.95rem', fontFamily: 'inherit' }}
                >
                  {OFFER_TIER_OPTIONS.map((tierName) => (
                    <option key={tierName} value={tierName}>{tierName}</option>
                  ))}
                </select>
              </div>

              {/* Discount % */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6f0022', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Discount %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={offerForm.discountPercentage}
                  onChange={(e) => {
                    const value = e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value)));
                    setOfferForm((prev) => ({ ...prev, discountPercentage: value }));
                  }}
                  placeholder="0 - 100"
                  style={{ border: '1px solid #d7d0d5', borderRadius: 8, padding: '0.7rem 0.8rem', width: '100%', fontSize: '0.95rem', fontFamily: 'inherit' }}
                />
              </div>

              {/* OR Fixed Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6f0022', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>OR Fixed Amount (LKR)</label>
                <input
                  type="number"
                  min={0}
                  value={offerForm.discountAmount}
                  onChange={(e) => setOfferForm((prev) => ({ ...prev, discountAmount: e.target.value }))}
                  placeholder="0"
                  style={{ border: '1px solid #d7d0d5', borderRadius: 8, padding: '0.7rem 0.8rem', width: '100%', fontSize: '0.95rem', fontFamily: 'inherit' }}
                />
              </div>

              {/* Valid From */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6f0022', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Valid From *</label>
                <input
                  required
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={offerForm.validFrom}
                  onChange={(e) => setOfferForm((prev) => ({ ...prev, validFrom: e.target.value }))}
                  style={{ border: '1px solid #d7d0d5', borderRadius: 8, padding: '0.7rem 0.8rem', width: '100%', fontSize: '0.95rem', fontFamily: 'inherit' }}
                />
              </div>

              {/* Valid Until */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6f0022', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Valid Until *</label>
                <input
                  required
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={offerForm.validUntil}
                  onChange={(e) => setOfferForm((prev) => ({ ...prev, validUntil: e.target.value }))}
                  style={{ border: '1px solid #d7d0d5', borderRadius: 8, padding: '0.7rem 0.8rem', width: '100%', fontSize: '0.95rem', fontFamily: 'inherit' }}
                />
              </div>

              {/* Coupon Code */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6f0022', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Coupon Code *</label>
                <input
                  required
                  value={offerForm.couponCode}
                  onChange={(e) => setOfferForm((prev) => ({ ...prev, couponCode: e.target.value.toUpperCase() }))}
                  placeholder="E.g., GOLD50, SUMMER25"
                  maxLength="20"
                  style={{ border: '1px solid #d7d0d5', borderRadius: 8, padding: '0.7rem 0.8rem', width: '100%', fontSize: '0.95rem', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: '0.8rem', gridColumn: '1 / -1' }}>
                <button
                  type="submit"
                  disabled={isCreatingOffer}
                  style={{ 
                    border: 'none', 
                    background: '#6f0022', 
                    color: '#fff', 
                    borderRadius: 8, 
                    padding: '0.8rem 1.5rem', 
                    fontWeight: 600, 
                    cursor: isCreatingOffer ? 'not-allowed' : 'pointer', 
                    opacity: isCreatingOffer ? 0.7 : 1,
                    fontSize: '0.95rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    flex: 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCreatingOffer) e.target.style.background = '#5a001a';
                  }}
                  onMouseLeave={(e) => {
                    if (!isCreatingOffer) e.target.style.background = '#6f0022';
                  }}
                >
                  {isCreatingOffer ? (editingOfferId ? '⏳ Saving...' : '⏳ Creating...') : (editingOfferId ? '✓ Save Changes' : '+ Create Offer')}
                </button>
                {editingOfferId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    style={{ 
                      border: '1px solid #d7d0d5', 
                      background: '#fff', 
                      color: '#666', 
                      borderRadius: 8, 
                      padding: '0.8rem 1.5rem', 
                      fontWeight: 600, 
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#f9f9f9'}
                    onMouseLeave={(e) => e.target.style.background = '#fff'}
                  >
                    ✕ Cancel
                  </button>
                )}
              </div>
            </form>
            </div>
          </section>

          {/* Offer Campaigns Section */}
          <section style={{ marginTop: '2rem' }}>
            <h2 style={{ margin: '0 0 1rem', color: '#6f0022', fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiList /> Offer Campaigns</h2>
            
            {offers.length === 0 ? (
              <article style={{ background: '#fff', border: '1px solid #ebe6e8', borderRadius: 14, padding: '2rem', boxShadow: '0 4px 16px rgba(51, 25, 35, 0.08)', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#D4AF37' }}><FiGift style={{ width: '3rem', height: '3rem' }} /></div>
                <p style={{ margin: 0, color: '#666', fontSize: '1rem' }}>No offers created yet. Create your first offer above!</p>
              </article>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {offers.map((offer) => (
                  <article key={offer._id} style={{ 
                    background: '#fff', 
                    border: '1px solid #ebe6e8', 
                    borderRadius: 14, 
                    padding: '1.5rem',
                    boxShadow: '0 4px 16px rgba(51, 25, 35, 0.08)',
                    transition: 'all 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(51, 25, 35, 0.12)'} onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 16px rgba(51, 25, 35, 0.08)'}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                      <div>
                        <h3 style={{ margin: '0 0 0.3rem', color: '#3d2f35', fontSize: '1.1rem', fontWeight: 700 }}>{offer.title}</h3>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>{offer.description}</p>
                      </div>
                      <span style={{ 
                        border: '1px solid #e6d7de', 
                        borderRadius: 999, 
                        padding: '0.4rem 0.9rem', 
                        fontSize: '0.8rem', 
                        color: '#6f0022', 
                        background: '#faf3f6',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}>
                        {offer.tierType}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <p style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', color: '#777', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Discount</p>
                        <p style={{ margin: 0, fontSize: '1.1rem', color: '#6f0022', fontWeight: 700 }}>
                          {offer.discountPercentage || 0}% {offer.discountAmount ? `or Rs. ${Number(offer.discountAmount).toLocaleString()}` : ''}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', color: '#777', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valid Period</p>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#333' }}>
                          {offer.validFrom ? new Date(offer.validFrom).toLocaleDateString() : '-'} to {offer.validUntil ? new Date(offer.validUntil).toLocaleDateString() : '-'}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', color: '#777', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Coupon Code</p>
                        <p style={{ margin: 0, fontSize: '1rem', color: '#d4af37', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                          {offer.couponCode}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', color: '#777', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Status</p>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: offer.emailSent ? '#1f7a55' : '#999' }}>
                          {offer.emailSent ? `✓ Sent (${offer.recipientsCount || 0} recipients)` : 'Not sent'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => sendCoupons(offer._id)}
                        disabled={busyCouponOfferId === offer._id}
                        style={{ 
                          border: 'none', 
                          background: '#1f7a55', 
                          color: '#fff', 
                          borderRadius: 8, 
                          padding: '0.6rem 1rem', 
                          fontSize: '0.85rem', 
                          fontWeight: 600, 
                          cursor: busyCouponOfferId === offer._id ? 'not-allowed' : 'pointer', 
                          opacity: busyCouponOfferId === offer._id ? 0.7 : 1,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (busyCouponOfferId !== offer._id) e.target.style.background = '#166a48';
                        }}
                        onMouseLeave={(e) => {
                          if (busyCouponOfferId !== offer._id) e.target.style.background = '#1f7a55';
                        }}
                      >
                        {busyCouponOfferId === offer._id ? <><FiLoader style={{ animation: 'spin 1s linear infinite' }} /> Sending...</> : <><FiMail /> Send Email</>}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOfferId(offer._id);
                          setOfferForm({
                            title: offer.title,
                            description: offer.description,
                            tierType: offer.tierType,
                            discountPercentage: offer.discountPercentage || '',
                            discountAmount: offer.discountAmount || '',
                            validFrom: offer.validFrom?.split('T')[0] || '',
                            validUntil: offer.validUntil?.split('T')[0] || '',
                            couponCode: offer.couponCode
                          });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        style={{ 
                          border: '1px solid #8b5e1f', 
                          background: 'transparent', 
                          color: '#8b5e1f', 
                          borderRadius: 8, 
                          padding: '0.6rem 1rem', 
                          fontSize: '0.85rem', 
                          fontWeight: 600, 
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#f5f0e8';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteOffer(offer._id)}
                        disabled={busyOfferId === offer._id}
                        style={{ 
                          border: '1px solid #e6bfbf', 
                          background: '#fff', 
                          color: '#9b2e2e', 
                          borderRadius: 8, 
                          padding: '0.6rem 1rem', 
                          fontSize: '0.85rem', 
                          fontWeight: 600, 
                          cursor: busyOfferId === offer._id ? 'not-allowed' : 'pointer', 
                          opacity: busyOfferId === offer._id ? 0.7 : 1,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (busyOfferId !== offer._id) e.target.style.background = '#ffe6e6';
                        }}
                        onMouseLeave={(e) => {
                          if (busyOfferId !== offer._id) e.target.style.background = '#fff';
                        }}
                      >
                        {busyOfferId === offer._id ? <><FiLoader style={{ animation: 'spin 1s linear infinite' }} /> Deleting...</> : <><FiTrash2 /> Delete</>}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          </>
        )}
      </main>
    </div>
  );
}
