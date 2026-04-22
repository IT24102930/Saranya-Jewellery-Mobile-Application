import { useEffect, useMemo, useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { FiHome, FiTruck, FiFileText, FiLogOut } from 'react-icons/fi';
import authManager from '../auth.js';

// Chart.js CDN will be loaded in useEffect
const STATUSES = [
  'all', 'Pending', 'Confirmed', 'Invoice Created', 'Payment Received',
  'Preparing', 'Ready for Collection', 'Completed', 'Cancelled', 'Refunded'
];

const STATUS_COLORS = {
  Pending: '#fff3cd',
  Confirmed: '#d1ecf1',
  'Invoice Created': '#e0d4f5',
  'Payment Received': '#d4edda',
  Preparing: '#cce5ff',
  'Ready for Collection': '#c3e6cb',
  Completed: '#d4edda',
  Cancelled: '#f8d7da',
  Refunded: '#fce4ec'
};

function formatCurrency(amount) {
  return `Rs ${Number(amount || 0).toLocaleString()}`;
}

function getInvoiceSubtotal(order) {
  return Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0)
    : 0;
}

function downloadInvoicePdf(order) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const left = 40;
  let y = 40;
  const subtotal = getInvoiceSubtotal(order);
  const tax = Number(order.tax || 0);
  const total = Number(order.total ?? subtotal + tax);

  doc.setFontSize(18);
  doc.text('Saranya Jewellery Invoice', left, y);
  y += 28;
  doc.setFontSize(11);
  doc.text(`Invoice #: ${order.invoiceNumber || 'N/A'}`, left, y);
  y += 18;
  doc.text(`Order #: ${order.orderNumber || order._id?.slice(-8) || 'N/A'}`, left, y);
  y += 18;
  doc.text(`Date: ${order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString() : new Date(order.createdAt).toLocaleDateString()}`, left, y);
  y += 18;
  doc.text(`Customer: ${order.customerName || order.customerEmail || 'N/A'}`, left, y);
  y += 24;

  doc.setFontSize(12);
  doc.text('Description', left, y);
  doc.text('Qty', 280, y);
  doc.text('Price', 380, y);
  doc.text('Total', 520, y, { align: 'right' });
  y += 14;
  doc.setLineWidth(0.5);
  doc.line(left, y, 560, y);
  y += 18;

  order.items?.forEach((item) => {
    if (y > 740) {
      doc.addPage();
      y = 40;
    }
    doc.text(item.name || 'Item', left, y);
    doc.text(`${item.quantity || 0}`, 280, y);
    doc.text(formatCurrency(item.price || 0), 380, y);
    doc.text(formatCurrency((item.price || 0) * (item.quantity || 0)), 520, y, { align: 'right' });
    y += 18;
  });

  y += 12;
  doc.line(left, y, 560, y);
  y += 18;
  doc.text(`Subtotal: ${formatCurrency(subtotal)}`, 520, y, { align: 'right' });
  y += 18;
  doc.text(`Tax: ${formatCurrency(tax)}`, 520, y, { align: 'right' });
  y += 18;
  doc.setFontSize(13);
  doc.text(`Total: ${formatCurrency(total)}`, 520, y, { align: 'right' });

  if (order.orderNotes) {
    y += 28;
    doc.setFontSize(11);
    doc.text('Notes:', left, y);
    y += 16;
    doc.text(order.orderNotes, left, y, { maxWidth: 520 });
  }

  doc.save(`invoice-${order.invoiceNumber || order._id?.slice(-8) || 'order'}.pdf`);
}

