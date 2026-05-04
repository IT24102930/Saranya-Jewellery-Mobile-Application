/**
 * Mobile-optimized Order Management Dashboard for Saranya Jewellery.
 * Uses bottom tab-bar navigation, swipeable order cards, and bottom-sheet modals on mobile.
 */

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { FiHome, FiTruck, FiFileText, FiLogOut, FiMenu, FiX, FiSearch, FiChevronDown, FiChevronUp, FiRefreshCw, FiPlus } from 'react-icons/fi';
import authManager from '../auth.js';

const STATUSES = [
  'all', 'Pending', 'Confirmed', 'Invoice Created', 'Payment Received',
  'Preparing', 'Ready for Collection', 'Completed', 'Cancelled', 'Refunded'
];

const STATUS_COLORS = {
  Pending:               { bg: '#fff3cd', text: '#856404' },
  Confirmed:             { bg: '#d1ecf1', text: '#0c5460' },
  'Invoice Created':     { bg: '#e0d4f5', text: '#4a2d7a' },
  'Payment Received':    { bg: '#d4edda', text: '#155724' },
  Preparing:             { bg: '#cce5ff', text: '#004085' },
  'Ready for Collection':{ bg: '#c3e6cb', text: '#1b5e20' },
  Completed:             { bg: '#d4edda', text: '#155724' },
  Cancelled:             { bg: '#f8d7da', text: '#721c24' },
  Refunded:              { bg: '#fce4ec', text: '#880e4f' },
};

function formatCurrency(amount) {
  return `Rs ${Number(amount || 0).toLocaleString()}`;
}

function getInvoiceSubtotal(order) {
  return Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0)
    : 0;
}

function getStatusColor(status) {
  return STATUS_COLORS[status] || { bg: '#e9ecef', text: '#495057' };
}

function downloadInvoicePdf(order) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const left = 40;
  let y = 40;
  const subtotal = getInvoiceSubtotal(order);
  const tax = Number(order.tax || 0);
  const total = Number(order.total ?? subtotal + tax);

  doc.setFontSize(18);
  doc.text('Saranya Jewellery Invoice', left, y); y += 28;
  doc.setFontSize(11);
  doc.text(`Invoice #: ${order.invoiceNumber || 'N/A'}`, left, y); y += 18;
  doc.text(`Order #: ${order.orderNumber || order._id?.slice(-8) || 'N/A'}`, left, y); y += 18;
  doc.text(`Date: ${order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString() : new Date(order.createdAt).toLocaleDateString()}`, left, y); y += 18;
  doc.text(`Customer: ${order.customerName || order.customerEmail || 'N/A'}`, left, y); y += 24;

  doc.setFontSize(12);
  doc.text('Description', left, y); doc.text('Qty', 280, y); doc.text('Price', 380, y); doc.text('Total', 520, y, { align: 'right' });
  y += 14;
  doc.setLineWidth(0.5); doc.line(left, y, 560, y); y += 18;

  order.items?.forEach(item => {
    if (y > 740) { doc.addPage(); y = 40; }
    doc.text(item.name || 'Item', left, y);
    doc.text(`${item.quantity || 0}`, 280, y);
    doc.text(formatCurrency(item.price || 0), 380, y);
    doc.text(formatCurrency((item.price || 0) * (item.quantity || 0)), 520, y, { align: 'right' });
    y += 18;
  });

  y += 12; doc.line(left, y, 560, y); y += 18;
  doc.text(`Subtotal: ${formatCurrency(subtotal)}`, 520, y, { align: 'right' }); y += 18;
  doc.text(`Tax: ${formatCurrency(tax)}`, 520, y, { align: 'right' }); y += 18;
  doc.setFontSize(13);
  doc.text(`Total: ${formatCurrency(total)}`, 520, y, { align: 'right' });

  if (order.orderNotes) {
    y += 28; doc.setFontSize(11);
    doc.text('Notes:', left, y); y += 16;
    doc.text(order.orderNotes, left, y, { maxWidth: 520 });
  }

  doc.save(`invoice-${order.invoiceNumber || order._id?.slice(-8) || 'order'}.pdf`);
}

function StatusBadge({ status }) {
  const colors = getStatusColor(status);
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.3rem 0.75rem',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: 700,
      background: colors.bg,
      color: colors.text,
      letterSpacing: '0.02em',
    }}>
      {status}
    </span>
  );
}

/**
 * Slides up from the bottom on mobile, centred on desktop.
 */
