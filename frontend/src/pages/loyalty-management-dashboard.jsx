import { useEffect, useMemo, useState } from 'react';
import authManager from '../auth.js';
import StaffDashboardLayout from '../components/StaffDashboardLayout.jsx';

const TIER_OPTIONS = ['Silver', 'Gold', 'Platinum'];
const OFFER_TIER_OPTIONS = ['All', 'Silver', 'Gold', 'Platinum'];

const emptyOfferForm = {
  title: '',
  description: '',
  tierType: 'All',
  discountPercentage: '',
  discountAmount: '',
  validUntil: ''
};

export default function LoyaltyManagementDashboardPage() {
  const [staffUser, setStaffUser] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [activeTab, setActiveTab] = useState('members');
  const [offers, setOffers] = useState([]);
  const [offerForm, setOfferForm] = useState(emptyOfferForm);
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  const [busyOfferId, setBusyOfferId] = useState('');
  const [error, setError] = useState('');

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

  async function createOffer(event) {
    event.preventDefault();
    setIsCreatingOffer(true);
    setError('');
    try {
      const response = await authManager.apiRequest('/api/loyalty/offers', {
        method: 'POST',
        body: JSON.stringify({
          title: offerForm.title,
          description: offerForm.description,
          tierType: offerForm.tierType,
          discountPercentage: Number(offerForm.discountPercentage || 0),
          discountAmount: Number(offerForm.discountAmount || 0),
          validUntil: offerForm.validUntil
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create offer');
      setOfferForm(emptyOfferForm);
      await loadOffers();
      setActiveTab('offers');
    } catch (createError) {
      setError(createError.message || 'Failed to create offer');
    } finally {
      setIsCreatingOffer(false);
    }
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

  if (!staffUser) return <p style={{ padding: '1rem' }}>Checking loyalty management access...</p>;

  const enrollmentPct = members.length > 0 ? Math.round((loyaltyMembers.length / members.length) * 100) : 0;

  return (
    <StaffDashboardLayout
      title="Loyalty Management Dashboard"
      staff={staffUser}
      onLogout={() => authManager.logout()}
    >
      <section style={{ display: 'flex', gap: '0.55rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('members')}
          style={{
            border: activeTab === 'members' ? '1px solid #6f0022' : '1px solid #d9ced3',
            background: activeTab === 'members' ? '#6f0022' : '#fff',
            color: activeTab === 'members' ? '#fff' : '#6f0022',
            borderRadius: 999,
            padding: '0.42rem 0.95rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Loyalty Members
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('offers')}
          style={{
            border: activeTab === 'offers' ? '1px solid #6f0022' : '1px solid #d9ced3',
            background: activeTab === 'offers' ? '#6f0022' : '#fff',
            color: activeTab === 'offers' ? '#fff' : '#6f0022',
            borderRadius: 999,
            padding: '0.42rem 0.95rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Loyalty Offers
        </button>
      </section>

      {activeTab === 'members' && (
        <>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.9rem', marginBottom: '1rem' }}>
        {[
          { label: 'Total Customers', value: members.length, color: '#6f0022' },
          { label: 'Active Members', value: loyaltyMembers.length, color: '#b33f62' },
          { label: 'Enrollment Ratio', value: `${enrollmentPct}%`, color: '#1f7a55' },
          { label: 'Eligible To Add', value: nonMembers.length, color: '#8b5e1f' }
        ].map((item) => (
          <article
            key={item.label}
            style={{
              background: '#fff',
              border: '1px solid #eee',
              borderRadius: '14px',
              padding: '1rem',
              boxShadow: '0 4px 16px rgba(51, 25, 35, 0.08)'
            }}
          >
            <div style={{ width: '44px', height: '4px', borderRadius: '999px', background: item.color, marginBottom: '0.7rem' }} />
            <p style={{ margin: 0, color: '#7a7279', fontSize: '0.84rem', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{item.label}</p>
            <h3 style={{ margin: '0.3rem 0 0', color: item.color, fontSize: '1.95rem', lineHeight: 1.1 }}>{item.value}</h3>
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

        <article style={{ background: '#fff', border: '1px solid #ebe6e8', borderRadius: '14px', padding: '1rem', boxShadow: '0 4px 16px rgba(51, 25, 35, 0.08)' }}>
          <h3 style={{ margin: '0 0 0.2rem', color: '#6f0022', fontSize: '1.2rem' }}>Tier Configuration</h3>
          <p style={{ margin: '0 0 0.75rem', color: '#777', fontSize: '0.9rem' }}>Edit spending thresholds, rewards multiplier, and customer-facing benefit copy.</p>

          <div style={{ display: 'grid', gap: '0.7rem', maxHeight: '560px', overflowY: 'auto', paddingRight: '0.2rem' }}>
            {tiers.map((tier) => (
              <article key={tier._id} style={{ border: '1px solid #efe8eb', borderRadius: 12, padding: '0.9rem', background: '#fffdfd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, color: '#44242f', fontSize: '1rem' }}>{tier.tierName}</h4>
                  <span style={{ border: '1px solid #e6d7de', borderRadius: 999, padding: '0.15rem 0.55rem', fontSize: '0.74rem', color: '#6f0022', background: '#faf3f6' }}>
                    Editable
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '0.45rem' }}>
                  <input type="number" value={tier.minSpent} onChange={(e) => setTiers((prev) => prev.map((item) => (item._id === tier._id ? { ...item, minSpent: e.target.value } : item)))} style={{ border: '1px solid #d7d0d5', borderRadius: 9, padding: '0.48rem 0.6rem' }} />
                  <input type="number" value={tier.maxSpent} onChange={(e) => setTiers((prev) => prev.map((item) => (item._id === tier._id ? { ...item, maxSpent: e.target.value } : item)))} style={{ border: '1px solid #d7d0d5', borderRadius: 9, padding: '0.48rem 0.6rem' }} />
                  <input type="number" step="0.1" value={tier.pointMultiplier} onChange={(e) => setTiers((prev) => prev.map((item) => (item._id === tier._id ? { ...item, pointMultiplier: e.target.value } : item)))} style={{ border: '1px solid #d7d0d5', borderRadius: 9, padding: '0.48rem 0.6rem' }} />
                </div>

                <textarea rows={2} value={Array.isArray(tier.benefits) ? tier.benefits.join('\n') : tier.benefits || ''} onChange={(e) => setTiers((prev) => prev.map((item) => (item._id === tier._id ? { ...item, benefits: e.target.value } : item)))} style={{ width: '100%', border: '1px solid #d7d0d5', borderRadius: 9, padding: '0.48rem 0.6rem', marginTop: '0.45rem' }} />
                <textarea rows={2} value={tier.description || ''} onChange={(e) => setTiers((prev) => prev.map((item) => (item._id === tier._id ? { ...item, description: e.target.value } : item)))} style={{ width: '100%', border: '1px solid #d7d0d5', borderRadius: 9, padding: '0.48rem 0.6rem', marginTop: '0.45rem' }} />
                <button type="button" onClick={() => updateTier(tier)} style={{ marginTop: '0.48rem', border: 'none', background: '#1f7a55', color: '#fff', borderRadius: 9, padding: '0.46rem 0.75rem', fontWeight: 600, cursor: 'pointer' }}>Save Tier</button>
              </article>
            ))}
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
                  <td style={{ padding: '0.72rem 0.55rem', fontWeight: 700, color: '#402f36' }}>{member.loyaltyPoints || 0}</td>
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

      {activeTab === 'offers' && (
        <>
          <section style={{ background: '#fff', border: '1px solid #ebe6e8', borderRadius: 14, padding: '1rem', boxShadow: '0 4px 16px rgba(51, 25, 35, 0.08)', marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 0.2rem', color: '#6f0022', fontSize: '1.2rem' }}>Create Loyalty Offer</h3>
            <p style={{ margin: '0 0 0.8rem', color: '#777', fontSize: '0.9rem' }}>Create targeted offers and send to a specific loyalty tier or all tiers.</p>
            <form onSubmit={createOffer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
              <input
                required
                value={offerForm.title}
                onChange={(e) => setOfferForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Offer title"
                style={{ border: '1px solid #d7d0d5', borderRadius: 9, padding: '0.52rem 0.65rem' }}
              />
              <select
                value={offerForm.tierType}
                onChange={(e) => setOfferForm((prev) => ({ ...prev, tierType: e.target.value }))}
                style={{ border: '1px solid #d7d0d5', borderRadius: 9, padding: '0.52rem 0.65rem' }}
              >
                {OFFER_TIER_OPTIONS.map((tierName) => (
                  <option key={tierName} value={tierName}>{tierName}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                max={100}
                value={offerForm.discountPercentage}
                onChange={(e) => setOfferForm((prev) => ({ ...prev, discountPercentage: e.target.value }))}
                placeholder="Discount %"
                style={{ border: '1px solid #d7d0d5', borderRadius: 9, padding: '0.52rem 0.65rem' }}
              />
              <input
                type="number"
                min={0}
                value={offerForm.discountAmount}
                onChange={(e) => setOfferForm((prev) => ({ ...prev, discountAmount: e.target.value }))}
                placeholder="Discount amount (LKR)"
                style={{ border: '1px solid #d7d0d5', borderRadius: 9, padding: '0.52rem 0.65rem' }}
              />
              <input
                required
                type="date"
                value={offerForm.validUntil}
                onChange={(e) => setOfferForm((prev) => ({ ...prev, validUntil: e.target.value }))}
                style={{ border: '1px solid #d7d0d5', borderRadius: 9, padding: '0.52rem 0.65rem' }}
              />
              <textarea
                required
                rows={3}
                value={offerForm.description}
                onChange={(e) => setOfferForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Offer description"
                style={{ gridColumn: '1 / -1', border: '1px solid #d7d0d5', borderRadius: 9, padding: '0.52rem 0.65rem' }}
              />
              <button
                type="submit"
                disabled={isCreatingOffer}
                style={{ border: 'none', background: '#6f0022', color: '#fff', borderRadius: 9, padding: '0.55rem 0.8rem', fontWeight: 600, cursor: isCreatingOffer ? 'not-allowed' : 'pointer', opacity: isCreatingOffer ? 0.7 : 1 }}
              >
                {isCreatingOffer ? 'Creating...' : 'Create Offer'}
              </button>
            </form>
          </section>

          <section style={{ background: '#fff', border: '1px solid #ebe6e8', borderRadius: 14, padding: '1rem', boxShadow: '0 4px 16px rgba(51, 25, 35, 0.08)' }}>
            <h3 style={{ margin: '0 0 0.7rem', color: '#6f0022', fontSize: '1.2rem' }}>Offer Campaigns</h3>
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              {offers.map((offer) => (
                <article key={offer._id} style={{ border: '1px solid #efe8eb', borderRadius: 12, padding: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, color: '#43242f' }}>{offer.title}</h4>
                    <span style={{ border: '1px solid #e6d7de', borderRadius: 999, padding: '0.12rem 0.5rem', fontSize: '0.75rem', color: '#6f0022', background: '#faf3f6' }}>
                      {offer.tierType}
                    </span>
                  </div>
                  <p style={{ margin: '0.35rem 0 0.4rem', color: '#666' }}>{offer.description}</p>
                  <p style={{ margin: 0, color: '#7d757b', fontSize: '0.86rem' }}>
                    Discount: {offer.discountPercentage || 0}% {offer.discountAmount ? `or LKR ${Number(offer.discountAmount).toLocaleString()}` : ''} | Valid Until: {offer.validUntil ? new Date(offer.validUntil).toLocaleDateString() : '-'}
                  </p>
                  <p style={{ margin: '0.25rem 0 0', color: '#7d757b', fontSize: '0.82rem' }}>
                    Email Sent: {offer.emailSent ? 'Yes' : 'No'} {offer.sentAt ? `| Last Sent: ${new Date(offer.sentAt).toLocaleString()}` : ''} | Recipients: {offer.recipientsCount || 0}
                  </p>
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                    <button
                      type="button"
                      onClick={() => sendOfferEmail(offer._id)}
                      disabled={busyOfferId === offer._id}
                      style={{ border: 'none', background: '#1f7a55', color: '#fff', borderRadius: 8, padding: '0.4rem 0.65rem', fontSize: '0.8rem', fontWeight: 600, cursor: busyOfferId === offer._id ? 'not-allowed' : 'pointer', opacity: busyOfferId === offer._id ? 0.7 : 1 }}
                    >
                      {busyOfferId === offer._id ? 'Sending...' : 'Send Emails'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteOffer(offer._id)}
                      disabled={busyOfferId === offer._id}
                      style={{ border: '1px solid #e6bfbf', background: '#fff', color: '#9b2e2e', borderRadius: 8, padding: '0.38rem 0.65rem', fontSize: '0.8rem', fontWeight: 600, cursor: busyOfferId === offer._id ? 'not-allowed' : 'pointer', opacity: busyOfferId === offer._id ? 0.7 : 1 }}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
              {offers.length === 0 && (
                <article style={{ border: '1px solid #efe8eb', borderRadius: 12, padding: '0.85rem', color: '#666' }}>
                  No offers created yet.
                </article>
              )}
            </div>
          </section>
        </>
      )}
    </StaffDashboardLayout>
  );
}