// Order Detail Modal Component (now includes email and phone prominently)
function OrderDetailModal({ order, onClose, getStatusColor }) {
  if (!order) return null;

  const subtotal = getInvoiceSubtotal(order);
  const tax = Number(order.tax || 0);
  const total = Number(order.total ?? subtotal + tax);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'white', padding: '2rem', borderRadius: '28px',
        maxWidth: '700px', width: '90%', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", color: '#2E241F' }}>Order Details</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <p><strong>Order #:</strong> {order.orderNumber || order._id?.slice(-8)}</p>
              <p><strong>Customer Name:</strong> {order.customerName || order.customerEmail}</p>
              <p><strong>Email:</strong> {order.customerEmail || 'N/A'}</p>
              <p><strong>Phone:</strong> {order.phoneNumber || 'N/A'}</p>
              <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
              <p><strong>Status:</strong> <span style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', background: getStatusColor(order.status) }}>{order.status}</span></p>
            </div>
            <div>
              <p><strong>Payment:</strong> {order.paymentStatus || 'Pending'} ({order.paymentMethod || 'N/A'})</p>
              <p><strong>Invoice:</strong> {order.invoiceNumber || 'Not created'}</p>
              {order.invoiceDate && <p><strong>Invoice Date:</strong> {new Date(order.invoiceDate).toLocaleDateString()}</p>}
              <p><strong>Inventory Notified:</strong> {order.inventoryNotified ? 'Yes' : 'No'}</p>
            </div>
          </div>
          <h4 style={{ margin: '0 0 0.5rem' }}>Items</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <tbody>
              {order.items?.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{item.name}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>x{item.quantity}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan="2" style={{ padding: '0.5rem', fontWeight: 700 }}>Total</td>
                <td style={{ padding: '0.5rem', fontWeight: 700, textAlign: 'right', color: '#C5A059' }}>{formatCurrency(order.totalAmount || order.total || 0)}</td>
              </tr>
            </tbody>
          </table>
          <p><strong>Collection:</strong> Shop Collection</p>
          {order.paymentReceipt && <p><strong>Payment Receipt:</strong> <a href={order.paymentReceipt} target="_blank" rel="noreferrer" style={{ color: '#C5A059', fontWeight: 600 }}>View Receipt</a></p>}
          {order.orderNotes && <p><strong>Notes:</strong> {order.orderNotes}</p>}
        </div>
      </div>
    </div>
  );
}