function MobileModal({ onClose, children, title, isMobile }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: isMobile ? '0' : '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'white',
        width: '100%',
        maxWidth: isMobile ? '100%' : '640px',
        maxHeight: isMobile ? '92vh' : '90vh',
        overflowY: 'auto',
        borderRadius: isMobile ? '24px 24px 0 0' : '20px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        WebkitOverflowScrolling: 'touch',
      }}>
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem 0 0' }}>
            <div style={{ width: '44px', height: '4px', borderRadius: '9999px', background: '#D4C5B5' }} />
          </div>
        )}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: isMobile ? '0.75rem 1.25rem 0.5rem' : '1.5rem 1.5rem 0.5rem',
          borderBottom: '1px solid #F0E2D2',
          position: 'sticky', top: 0, background: 'white', zIndex: 1,
        }}>
          <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", color: '#2E241F', fontSize: '1.15rem' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: '#F5EDE4', border: 'none', borderRadius: '50%',
              width: '36px', height: '36px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', color: '#6B5443',
            }}
          >
            <FiX />
          </button>
        </div>
        <div style={{ padding: isMobile ? '1rem 1.25rem 2rem' : '1.25rem 1.5rem 1.5rem' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function OrderDetailModal({ order, onClose, isMobile }) {
  if (!order) return null;
  const subtotal = getInvoiceSubtotal(order);
  const tax = Number(order.tax || 0);
  const total = Number(order.total ?? subtotal + tax);

  return (
    <MobileModal onClose={onClose} title="Order Details" isMobile={isMobile}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem 1rem', marginBottom: '1.2rem' }}>
        {[
          ['Order #', order.orderNumber || order._id?.slice(-8)],
          ['Customer', order.customerName || order.customerEmail],
          ['Email', order.customerEmail || 'N/A'],
          ['Phone', order.phoneNumber || 'N/A'],
          ['Date', new Date(order.createdAt).toLocaleDateString()],
          ['Payment', `${order.paymentStatus || 'Pending'} (${order.paymentMethod || 'N/A'})`],
          ['Invoice', order.invoiceNumber || 'Not created'],
          ['Inv. Notified', order.inventoryNotified ? 'Yes' : 'No'],
        ].map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#A27D53', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>{label}</div>
            <div style={{ fontSize: '0.9rem', color: '#2E241F', wordBreak: 'break-word' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <StatusBadge status={order.status} />
      </div>

      <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '0.9rem', color: '#352A22' }}>Items</h4>
      <div style={{ background: '#FDF9F2', borderRadius: '14px', overflow: 'hidden', marginBottom: '1rem' }}>
        {order.items?.map((item, idx) => (
          <div key={idx} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.65rem 0.9rem',
            borderBottom: idx < order.items.length - 1 ? '1px solid #F0E2D2' : 'none',
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#2E241F' }}>{item.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#8F7358' }}>× {item.quantity}</div>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#352A22' }}>
              {formatCurrency(item.price * item.quantity)}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0.9rem', borderTop: '2px solid #F0E2D2' }}>
          <span style={{ fontWeight: 700, color: '#352A22' }}>Total</span>
          <span style={{ fontWeight: 700, color: '#C5A059', fontSize: '1rem' }}>{formatCurrency(total)}</span>
        </div>
      </div>

      <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: '#6B5443' }}>
        <strong>Collection:</strong> Shop Collection
      </p>
      {order.paymentReceipt && (
        <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem' }}>
          <strong>Payment Receipt:</strong>{' '}
          <a href={order.paymentReceipt} target="_blank" rel="noreferrer" style={{ color: '#C5A059', fontWeight: 600 }}>View Receipt</a>
        </p>
      )}
      {order.orderNotes && (
        <p style={{ margin: '0', fontSize: '0.85rem', color: '#6B5443' }}>
          <strong>Notes:</strong> {order.orderNotes}
        </p>
      )}
    </MobileModal>
  );
}

function InvoiceModal({ order, onClose, isMobile }) {
  if (!order) return null;
  const subtotal = getInvoiceSubtotal(order);
  const tax = Number(order.tax || 0);
  const total = Number(order.total ?? subtotal + tax);

  return (
    <MobileModal onClose={onClose} title="Invoice Preview" isMobile={isMobile}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', marginBottom: '1rem' }}>
        {[
          ['Invoice #', order.invoiceNumber],
          ['Order #', order.orderNumber],
          ['Customer', order.customerName],
          ['Invoice Date', order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString() : '-'],
        ].map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#A27D53', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.1rem' }}>{label}</div>
            <div style={{ fontSize: '0.9rem', color: '#2E241F' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#FDF9F2', borderRadius: '14px', overflow: 'hidden', margin: '0.5rem 0 1rem' }}>
        {order.items?.map((item, idx) => (
          <div key={idx} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.6rem 0.9rem',
            borderBottom: idx < order.items.length - 1 ? '1px solid #F0E2D2' : 'none',
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#8F7358' }}>× {item.quantity}</div>
            </div>
            <div style={{ fontWeight: 600 }}>{formatCurrency(item.price * item.quantity)}</div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0.9rem', borderTop: '2px solid #F0E2D2' }}>
          <span style={{ fontWeight: 700 }}>Total</span>
          <span style={{ fontWeight: 700, color: '#C5A059', fontSize: '1.05rem' }}>{formatCurrency(total)}</span>
        </div>
      </div>

      <p style={{ fontSize: '0.85rem', marginBottom: '0.4rem', color: '#352A22' }}>
        <strong>Collect from Saranya Jewellers.</strong> Bring Order # <strong>{order.orderNumber}</strong>.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
        <button
          onClick={() => downloadInvoicePdf(order)}
          style={{
            background: '#D4AF37', color: '#2E241F', border: 'none',
            padding: '0.9rem', borderRadius: '14px', fontWeight: 700,
            cursor: 'pointer', fontSize: '1rem', width: '100%',
            minHeight: '48px',
          }}
        >
          Download PDF
        </button>
        <button
          onClick={onClose}
          style={{
            background: '#F5EDE4', color: '#6B5443', border: 'none',
            padding: '0.9rem', borderRadius: '14px', fontWeight: 600,
            cursor: 'pointer', fontSize: '1rem', width: '100%',
            minHeight: '48px',
          }}
        >
          Close
        </button>
      </div>
    </MobileModal>
  );
}

function CreateOrderModal({ onClose, onOrderCreated, products, isMobile }) {
  const [formData, setFormData] = useState({
    customerName: '', customerEmail: '', phoneNumber: '',
    paymentMethod: '', orderNotes: '', tax: 0,
    items: [{ productId: '', name: '', price: 0, quantity: 1, isCustom: false }]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isValidPhone = (phone) => /^\d{10}$/.test(phone);

  const updateField = (field, value) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const updateItem = (index, field, value) =>
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));

  const addItem = () =>
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', name: '', price: 0, quantity: 1, isCustom: false }]
    }));

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleProductSelect = (index, productId) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      updateItem(index, 'productId', productId);
      updateItem(index, 'name', product.name);
      updateItem(index, 'price', product.price || 0);
      updateItem(index, 'isCustom', false);
    } else {
      updateItem(index, 'productId', '');
      updateItem(index, 'name', '');
      updateItem(index, 'price', 0);
      updateItem(index, 'isCustom', true);
    }
  };

  const subtotal = formData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + Number(formData.tax);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.customerName || !formData.customerEmail || !formData.phoneNumber) {
      setError('Please fill in all customer details'); return;
    }
    if (!isValidPhone(formData.phoneNumber)) {
      setError('Phone number must be exactly 10 digits'); return;
    }
    const validItems = formData.items.filter(item => item.name && item.price > 0 && item.quantity > 0);
    if (validItems.length === 0) {
      setError('Please add at least one valid item'); return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        phoneNumber: formData.phoneNumber,
        paymentMethod: formData.paymentMethod || 'Bank Transfer',
        orderNotes: formData.orderNotes,
        tax: Number(formData.tax),
        items: validItems.map(item => ({
          productId: item.productId || undefined,
          name: item.name,
          price: Number(item.price),
          quantity: Number(item.quantity),
        }))
      };
      const response = await authManager.apiRequest('/api/orders/custom', {
        method: 'POST', body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create order');
      onOrderCreated(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // font-size ≥ 16px prevents iOS auto-zoom on inputs
  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '0.75rem', border: '1.5px solid #EAD7C4',
    borderRadius: '12px', fontSize: '1rem',
    background: '#FEFCF8', color: '#2E241F',
    outline: 'none', WebkitAppearance: 'none',
  };

  return (
    <MobileModal onClose={onClose} title="Create Manual Order" isMobile={isMobile}>
      {error && (
        <div role="alert" style={{
          padding: '0.75rem 1rem', borderRadius: '12px',
          background: '#f8d7da', color: '#721c24',
          fontSize: '0.9rem', marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

        <section>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#A27D53' }}>
            Customer Details
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem', color: '#352A22' }}>
                Full Name *
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={e => updateField('customerName', e.target.value)}
                placeholder="Customer full name"
                autoComplete="name"
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem', color: '#352A22' }}>
                Email *
              </label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={e => updateField('customerEmail', e.target.value)}
                placeholder="customer@email.com"
                inputMode="email"
                autoComplete="email"
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem', color: '#352A22' }}>
                Phone * (10 digits)
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={e => updateField('phoneNumber', e.target.value)}
                placeholder="0771234567"
                inputMode="numeric"
                maxLength="10"
                pattern="\d{10}"
                autoComplete="tel"
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem', color: '#352A22' }}>
                Payment Method
              </label>
              <select
                value={formData.paymentMethod}
                onChange={e => updateField('paymentMethod', e.target.value)}
                style={{ ...inputStyle }}
              >
                <option value="">Select Payment Method</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#A27D53' }}>
            Order Items
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {formData.items.map((item, idx) => (
              <div key={idx} style={{
                background: '#FDF9F2', borderRadius: '14px',
                border: '1px solid #F0E2D2', padding: '0.9rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#352A22' }}>Item {idx + 1}</span>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      aria-label={`Remove item ${idx + 1}`}
                      style={{
                        background: '#f8d7da', color: '#721c24', border: 'none',
                        borderRadius: '8px', padding: '0.35rem 0.7rem',
                        fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                        minHeight: '36px',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <select
                    value={item.productId || ''}
                    onChange={e => handleProductSelect(idx, e.target.value)}
                    style={{ ...inputStyle, fontSize: '0.9rem', padding: '0.6rem' }}
                  >
                    <option value="">-- Select Product / Custom --</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} (Stock: {p.stockQuantity || 0}) — {formatCurrency(p.price || 0)}
                      </option>
                    ))}
                    <option value="custom">-- Custom Item --</option>
                  </select>

                  <input
                    type="text"
                    value={item.name}
                    onChange={e => updateItem(idx, 'name', e.target.value)}
                    placeholder="Item name"
                    style={{ ...inputStyle, fontSize: '0.9rem', padding: '0.6rem' }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.75rem', fontWeight: 600, color: '#A27D53' }}>Price (LKR)</label>
                      <input
                        type="number"
                        value={item.price}
                        onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        style={{ ...inputStyle, fontSize: '0.9rem', padding: '0.6rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.75rem', fontWeight: 600, color: '#A27D53' }}>Qty</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                        inputMode="numeric"
                        min="1"
                        style={{ ...inputStyle, fontSize: '0.9rem', padding: '0.6rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'transparent', color: '#C5A059',
              border: '1.5px dashed #D4AF37', borderRadius: '12px',
              padding: '0.75rem', width: '100%', justifyContent: 'center',
              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              marginTop: '0.75rem', minHeight: '48px',
            }}
          >
            <FiPlus /> Add Item
          </button>
        </section>

        <section style={{ background: '#FDF9F2', borderRadius: '14px', padding: '0.9rem', border: '1px solid #F0E2D2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#6B5443' }}>Subtotal</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label style={{ fontSize: '0.9rem', color: '#6B5443' }}>Tax (LKR)</label>
            <input
              type="number"
              value={formData.tax}
              onChange={e => updateField('tax', parseFloat(e.target.value) || 0)}
              inputMode="decimal"
              step="0.01"
              min="0"
              style={{ width: '120px', padding: '0.4rem 0.6rem', border: '1.5px solid #EAD7C4', borderRadius: '10px', fontSize: '0.9rem', background: '#FEFCF8', textAlign: 'right' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #F0E2D2' }}>
            <span style={{ fontWeight: 700, color: '#352A22' }}>Total</span>
            <span style={{ fontWeight: 700, color: '#C5A059', fontSize: '1.05rem' }}>{formatCurrency(total)}</span>
          </div>
        </section>

        <div>
          <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem', color: '#352A22' }}>
            Order Notes
          </label>
          <textarea
            value={formData.orderNotes}
            onChange={e => updateField('orderNotes', e.target.value)}
            placeholder="Add any special notes..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              background: isSubmitting ? '#DDD' : '#D4AF37',
              color: '#2E241F', border: 'none',
              padding: '0.95rem', borderRadius: '14px',
              fontWeight: 700, fontSize: '1rem', cursor: isSubmitting ? 'not-allowed' : 'pointer',
              minHeight: '52px', width: '100%',
            }}
          >
            {isSubmitting ? 'Creating Order…' : 'Create Order'}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#F5EDE4', color: '#6B5443', border: 'none',
              padding: '0.95rem', borderRadius: '14px',
              fontWeight: 600, fontSize: '1rem', cursor: 'pointer',
              minHeight: '52px', width: '100%',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </MobileModal>
  );
}

/**
 * Expandable order card for mobile view — tap to reveal action buttons.
 */
function OrderCard({ order, onView, onViewInvoice, actionButtons, isBusy }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      border: '1px solid #F4E9DF',
      overflow: 'hidden',
      marginBottom: '0.75rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      <div
        style={{ padding: '0.9rem 1rem', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setExpanded(prev => !prev); }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#2E241F', fontSize: '0.95rem' }}>
              {order.orderNumber || order._id?.slice(-8)}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#6B5443', marginTop: '0.15rem' }}>
              {order.customerName || 'N/A'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, color: '#352A22', fontSize: '0.95rem' }}>
              {formatCurrency(order.totalAmount || order.total || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#8F7358', marginTop: '0.15rem' }}>
              {new Date(order.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.6rem' }}>
          <StatusBadge status={order.status} />
          <span style={{ color: '#C5A059', fontSize: '1rem' }}>
            {expanded ? <FiChevronUp /> : <FiChevronDown />}
          </span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #F4E9DF', padding: '0.9rem 1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1rem', marginBottom: '0.8rem' }}>
            {[
              ['Items', `${order.items?.length || 0} item(s)`],
              ['Payment', order.paymentStatus || 'Pending'],
              ['Method', order.paymentMethod || 'N/A'],
              ['Invoice', order.invoiceNumber || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#A27D53', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                <div style={{ fontSize: '0.85rem', color: '#2E241F' }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={() => onView(order)}
              disabled={isBusy}
              style={{
                background: '#AA7A5C', color: 'white', border: 'none',
                padding: '0.75rem', borderRadius: '12px',
                fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                minHeight: '48px', width: '100%',
              }}
            >
              View Details
            </button>
            {order.invoiceNumber && (
              <button
                onClick={() => onViewInvoice(order)}
                disabled={isBusy}
                style={{
                  background: '#C5A059', color: 'white', border: 'none',
                  padding: '0.75rem', borderRadius: '12px',
                  fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                  minHeight: '48px', width: '100%',
                }}
              >
                View Invoice
              </button>
            )}
            {actionButtons.map((btn, i) => (
              <div key={i}>{btn}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderManagementDashboardPage() {
  const [staffUser, setStaffUser]           = useState(null);
  const [orders, setOrders]                 = useState([]);
  const [products, setProducts]             = useState([]);
  const [statusFilter, setStatusFilter]     = useState('all');
  const [busyId, setBusyId]                 = useState('');
  const [error, setError]                   = useState('');
  const [successMsg, setSuccessMsg]         = useState('');
  const [selectedOrder, setSelectedOrder]   = useState(null);
  const [invoiceOrder, setInvoiceOrder]     = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab]           = useState('dashboard');
  const [searchTerm, setSearchTerm]         = useState('');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoading, setIsLoading]           = useState(true);

  // true when viewport < 1024 px
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsMobileNavOpen(false);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on tab change (mobile)
  useEffect(() => {
    if (isMobile) setIsMobileNavOpen(false);
  }, [activeTab, isMobile]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = isMobile && isMobileNavOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileNavOpen, isMobile]);

  async function loadProducts() {
    try {
      const response = await authManager.apiRequest('/api/products');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load products');
      setProducts(Array.isArray(data) ? data : []);
    } catch { setProducts([]); }
  }

  async function loadOrders() {
    setError('');
    try {
      const response = await authManager.apiRequest('/api/orders');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setOrders([]);
    }
  }

  useEffect(() => {
    document.title = 'Order Management — Saranya Jewellery';
    // Load Chart.js from CDN if not already available
    if (!window.Chart) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      document.head.appendChild(script);
    }
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, []);

  useEffect(() => {
    async function bootstrap() {
      setIsLoading(true);
      const me = await authManager.checkStaffAuth('Order Management');
      if (!me || me.needsApproval) { setIsLoading(false); return; }
      setStaffUser(me);
      await Promise.all([loadOrders(), loadProducts()]);
      setIsLoading(false);
    }
    bootstrap();
  }, []);

  const stats = useMemo(() => {
    const pending   = orders.filter(o => o.status === 'Pending').length;
    const confirmed = orders.filter(o => o.status === 'Confirmed').length;
    const invoiced  = orders.filter(o => o.status === 'Invoice Created').length;
    const completed = orders.filter(o => ['Completed', 'Ready for Collection'].includes(o.status)).length;
    const revenue   = orders
      .filter(o => !['Cancelled', 'Refunded'].includes(o.status))
      .reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0);
    return { pending, confirmed, invoiced, completed, revenue };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (statusFilter !== 'all') filtered = filtered.filter(o => o.status === statusFilter);
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(o =>
        (o.orderNumber || '').toLowerCase().includes(term) ||
        (o._id || '').slice(-8).toLowerCase().includes(term) ||
        (o.customerName || '').toLowerCase().includes(term) ||
        (o.customerEmail || '').toLowerCase().includes(term) ||
        (o.phoneNumber || '').toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [orders, statusFilter, searchTerm]);

  const invoicesList = useMemo(() => {
    let filtered = orders.filter(o => o.invoiceNumber);
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(o =>
        (o.invoiceNumber || '').toLowerCase().includes(term) ||
        (o.orderNumber || '').toLowerCase().includes(term) ||
        (o._id || '').slice(-8).toLowerCase().includes(term) ||
        (o.customerName || '').toLowerCase().includes(term) ||
        (o.customerEmail || '').toLowerCase().includes(term)
      );
    }
    return filtered.sort((a, b) =>
      new Date(b.invoiceDate || b.updatedAt || b.createdAt) -
      new Date(a.invoiceDate || a.updatedAt || a.createdAt)
    );
  }, [orders, searchTerm]);

  const weeklyRevenueData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      const dayRevenue = orders
        .filter(o => {
          if (!o.createdAt) return false;
          const d = new Date(o.createdAt);
          return d >= date && d < nextDate;
        })
        .reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0);
      result.push({ label: days[date.getDay()], value: dayRevenue });
    }
    return result;
  }, [orders]);

  // Build Chart.js bar chart
  useEffect(() => {
    if (!window.Chart) return;
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    if (chartInstance.current) chartInstance.current.destroy();
    chartInstance.current = new window.Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: weeklyRevenueData.map(d => d.label),
        datasets: [{
          label: 'Revenue (LKR K)',
          data: weeklyRevenueData.map(d => d.value / 1000),
          backgroundColor: '#D4AF37',
          borderRadius: 10,
          barPercentage: 0.65,
          categoryPercentage: 0.8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => `Rs ${weeklyRevenueData[ctx.dataIndex].value.toLocaleString()}` } }
        },
        scales: {
          y: { grid: { color: '#F3E9DE' }, ticks: { callback: val => `Rs ${val}K` } },
          x: { grid: { display: false } }
        }
      }
    });
  }, [weeklyRevenueData, activeTab]);

  async function patchOrder(orderId, endpoint, body = null) {
    setBusyId(orderId);
    setError(''); setSuccessMsg('');
    try {
      const response = await authManager.apiRequest(endpoint, {
        method: 'PATCH',
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update order');
      setSuccessMsg(data.message || 'Order updated');
      await loadOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  const markPaymentReceived    = (o) => patchOrder(o._id, `/api/orders/${o._id}/payment-received`);
  const markPaymentNotReceived = (o) => {
    if (window.confirm('Payment not received. Cancel this order?'))
      patchOrder(o._id, `/api/orders/${o._id}/payment-not-received`);
  };
  const createInvoice          = (o) => patchOrder(o._id, `/api/orders/${o._id}/invoice`);
  const confirmOrder           = (o) => patchOrder(o._id, `/api/orders/${o._id}/confirm`);
  const readyForCollection     = (o) => patchOrder(o._id, `/api/orders/${o._id}/status`, { status: 'Ready for Collection' });
  const completeOrder          = (o) => patchOrder(o._id, `/api/orders/${o._id}/status`, { status: 'Completed' });
  const refundOrder            = (o) => {
    if (window.confirm('Refund this order? Stock will be restored.'))
      patchOrder(o._id, `/api/orders/${o._id}/status`, { status: 'Refunded' });
  };

  /**
   * Returns action buttons for an order — full-width stacked on mobile, compact pills on desktop.
   */
  const getActionButtons = useCallback((order) => {
    const busy = busyId === order._id;

    const mobileBtn = (label, bg, textColor, onClick) => (
      <button
        key={label}
        onClick={onClick}
        disabled={busy}
        style={{
          background: busy ? '#ddd' : bg,
          color: busy ? '#999' : (textColor || 'white'),
          border: 'none', borderRadius: '12px',
          padding: '0.75rem', minHeight: '48px', width: '100%',
          fontWeight: 600, fontSize: '0.9rem',
          cursor: busy ? 'not-allowed' : 'pointer',
        }}
      >
        {busy ? '…' : label}
      </button>
    );

    const desktopBtn = (label, bg, textColor, onClick) => (
      <button
        key={label}
        onClick={onClick}
        disabled={busy}
        className="action-btn"
        style={{ background: busy ? '#ddd' : bg, color: textColor || 'white' }}
      >
        {label}
      </button>
    );

    const btn = isMobile ? mobileBtn : desktopBtn;
    const btns = [];

    if (!isMobile) {
      btns.push(btn('View', '#AA7A5C', 'white', () => setSelectedOrder(order)));
      if (order.invoiceNumber)
        btns.push(btn('View Invoice', '#C5A059', 'white', () => setInvoiceOrder(order)));
    }

    if (order.status === 'Pending') {
      btns.push(btn('Payment Received', '#4D6A3B', 'white', () => markPaymentReceived(order)));
      btns.push(btn('Cancel Payment', '#AA5C3B', 'white', () => markPaymentNotReceived(order)));
    } else if (order.status === 'Payment Received') {
      btns.push(btn('Create Invoice', '#C5A059', 'white', () => createInvoice(order)));
    } else if (order.status === 'Invoice Created') {
      btns.push(btn('Confirm Order', '#4D6A3B', 'white', () => confirmOrder(order)));
    } else if (order.status === 'Confirmed') {
      btns.push(btn('Ready for Collection', '#D4AF37', '#2E241F', () => readyForCollection(order)));
    } else if (order.status === 'Ready for Collection') {
      btns.push(btn('Complete Order', '#4D6A3B', 'white', () => completeOrder(order)));
    } else if (['Completed', 'Invoice Created', 'Confirmed'].includes(order.status)) {
      btns.push(btn('Refund Order', '#AA5C3B', 'white', () => refundOrder(order)));
    }

    return btns;
  }, [busyId, isMobile]);

  if (isLoading || !staffUser) {
    return (
      <div style={{
        minHeight: '100vh', background: '#FDF9F2',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '1rem', fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#EAD7C4', animation: 'pulse 1.4s ease-in-out infinite' }} />
        <p style={{ color: '#A27D53', fontSize: '1rem' }}>Checking access…</p>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
      </div>
    );
  }

  const NAV_ITEMS = [
    { key: 'dashboard', icon: FiHome,     label: 'Dashboard' },
    { key: 'orders',    icon: FiTruck,    label: 'Orders'    },
    { key: 'invoices',  icon: FiFileText, label: 'Invoices'  },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FDF9F2', fontFamily: "'Inter', sans-serif", position: 'relative' }}>

      {/* Sidebar — fixed on desktop, slide-in drawer on mobile */}
      {isMobile && isMobileNavOpen && (
        <div
          onClick={() => setIsMobileNavOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(23,12,18,0.45)', zIndex: 140 }}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Main navigation"
        style={{
          width: isMobile ? '85vw' : '280px',
          maxWidth: '320px',
          background: '#6f0022',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          height: '100vh',
          left: 0, top: 0,
          zIndex: 200,
          transform: isMobile ? (isMobileNavOpen ? 'translateX(0)' : 'translateX(-105%)') : 'translateX(0)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: isMobile ? '8px 0 32px rgba(0,0,0,0.2)' : 'none',
        }}
      >
        <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: '#e0bf63' }}>
            ✦ Order Management
          </h2>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setActiveTab(item.key); setIsMobileNavOpen(false); }}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.85rem',
                  width: '100%', marginBottom: '0.25rem',
                  padding: '0.95rem 1rem',
                  background: active ? '#e0bf63' : 'transparent',
                  color: active ? '#3d2b00' : '#fff',
                  border: 'none', borderRadius: '12px',
                  fontSize: '1rem', fontWeight: active ? 700 : 500,
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.2s, color 0.2s',
                  minHeight: '52px',
                }}
              >
                <Icon size={22} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
            background: '#e0bf63', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '1.2rem', color: '#3d2b00',
          }}>
            {staffUser?.fullName?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Hello, {staffUser?.fullName?.split(' ')[0]}
            </div>
          </div>
          <button
            onClick={() => authManager.logout()}
            aria-label="Log out"
            style={{
              background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none',
              width: '40px', height: '40px', borderRadius: '50%',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FiLogOut size={18} />
          </button>
        </div>
      </aside>

      <main style={{
        flex: 1,
        marginLeft: isMobile ? 0 : '280px',
        paddingTop: isMobile ? '72px' : '1.5rem',
        paddingBottom: isMobile ? '80px' : '1.5rem',
        paddingLeft: isMobile ? '1rem' : '2rem',
        paddingRight: isMobile ? '1rem' : '2rem',
        width: '100%',
        boxSizing: 'border-box',
      }}>

        {/* Sticky top header — mobile only */}
        {isMobile && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 130,
            background: 'rgba(253,249,242,0.95)',
            backdropFilter: 'blur(8px)',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #F0E2D2',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(prev => !prev)}
              aria-label={isMobileNavOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={isMobileNavOpen}
              aria-controls="sidebar"
              style={{
                flexShrink: 0,
                border: 'none', background: '#6f0022', color: '#fff',
                width: '44px', height: '44px', borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: '1.3rem',
                boxShadow: '0 4px 12px rgba(111,0,34,0.3)',
              }}
            >
              {isMobileNavOpen ? <FiX /> : <FiMenu />}
            </button>

            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'white', padding: '0.6rem 0.9rem',
              borderRadius: '999px', border: '1px solid #F0E2D2',
            }}>
              <FiSearch style={{ color: '#C5A15B', flexShrink: 0 }} />
              <input
                type="search"
                placeholder="Search orders…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                aria-label="Search orders"
                style={{
                  border: 'none', background: 'transparent',
                  outline: 'none', fontSize: '1rem', width: '100%',
                  color: '#2E241F',
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#8F7358', fontSize: '1.1rem' }}
                >
                  <FiX />
                </button>
              )}
            </div>

            <button
              onClick={loadOrders}
              aria-label="Refresh orders"
              style={{
                flexShrink: 0,
                background: 'white', border: '1px solid #F0E2D2',
                width: '44px', height: '44px', borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#C5A059',
              }}
            >
              <FiRefreshCw size={18} />
            </button>
          </div>
        )}

        {/* Desktop search bar */}
        {!isMobile && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', gap: '0.8rem' }}>
            <div style={{
              background: 'white', padding: '0.5rem 1rem', borderRadius: '30px',
              display: 'flex', alignItems: 'center', gap: '8px',
              border: '1px solid #F0E2D2', width: '260px',
            }}>
              <FiSearch style={{ color: '#C5A15B' }} />
              <input
                type="search"
                placeholder="Search orders…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', width: '100%' }}
              />
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              padding: '0.8rem 1rem', borderRadius: '14px', marginBottom: '1rem',
              background: '#f8d7da', color: '#721c24',
              fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}
          >
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError('')} aria-label="Dismiss error" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#721c24' }}>
              <FiX />
            </button>
          </div>
        )}
        {successMsg && (
          <div
            role="status"
            style={{
              padding: '0.8rem 1rem', borderRadius: '14px', marginBottom: '1rem',
              background: '#d4edda', color: '#155724',
              fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}
          >
            <span style={{ flex: 1 }}>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#155724' }}>
              <FiX />
            </button>
          </div>
        )}

        {/* Dashboard tab */}
        {activeTab === 'dashboard' && (
          <>
            {/* Stat cards — 2-column on mobile, auto-fit on desktop */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.85rem',
              marginBottom: '1.5rem',
            }}>
              {[
                { label: 'Pending',   value: stats.pending,              emoji: '⏳' },
                { label: 'Confirmed', value: stats.confirmed,            emoji: '✅' },
                { label: 'Invoiced',  value: stats.invoiced,             emoji: '🧾' },
                { label: 'Completed', value: stats.completed,            emoji: '🏆' },
                { label: 'Revenue',   value: formatCurrency(stats.revenue), emoji: '💰', fullWidth: isMobile },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: 'white', borderRadius: '18px',
                    padding: isMobile ? '1rem' : '1.2rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    border: '1px solid #F3E9DF',
                    textAlign: 'center',
                    gridColumn: item.fullWidth ? '1 / -1' : undefined,
                  }}
                >
                  <div style={{ fontSize: isMobile ? '1.6rem' : '2rem', marginBottom: '0.4rem' }}>{item.emoji}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8F7358', marginBottom: '0.25rem' }}>{item.label}</div>
                  <div style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 700, color: '#2E241F' }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'white', borderRadius: '20px', padding: '1rem', border: '1px solid #F0E2D2', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.8rem', fontWeight: 600, color: '#352A22', fontSize: '0.95rem' }}>
                📊 Weekly Revenue (LKR)
              </h4>
              <canvas id="revenueChart" width="400" height={isMobile ? 200 : 160} style={{ maxWidth: '100%' }} />
            </div>

            {/* Recent Orders — cards on mobile, table on desktop */}
            <div style={{ background: 'white', borderRadius: '20px', padding: '1rem', border: '1px solid #F0E2D2' }}>
              <h4 style={{ margin: '0 0 0.8rem', fontWeight: 600, color: '#352A22', fontSize: '0.95rem' }}>🕐 Recent Orders</h4>
              {isMobile ? (
                filteredOrders.slice(0, 5).map(order => (
                  <div
                    key={order._id}
                    onClick={() => setSelectedOrder(order)}
                    role="button"
                    tabIndex={0}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.75rem 0', borderBottom: '1px solid #F4E9DF',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#2E241F' }}>{order.orderNumber || order._id?.slice(-8)}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6B5443' }}>{order.customerName || order.customerEmail}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatCurrency(order.total || 0)}</div>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        {['Order ID', 'Customer', 'Amount', 'Status'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '0.6rem 0.8rem', color: '#A27D53', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.slice(0, 5).map(order => (
                        <tr key={order._id}>
                          <td style={{ padding: '0.6rem 0.8rem', borderTop: '1px solid #F4E9DF' }}>{order.orderNumber || order._id?.slice(-8)}</td>
                          <td style={{ padding: '0.6rem 0.8rem', borderTop: '1px solid #F4E9DF' }}>{order.customerName || order.customerEmail}</td>
                          <td style={{ padding: '0.6rem 0.8rem', borderTop: '1px solid #F4E9DF' }}>{formatCurrency(order.total || 0)}</td>
                          <td style={{ padding: '0.6rem 0.8rem', borderTop: '1px solid #F4E9DF' }}>
                            <StatusBadge status={order.status} />
                          </td>
                        </tr>
                      ))}
                      {filteredOrders.length === 0 && (
                        <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>No orders</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Orders tab */}
        {activeTab === 'orders' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: isMobile ? '1.2rem' : '1.4rem', fontFamily: "'Playfair Display', serif", color: '#352A22' }}>
                🚚 Orders Queue
              </h2>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  background: '#D4AF37', border: 'none',
                  padding: '0.7rem 1.4rem', borderRadius: '999px',
                  fontWeight: 700, color: '#2E241F', fontSize: '0.9rem',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                  minHeight: '48px',
                }}
              >
                <FiPlus /> Create Manual
              </button>
            </div>

            {/* Horizontally scrollable status filter pills */}
            <div style={{
              display: 'flex', gap: '0.5rem',
              overflowX: 'auto', paddingBottom: '0.5rem',
              marginBottom: '1.25rem',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
            }}>
              {STATUSES.map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  aria-pressed={statusFilter === status}
                  style={{
                    padding: '0.55rem 1rem',
                    border: `1.5px solid ${statusFilter === status ? '#D4AF37' : '#EAD7C4'}`,
                    background: statusFilter === status ? '#D4AF37' : 'white',
                    color: statusFilter === status ? '#2E241F' : '#A77C35',
                    cursor: 'pointer', borderRadius: '999px',
                    fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap',
                    minHeight: '40px', flexShrink: 0,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {status === 'all' ? 'All' : status}
                </button>
              ))}
            </div>

            {/* Orders — cards on mobile, table on desktop */}
            {isMobile ? (
              <div>
                {filteredOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#999', background: 'white', borderRadius: '20px' }}>
                    No orders found
                  </div>
                ) : (
                  filteredOrders.map(order => (
                    <OrderCard
                      key={order._id}
                      order={order}
                      onView={setSelectedOrder}
                      onViewInvoice={setInvoiceOrder}
                      actionButtons={getActionButtons(order)}
                      isBusy={busyId === order._id}
                    />
                  ))
                )}
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #F0E2D2', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      {['Order ID', 'Customer', 'Date', 'Items', 'Amount', 'Status', 'Payment', 'Invoice', 'Actions'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.8rem 1rem', color: '#A27D53', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No orders found</td></tr>
                    ) : filteredOrders.map(order => (
                      <tr key={order._id} style={{ borderBottom: '1px solid #F4E9DF' }}>
                        <td style={{ padding: '0.8rem 1rem' }}>{order.orderNumber || order._id?.slice(-8)}</td>
                        <td style={{ padding: '0.8rem 1rem' }}>{order.customerName || 'N/A'}</td>
                        <td style={{ padding: '0.8rem 1rem' }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '0.8rem 1rem' }}>{order.items?.length || 0} items</td>
                        <td style={{ padding: '0.8rem 1rem', fontWeight: 600 }}>{formatCurrency(order.totalAmount || order.total || 0)}</td>
                        <td style={{ padding: '0.8rem 1rem' }}><StatusBadge status={order.status} /></td>
                        <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: order.paymentStatus === 'Paid' ? '#4D6A3B' : order.paymentStatus === 'Refunded' ? '#AA5C3B' : '#8F7358' }}>
                          {order.paymentStatus || 'Pending'}
                        </td>
                        <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem' }}>{order.invoiceNumber || '—'}</td>
                        <td style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {getActionButtons(order)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Invoices tab */}
        {activeTab === 'invoices' && (
          <>
            <h2 style={{ margin: '0 0 1rem', fontFamily: "'Playfair Display', serif", color: '#352A22', fontSize: isMobile ? '1.2rem' : '1.4rem' }}>
              🧾 Created Invoices
            </h2>

            {isMobile ? (
              <div>
                {invoicesList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#999', background: 'white', borderRadius: '20px' }}>
                    No invoices found
                  </div>
                ) : invoicesList.map(order => (
                  <div
                    key={order._id}
                    style={{ background: 'white', borderRadius: '16px', border: '1px solid #F4E9DF', padding: '1rem', marginBottom: '0.75rem' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#C5A059' }}>{order.invoiceNumber}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6B5443' }}>Order #{order.orderNumber || order._id?.slice(-8)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{formatCurrency(order.totalAmount || order.total || 0)}</div>
                        <div style={{ fontSize: '0.75rem', color: '#8F7358' }}>
                          {new Date(order.invoiceDate || order.updatedAt || order.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#352A22', marginBottom: '0.75rem' }}>
                      {order.customerName || order.customerEmail || 'N/A'}
                    </div>
                    <button
                      onClick={() => setInvoiceOrder(order)}
                      style={{
                        background: '#C5A059', color: 'white', border: 'none',
                        padding: '0.7rem', borderRadius: '12px', width: '100%',
                        fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', minHeight: '48px',
                      }}
                    >
                      View Invoice
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #F0E2D2', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      {['Invoice No', 'Order No', 'Customer', 'Date', 'Amount', 'Action'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.8rem 1rem', color: '#A27D53', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoicesList.length === 0 ? (
                      <tr><td colSpan="6" style={{ padding: '1.5rem', textAlign: 'center', color: '#999' }}>No invoices found</td></tr>
                    ) : invoicesList.map(order => (
                      <tr key={order._id} style={{ borderBottom: '1px solid #F4E9DF' }}>
                        <td style={{ padding: '0.8rem 1rem' }}>{order.invoiceNumber}</td>
                        <td style={{ padding: '0.8rem 1rem' }}>{order.orderNumber || order._id?.slice(-8)}</td>
                        <td style={{ padding: '0.8rem 1rem' }}>{order.customerName || order.customerEmail || 'N/A'}</td>
                        <td style={{ padding: '0.8rem 1rem' }}>{new Date(order.invoiceDate || order.updatedAt || order.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '0.8rem 1rem', fontWeight: 600 }}>{formatCurrency(order.totalAmount || order.total || 0)}</td>
                        <td style={{ padding: '0.8rem 1rem' }}>
                          <button
                            onClick={() => setInvoiceOrder(order)}
                            className="action-btn"
                            style={{ background: '#C5A059' }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <footer style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.7rem', color: '#C7B29A' }}>
          © Saranya Jewellery — handcrafted excellence
        </footer>
      </main>

      {/* Bottom tab bar — mobile only */}
      {isMobile && (
        <nav
          aria-label="Bottom navigation"
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 130,
            background: 'rgba(253,249,242,0.96)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid #F0E2D2',
            display: 'flex',
            height: '64px',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
          }}
        >
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  border: 'none', background: 'transparent',
                  color: active ? '#6f0022' : '#A27D53',
                  cursor: 'pointer', gap: '0.2rem',
                  minHeight: '64px',
                  transition: 'color 0.15s',
                }}
              >
                <Icon size={active ? 22 : 20} strokeWidth={active ? 2.5 : 1.8} />
                <span style={{ fontSize: '0.65rem', fontWeight: active ? 700 : 500 }}>{item.label}</span>
                {active && (
                  <div style={{ width: '24px', height: '3px', borderRadius: '9999px', background: '#6f0022', marginTop: '2px' }} />
                )}
              </button>
            );
          })}
        </nav>
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          isMobile={isMobile}
        />
      )}
      {invoiceOrder && (
        <InvoiceModal
          order={invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
          isMobile={isMobile}
        />
      )}
      {showCreateModal && (
        <CreateOrderModal
          onClose={() => setShowCreateModal(false)}
          onOrderCreated={() => { loadOrders(); setShowCreateModal(false); }}
          products={products}
          isMobile={isMobile}
        />
      )}

      <style>{`
        .action-btn {
          display: inline-flex;
          align-items: center;
          padding: 0.4rem 0.8rem;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
          margin: 0.2rem;
          white-space: nowrap;
          transition: opacity 0.15s, transform 0.1s;
          min-height: 32px;
        }
        .action-btn:hover:not(:disabled) { opacity: 0.85; transform: scale(0.97); }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        div[style*='overflowX: auto']::-webkit-scrollbar { display: none; }

        button:focus-visible {
          outline: 2px solid #D4AF37;
          outline-offset: 2px;
        }
        input:focus-visible, select:focus-visible, textarea:focus-visible {
          outline: none;
          border-color: #D4AF37 !important;
          box-shadow: 0 0 0 3px rgba(212,175,55,0.2);
        }

        @media (max-width: 1023px) {
          body { overflow-x: hidden; }
        }
      `}</style>
    </div>
  );
}