// Invoice Preview Modal
function InvoiceModal({ order, onClose }) {
  if (!order) return null;

  const subtotal = getInvoiceSubtotal(order);
  const tax = Number(order.tax || 0);
  const total = Number(order.total ?? subtotal + tax);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'white', padding: '2rem', borderRadius: '28px',
        maxWidth: '700px', width: '90%', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#C5A059', fontFamily: "'Playfair Display', serif" }}>Invoice Preview</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>
        <p><strong>Invoice #:</strong> {order.invoiceNumber}</p>
        <p><strong>Order #:</strong> {order.orderNumber}</p>
        <p><strong>Customer:</strong> {order.customerName}</p>
        <p><strong>Invoice Date:</strong> {order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString() : '-'}</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '1rem 0', background: '#fafafa', borderRadius: '16px' }}>
          <tbody>
            {order.items?.map((item, idx) => (
              <tr key={idx}>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{item.name}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>x{item.quantity}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', textAlign: 'right' }}>{formatCurrency(item.price * item.quantity)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan="2" style={{ padding: '0.5rem', fontWeight: 700 }}>Total</td>
              <td style={{ padding: '0.5rem', fontWeight: 700, textAlign: 'right', color: '#C5A059' }}>{formatCurrency(total)}</td>
            </tr>
          </tbody>
        </table>
        <p><strong>You can now collect from Saranya Jewellers our store.</strong></p>
        <p>Bring your Order Number <strong>{order.orderNumber}</strong> at collection.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button onClick={() => downloadInvoicePdf(order)} style={{ background: '#D4AF37', color: '#2E241F', border: 'none', padding: '0.75rem 1.2rem', borderRadius: '28px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
            Download PDF
          </button>
          <button onClick={onClose} style={{ background: '#AA7A5C', color: '#fff', border: 'none', padding: '0.75rem 1.2rem', borderRadius: '28px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Create Manual Order Modal with phone validation
function CreateOrderModal({ onClose, onOrderCreated, products }) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    phoneNumber: '',
    paymentMethod: '',
    orderNotes: '',
    tax: 0,
    items: [{ productId: '', name: '', price: 0, quantity: 1, isCustom: false }]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isValidPhone = (phone) => /^\d{10}$/.test(phone);

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', name: '', price: 0, quantity: 1, isCustom: false }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
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

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const subtotal = calculateSubtotal();
  const total = subtotal + Number(formData.tax);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.customerName || !formData.customerEmail || !formData.phoneNumber) {
      setError('Please fill in all customer details');
      return;
    }

    if (!isValidPhone(formData.phoneNumber)) {
      setError('Phone number must be exactly 10 digits (numbers only)');
      return;
    }

    const validItems = formData.items.filter(item => item.name && item.price > 0 && item.quantity > 0);
    if (validItems.length === 0) {
      setError('Please add at least one valid item');
      return;
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
          quantity: Number(item.quantity)
        }))
      };

      const response = await authManager.apiRequest('/api/orders/custom', {
        method: 'POST',
        body: JSON.stringify(payload)
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

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto'
    }}>
      <div style={{
        background: 'white', padding: '2rem', borderRadius: '28px',
        maxWidth: '800px', width: '90%', margin: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", color: '#2E241F' }}>Create Manual Order</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', borderRadius: '16px', marginBottom: '1rem', background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.9rem' }}>Customer Name *</label>
              <input type="text" value={formData.customerName} onChange={e => setFormData(prev => ({ ...prev, customerName: e.target.value }))} required style={{ width: '100%', padding: '0.6rem', border: '1px solid #EAD7C4', borderRadius: '20px', fontSize: '0.9rem', background: '#FEFCF8' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.9rem' }}>Customer Email *</label>
              <input type="email" value={formData.customerEmail} onChange={e => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))} required style={{ width: '100%', padding: '0.6rem', border: '1px solid #EAD7C4', borderRadius: '20px', fontSize: '0.9rem', background: '#FEFCF8' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.9rem' }}>Phone Number * (10 digits)</label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={e => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                required
                maxLength="10"
                inputMode="numeric"
                pattern="\d{10}"
                title="Please enter exactly 10 digits"
                style={{ width: '100%', padding: '0.6rem', border: '1px solid #EAD7C4', borderRadius: '20px', fontSize: '0.9rem', background: '#FEFCF8' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.9rem' }}>Payment Method</label>
              <select value={formData.paymentMethod} onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))} style={{ width: '100%', padding: '0.6rem', border: '1px solid #EAD7C4', borderRadius: '20px', fontSize: '0.9rem', background: '#FEFCF8' }}>
                <option value="">Select Payment Method</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F0E2D2', paddingTop: '1rem' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>Order Items</h4>
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
              {formData.items.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 1fr 1fr auto', gap: '0.5rem', padding: '0.8rem', background: '#FDF9F2', borderRadius: '20px', border: '1px solid #F0E2D2', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', fontWeight: 600, fontSize: '0.8rem' }}>Product</label>
                    <select value={item.productId || ''} onChange={e => handleProductSelect(idx, e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #EAD7C4', borderRadius: '16px', fontSize: '0.75rem', background: '#FEFCF8' }}>
                      <option value="">-- Select Product / Custom --</option>
                      {products.map(p => (
                        <option key={p._id} value={p._id}>{p.name} (Stock: {p.stockQuantity || 0}) - {formatCurrency(p.price || 0)}</option>
                      ))}
                      <option value="custom">-- Custom Item --</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', fontWeight: 600, fontSize: '0.8rem' }}>Item Name</label>
                    <input type="text" value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} placeholder="Name" style={{ width: '100%', padding: '0.4rem', border: '1px solid #EAD7C4', borderRadius: '16px', fontSize: '0.75rem', background: '#FEFCF8' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', fontWeight: 600, fontSize: '0.8rem' }}>Qty</label>
                    <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} min="1" style={{ width: '100%', padding: '0.4rem', border: '1px solid #EAD7C4', borderRadius: '16px', fontSize: '0.75rem', background: '#FEFCF8' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', fontWeight: 600, fontSize: '0.8rem' }}>Price (LKR)</label>
                    <input type="number" value={item.price} onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)} step="0.01" min="0" style={{ width: '100%', padding: '0.4rem', border: '1px solid #EAD7C4', borderRadius: '16px', fontSize: '0.75rem', background: '#FEFCF8' }} />
                  </div>
                  <button type="button" onClick={() => removeItem(idx)} disabled={formData.items.length === 1} style={{ background: '#AA7A5C', color: 'white', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '20px', cursor: formData.items.length === 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', height: '30px', display: 'flex', alignItems: 'center' }}>Remove</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} style={{ background: '#D4AF37', color: '#2E241F', padding: '0.5rem 1rem', border: 'none', borderRadius: '40px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>+ Add Item</button>
          </div>

          <div style={{ borderTop: '1px solid #F0E2D2', paddingTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.9rem' }}>Subtotal (LKR)</label>
                <input type="number" value={subtotal.toFixed(2)} readOnly style={{ width: '100%', padding: '0.6rem', border: '1px solid #EAD7C4', borderRadius: '20px', background: '#F9F5EF' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.9rem' }}>Tax (LKR)</label>
                <input type="number" value={formData.tax} onChange={e => setFormData(prev => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))} step="0.01" style={{ width: '100%', padding: '0.6rem', border: '1px solid #EAD7C4', borderRadius: '20px', background: '#FEFCF8' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.9rem' }}>Total (LKR)</label>
                <input type="number" value={total.toFixed(2)} readOnly style={{ width: '100%', padding: '0.6rem', border: '1px solid #EAD7C4', borderRadius: '20px', background: '#F9F5EF', color: '#C5A059', fontWeight: 600 }} />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.9rem' }}>Order Notes</label>
            <textarea value={formData.orderNotes} onChange={e => setFormData(prev => ({ ...prev, orderNotes: e.target.value }))} placeholder="Add any special notes for this order..." style={{ width: '100%', padding: '0.6rem', border: '1px solid #EAD7C4', borderRadius: '20px', fontSize: '0.9rem', resize: 'vertical', height: '60px', background: '#FEFCF8' }} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid #F0E2D2', paddingTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ background: '#AA7A5C', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '40px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ background: '#D4AF37', color: '#2E241F', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '40px', cursor: 'pointer', fontWeight: 600 }}>{isSubmitting ? 'Creating...' : 'Create Order'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrderManagementDashboardPage() {
  const [staffUser, setStaffUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const stats = useMemo(() => {
    const pending = orders.filter(o => o.status === 'Pending').length;
    const confirmed = orders.filter(o => o.status === 'Confirmed').length;
    const invoiced = orders.filter(o => o.status === 'Invoice Created').length;
    const completed = orders.filter(o => ['Completed', 'Ready for Collection'].includes(o.status)).length;
    const revenue = orders.filter(o => !['Cancelled', 'Refunded'].includes(o.status)).reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0);
    return { pending, confirmed, invoiced, completed, revenue };
  }, [orders]);

  // Apply both status filter and search term
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // Search filter (order number, customer name, customer email, phone number)
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(order => 
        (order.orderNumber || '').toLowerCase().includes(term) ||
        (order._id || '').slice(-8).toLowerCase().includes(term) ||
        (order.customerName || '').toLowerCase().includes(term) ||
        (order.customerEmail || '').toLowerCase().includes(term) ||
        (order.phoneNumber || '').toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [orders, statusFilter, searchTerm]);

  const invoicesList = useMemo(() => {
    let filtered = orders.filter(o => o.invoiceNumber);
    
    // Apply search filter to invoices too
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(order => 
        (order.invoiceNumber || '').toLowerCase().includes(term) ||
        (order.orderNumber || '').toLowerCase().includes(term) ||
        (order._id || '').slice(-8).toLowerCase().includes(term) ||
        (order.customerName || '').toLowerCase().includes(term) ||
        (order.customerEmail || '').toLowerCase().includes(term) ||
        (order.phoneNumber || '').toLowerCase().includes(term)
      );
    }
    
    return filtered.sort((a, b) => new Date(b.invoiceDate || b.updatedAt || b.createdAt) - new Date(a.invoiceDate || a.updatedAt || a.createdAt));
  }, [orders, searchTerm]);

  // Calculate weekly revenue (last 7 days) from orders
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
        .filter(order => {
          if (!order.createdAt) return false;
          const orderDate = new Date(order.createdAt);
          return orderDate >= date && orderDate < nextDate;
        })
        .reduce((sum, order) => sum + (order.total || order.totalAmount || 0), 0);
      
      result.push({
        label: days[date.getDay()],
        value: dayRevenue
      });
    }
    return result;
  }, [orders]);

  // Initialize or update chart when weeklyRevenueData changes
  useEffect(() => {
    if (!window.Chart) return;
    
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const labels = weeklyRevenueData.map(d => d.label);
    const dataValues = weeklyRevenueData.map(d => d.value / 1000); // Convert to K
    
    chartInstance.current = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Revenue (LKR K)',
          data: dataValues,
          backgroundColor: '#D4AF37',
          borderRadius: 12,
          barPercentage: 0.65,
          categoryPercentage: 0.8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const rawValue = weeklyRevenueData[ctx.dataIndex].value;
                return `Rs ${rawValue.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          y: {
            grid: { color: '#F3E9DE' },
            ticks: {
              callback: (val) => 'Rs ' + val + 'K'
            }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }, [weeklyRevenueData]);

  useEffect(() => {
    document.title = 'Order Management Dashboard - Saranya Jewellery';
    
    // Load Chart.js if not already loaded
    if (!window.Chart) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.onload = () => {
        // Chart will be drawn by the useEffect above when weeklyRevenueData is ready
      };
      document.head.appendChild(script);
    }
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const me = await authManager.checkStaffAuth('Order Management');
      if (!me || me.needsApproval) return;
      setStaffUser(me);
      await Promise.all([loadOrders(), loadProducts()]);
    }
    bootstrap();
  }, []);

  async function loadProducts() {
    try {
      const response = await authManager.apiRequest('/api/products');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load products');
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    }
  }

  async function loadOrders() {
    setError('');
    try {
      const response = await authManager.apiRequest('/api/orders');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load orders');
      setOrders([]);
    }
  }

  async function patchOrder(orderId, endpoint, body = null) {
    setBusyId(orderId);
    setError('');
    setSuccessMsg('');
    try {
      const response = await authManager.apiRequest(endpoint, {
        method: 'PATCH',
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update order');
      setSuccessMsg(data.message || 'Order updated successfully');
      await loadOrders();
    } catch (patchError) {
      setError(patchError.message || 'Failed to update order');
    } finally {
      setBusyId('');
    }
  }

  const markPaymentReceived = (order) => patchOrder(order._id, `/api/orders/${order._id}/payment-received`);
  const markPaymentNotReceived = (order) => {
    if (window.confirm('Payment not received. Cancel this order?')) {
      patchOrder(order._id, `/api/orders/${order._id}/payment-not-received`);
    }
  };
  const createInvoice = (order) => patchOrder(order._id, `/api/orders/${order._id}/invoice`);
  const confirmOrder = (order) => patchOrder(order._id, `/api/orders/${order._id}/confirm`);
  const readyForCollection = (order) => patchOrder(order._id, `/api/orders/${order._id}/status`, { status: 'Ready for Collection' });
  const completeOrder = (order) => patchOrder(order._id, `/api/orders/${order._id}/status`, { status: 'Completed' });
  const refundOrder = (order) => {
    if (window.confirm('Refund this order? Stock will be restored.')) {
      patchOrder(order._id, `/api/orders/${order._id}/status`, { status: 'Refunded' });
    }
  };

  const getStatusColor = (status) => STATUS_COLORS[status] || '#e9ecef';

  const getActionButtons = (order) => {
    const busy = busyId === order._id;
    const btns = [];

    btns.push(<button key="view" className="action-btn" style={{ background: '#AA7A5C', color: 'white' }} onClick={() => setSelectedOrder(order)} disabled={busy}>View</button>);

    if (order.invoiceNumber) {
      btns.push(<button key="invoice" className="action-btn" style={{ background: '#C5A059', color: 'white' }} onClick={() => setInvoiceOrder(order)} disabled={busy}>View Invoice</button>);
    }

    if (order.status === 'Pending') {
      btns.push(<button key="markPaid" className="action-btn" style={{ background: '#4D6A3B', color: 'white' }} onClick={() => markPaymentReceived(order)} disabled={busy}>Payment Received</button>);
      btns.push(<button key="markUnpaid" className="action-btn" style={{ background: '#AA5C3B', color: 'white' }} onClick={() => markPaymentNotReceived(order)} disabled={busy}>Cancel Payment</button>);
    }
    else if (order.status === 'Payment Received') {
      btns.push(<button key="createInvoice" className="action-btn" style={{ background: '#C5A059', color: 'white' }} onClick={() => createInvoice(order)} disabled={busy}>Create Invoice</button>);
    }
    else if (order.status === 'Invoice Created') {
      btns.push(<button key="confirmOrder" className="action-btn" style={{ background: '#4D6A3B', color: 'white' }} onClick={() => confirmOrder(order)} disabled={busy}>Confirm Order</button>);
    }
    else if (order.status === 'Confirmed') {
      btns.push(<button key="readyForCollection" className="action-btn" style={{ background: '#D4AF37', color: '#2E241F' }} onClick={() => readyForCollection(order)} disabled={busy}>Ready for Collection</button>);
    }
    else if (order.status === 'Ready for Collection') {
      btns.push(<button key="completeOrder" className="action-btn" style={{ background: '#4D6A3B', color: 'white' }} onClick={() => completeOrder(order)} disabled={busy}>Complete Order</button>);
    }
    else if (order.status === 'Completed') {
      btns.push(<button key="refundOrder" className="action-btn" style={{ background: '#AA5C3B', color: 'white' }} onClick={() => refundOrder(order)} disabled={busy}>Refund Order</button>);
    }

    if (['Invoice Created', 'Confirmed', 'Ready for Collection'].includes(order.status)) {
      btns.push(<button key="refund" className="action-btn" style={{ background: '#AA5C3B', color: 'white' }} onClick={() => refundOrder(order)} disabled={busy}>Refund Order</button>);
    }

    return btns;
  };

  if (!staffUser) return <div style={{ padding: '2rem', textAlign: 'center', background: '#FDF9F2', minHeight: '100vh' }}>Checking order management access...</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FDF9F2', fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar - Redesigned to match Admin Dashboard */}
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
          <h2 style={{
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
            <FiHome size={28} />
            Order Management
          </h2>
        </div>

        {/* Navigation Items */}
        <nav style={{
          flex: 1,
          padding: '1.5rem 1rem',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { key: 'dashboard', icon: FiHome, label: 'Dashboard' },
              { key: 'orders', icon: FiTruck, label: 'Orders' },
              { key: 'invoices', icon: FiFileText, label: 'Invoices' }
            ].map((item) => {
              const isActive = activeTab === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
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
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(224, 191, 99, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Icon size={24} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Profile & Logout */}
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
            {staffUser?.fullName?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 600,
              fontSize: '0.95rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              Hello, {staffUser?.fullName?.split(' ')[0] || 'Staff'}
            </div>
          </div>
          <button
            onClick={() => authManager.logout()}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
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
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            <FiLogOut size={20} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: '320px', padding: '1.8rem 2.2rem', background: '#FDF9F2' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <div>{/* Empty for spacing */}</div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '0.5rem 1rem', borderRadius: '60px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', border: '1px solid #F0E2D2' }}>
              <i className="fas fa-search" style={{ color: '#C5A15B' }}></i>
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', width: '180px' }}
              />
            </div>
            <div style={{ width: '42px', height: '42px', background: '#EADECF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A87B41', fontWeight: 'bold', fontSize: '1.1rem' }}>
              <i className="fas fa-user-astronaut"></i>
            </div>
          </div>
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div style={{ background: 'white', borderRadius: '28px', padding: '1.4rem 1.2rem', boxShadow: '0 8px 20px rgba(0,0,0,0.02)', border: '1px solid #F3E9DF' }}>
                <div style={{ background: '#FEF5EA', width: '48px', height: '48px', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}><i className="fas fa-hourglass-half" style={{ fontSize: '1.7rem', color: '#C5A059' }}></i></div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: '#8F7358', marginBottom: '0.5rem' }}>Pending</h3>
                <div className="stat-number" style={{ fontSize: '2rem', fontWeight: 700, color: '#2E241F' }}>{stats.pending}</div>
              </div>
              <div style={{ background: 'white', borderRadius: '28px', padding: '1.4rem 1.2rem', boxShadow: '0 8px 20px rgba(0,0,0,0.02)', border: '1px solid #F3E9DF' }}>
                <div style={{ background: '#FEF5EA', width: '48px', height: '48px', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}><i className="fas fa-check-circle" style={{ fontSize: '1.7rem', color: '#C5A059' }}></i></div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: '#8F7358', marginBottom: '0.5rem' }}>Confirmed</h3>
                <div className="stat-number" style={{ fontSize: '2rem', fontWeight: 700, color: '#2E241F' }}>{stats.confirmed}</div>
              </div>
              <div style={{ background: 'white', borderRadius: '28px', padding: '1.4rem 1.2rem', boxShadow: '0 8px 20px rgba(0,0,0,0.02)', border: '1px solid #F3E9DF' }}>
                <div style={{ background: '#FEF5EA', width: '48px', height: '48px', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}><i className="fas fa-file-invoice" style={{ fontSize: '1.7rem', color: '#C5A059' }}></i></div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: '#8F7358', marginBottom: '0.5rem' }}>Invoice Created</h3>
                <div className="stat-number" style={{ fontSize: '2rem', fontWeight: 700, color: '#2E241F' }}>{stats.invoiced}</div>
              </div>
              <div style={{ background: 'white', borderRadius: '28px', padding: '1.4rem 1.2rem', boxShadow: '0 8px 20px rgba(0,0,0,0.02)', border: '1px solid #F3E9DF' }}>
                <div style={{ background: '#FEF5EA', width: '48px', height: '48px', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}><i className="fas fa-trophy" style={{ fontSize: '1.7rem', color: '#C5A059' }}></i></div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: '#8F7358', marginBottom: '0.5rem' }}>Completed</h3>
                <div className="stat-number" style={{ fontSize: '2rem', fontWeight: 700, color: '#2E241F' }}>{stats.completed}</div>
              </div>
              <div style={{ background: 'white', borderRadius: '28px', padding: '1.4rem 1.2rem', boxShadow: '0 8px 20px rgba(0,0,0,0.02)', border: '1px solid #F3E9DF' }}>
                <div style={{ background: '#FEF5EA', width: '48px', height: '48px', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}><i className="fas fa-rupee-sign" style={{ fontSize: '1.7rem', color: '#C5A059' }}></i></div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: '#8F7358', marginBottom: '0.5rem' }}>Total Revenue</h3>
                <div className="stat-number" style={{ fontSize: '2rem', fontWeight: 700, color: '#2E241F' }}>{formatCurrency(stats.revenue)}</div>
              </div>
            </div>

            {/* Chart + Recent Orders Preview */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ flex: 1.4, background: 'white', borderRadius: '28px', padding: '1rem', border: '1px solid #F0E2D2' }}>
                <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}><i className="fas fa-chart-line" style={{ color: '#C5A059' }}></i> Weekly Revenue (LKR)</h4>
                <canvas id="revenueChart" width="400" height="180" style={{ maxHeight: '180px', width: '100%' }}></canvas>
              </div>
              <div style={{ flex: 2, background: 'white', borderRadius: '28px', padding: '1rem', border: '1px solid #F0E2D2' }}>
                <h4 style={{ marginBottom: '0.8rem' }}><i className="fas fa-clock"></i> Recent Orders</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr><th style={{ textAlign: 'left', padding: '0.8rem 1rem', color: '#A27D53' }}>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {filteredOrders.slice(0, 3).map(order => (
                        <tr key={order._id}>
                          <td style={{ padding: '0.7rem 1rem', borderTop: '1px solid #F4E9DF' }}>{order.orderNumber || order._id?.slice(-8)}</td>
                          <td style={{ padding: '0.7rem 1rem', borderTop: '1px solid #F4E9DF' }}>{order.customerName || order.customerEmail}</td>
                          <td style={{ padding: '0.7rem 1rem', borderTop: '1px solid #F4E9DF' }}>{formatCurrency(order.total || 0)}</td>
                          <td style={{ padding: '0.7rem 1rem', borderTop: '1px solid #F4E9DF' }}><span className="status" style={{ background: '#EAF6E6', color: '#4D6A3B', padding: '0.2rem 0.8rem', borderRadius: '30px', fontSize: '0.7rem' }}>{order.status}</span></td>
                        </tr>
                      ))}
                      {filteredOrders.length === 0 && <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center' }}>No orders found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </>
        )}

        {/* ORDERS TAB - removed email and phone columns, only customer name shown */}
        {activeTab === 'orders' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontWeight: 600, fontSize: '1.5rem', fontFamily: "'Playfair Display', serif", color: '#352A22' }}><i className="fas fa-truck"></i> Orders Queue</h2>
              <button className="btn-gold" onClick={() => setShowCreateModal(true)} style={{ background: '#D4AF37', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '40px', fontWeight: 600, color: '#2E241F', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}><i className="fas fa-plus-circle"></i> Create Manual Order</button>
            </div>

            {error && <div style={{ padding: '0.75rem', borderRadius: '16px', marginBottom: '1rem', background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }}>{error}</div>}
            {successMsg && <div style={{ padding: '0.75rem', borderRadius: '16px', marginBottom: '1rem', background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' }}>{successMsg}</div>}

            {/* Status Filter */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {STATUSES.map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #D4AF37',
                    background: statusFilter === status ? '#D4AF37' : 'white',
                    color: statusFilter === status ? '#2E241F' : '#A77C35',
                    cursor: 'pointer',
                    borderRadius: '40px',
                    fontWeight: 500,
                    transition: 'all 0.3s',
                    fontSize: '0.85rem'
                  }}
                >
                  {status === 'all' ? 'All' : status}
                </button>
              ))}
            </div>

            {/* Orders Table - simple columns, contact details only in View modal */}
            <div style={{ background: 'white', borderRadius: '28px', padding: '1rem 0', border: '1px solid #F0E2D2', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '1rem 1.2rem', color: '#A27D53', fontWeight: 600 }}>Order ID</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.2rem', color: '#A27D53', fontWeight: 600 }}>Customer Name</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.2rem', color: '#A27D53', fontWeight: 600 }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.2rem', color: '#A27D53', fontWeight: 600 }}>Items</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.2rem', color: '#A27D53', fontWeight: 600 }}>Amount</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.2rem', color: '#A27D53', fontWeight: 600 }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.2rem', color: '#A27D53', fontWeight: 600 }}>Payment</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.2rem', color: '#A27D53', fontWeight: 600 }}>Invoice</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.2rem', color: '#A27D53', fontWeight: 600, minWidth: '200px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No orders found</td></tr>
                  ) : (
                    filteredOrders.map(order => (
                      <tr key={order._id}>
                        <td style={{ padding: '0.9rem 1.2rem', borderTop: '1px solid #F4E9DF' }}>{order.orderNumber || order._id?.slice(-8)}</td>
                        <td style={{ padding: '0.9rem 1.2rem', borderTop: '1px solid #F4E9DF' }}>{order.customerName || 'N/A'}</td>
                        <td style={{ padding: '0.9rem 1.2rem', borderTop: '1px solid #F4E9DF' }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '0.9rem 1.2rem', borderTop: '1px solid #F4E9DF' }}>{order.items?.length || 0} items</td>
                        <td style={{ padding: '0.9rem 1.2rem', borderTop: '1px solid #F4E9DF', fontWeight: 600 }}>{formatCurrency(order.totalAmount || order.total || 0)}</td>
                        <td style={{ padding: '0.9rem 1.2rem', borderTop: '1px solid #F4E9DF' }}>
                          <span style={{ padding: '0.2rem 0.8rem', borderRadius: '30px', fontSize: '0.7rem', background: getStatusColor(order.status), color: '#2E241F' }}>{order.status}</span>
                        </td>
                        <td style={{ padding: '0.9rem 1.2rem', borderTop: '1px solid #F4E9DF' }}>
                          <span style={{ fontSize: '0.85rem', color: order.paymentStatus === 'Paid' ? '#4D6A3B' : order.paymentStatus === 'Refunded' ? '#AA5C3B' : '#8F7358' }}>{order.paymentStatus || 'Pending'}</span>
                        </td>
                        <td style={{ padding: '0.9rem 1.2rem', borderTop: '1px solid #F4E9DF', fontSize: '0.85rem' }}>{order.invoiceNumber || '-'}</td>
                        <td style={{ padding: '0.9rem 1.2rem', borderTop: '1px solid #F4E9DF' }}>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>{getActionButtons(order)}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* INVOICES TAB */}
        {activeTab === 'invoices' && (
          <div style={{ background: 'white', borderRadius: '28px', padding: '1rem 0', border: '1px solid #F0E2D2', overflowX: 'auto' }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", margin: '0 0 1rem 1.2rem', color: '#352A22' }}>Created Invoices</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.9rem 1.2rem', color: '#A27D53' }}>Invoice No</th>
                  <th>Order No</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoicesList.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '1.5rem', textAlign: 'center', color: '#999' }}>No invoices found</td></tr>
                ) : (
                  invoicesList.map(order => (
                    <tr key={order._id}>
                      <td style={{ padding: '0.8rem 1.2rem', borderTop: '1px solid #F4E9DF' }}>{order.invoiceNumber}</td>
                      <td style={{ padding: '0.8rem 1.2rem', borderTop: '1px solid #F4E9DF' }}>{order.orderNumber || order._id?.slice(-8)}</td>
                      <td style={{ padding: '0.8rem 1.2rem', borderTop: '1px solid #F4E9DF' }}>{order.customerName || order.customerEmail || 'N/A'}</td>
                      <td style={{ padding: '0.8rem 1.2rem', borderTop: '1px solid #F4E9DF' }}>{new Date(order.invoiceDate || order.updatedAt || order.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '0.8rem 1.2rem', borderTop: '1px solid #F4E9DF', fontWeight: 600 }}>{formatCurrency(order.totalAmount || order.total || 0)}</td>
                      <td style={{ padding: '0.8rem 1.2rem', borderTop: '1px solid #F4E9DF' }}>
                        <button className="action-btn" style={{ background: '#C5A059', color: 'white', padding: '0.4rem 0.8rem', border: 'none', borderRadius: '40px', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => setInvoiceOrder(order)}>View Invoice</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <footer style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.7rem', color: '#C7B29A', paddingTop: '1rem' }}>
          © Saranya Jewellery — handcrafted excellence | order management studio
        </footer>
      </main>

      {/* Modals */}
      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} getStatusColor={getStatusColor} />}
      {invoiceOrder && <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}
      {showCreateModal && <CreateOrderModal onClose={() => setShowCreateModal(false)} onOrderCreated={() => { loadOrders(); setShowCreateModal(false); }} products={products} />}

      <style>{`
        .action-btn { padding: 0.4rem 0.8rem; border: none; border-radius: 40px; cursor: pointer; font-size: 0.75rem; font-weight: 600; margin: 0.2rem; white-space: nowrap; transition: 0.2s; }
        .action-btn:hover { opacity: 0.85; transform: scale(0.97); }
        .btn-gold:hover { background: #C09C2E; transform: scale(0.98); }
        .status { display: inline-block; }
      `}</style>
    </div>
  );
}