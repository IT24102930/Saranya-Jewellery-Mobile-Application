import { useEffect, useMemo, useState } from 'react';
import authManager from '../auth.js';
import { FiBox, FiTrendingUp, FiTruck, FiLogOut, FiAlertTriangle } from 'react-icons/fi';

const emptyStock = {
  name: '',
  category: 'Ring',
  karat: '22K',
  weight: '',
  quantity: '',
  supplier: ''
};

const emptySupplier = {
  name: '',
  contact: '',
  email: '',
  location: '',
  itemsSupplied: ''
};

export default function InventoryDashboardPage() {
  const [staffUser, setStaffUser] = useState(null);
  const [activeTab, setActiveTab] = useState('stock'); // 'stock', 'rates', 'suppliers', 'alerts'
  
  // Stock state
  const [stockRows, setStockRows] = useState([]);
  const [stockForm, setStockForm] = useState(emptyStock);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  
  // Rates state
  const [goldRates, setGoldRates] = useState({ '18K': 0, '22K': 0, '24K': 0 });
  const [rateData, setRateData] = useState(null);
  const [isSavingRates, setIsSavingRates] = useState(false);
  
  // Suppliers state
  const [suppliers, setSuppliers] = useState([]);
  const [supplierForm, setSupplierForm] = useState(emptySupplier);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const [error, setError] = useState('');

  // Modal states
  const [showStockModal, setShowStockModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showRatesModal, setShowRatesModal] = useState(false);

  const totalUnits = useMemo(
    () => stockRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
    [stockRows]
  );

  const supplierOptions = useMemo(
    () => [...suppliers].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [suppliers]
  );

  const lowStockAlerts = useMemo(
    () => stockRows
      .filter(item => Number(item.quantity) < 5)
      .sort((a, b) => Number(a.quantity) - Number(b.quantity)),
    [stockRows]
  );

  useEffect(() => {
    document.title = 'Inventory Dashboard - Saranya Jewellery';
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const me = await authManager.checkStaffAuth('Inventory');
      if (!me || me.needsApproval) return;
      setStaffUser(me);
      await Promise.all([loadStock(), loadRates(), loadSuppliers()]);
    }
    bootstrap();
  }, []);

  // ============ STOCK FUNCTIONS ============
  async function loadStock() {
    try {
      const response = await authManager.apiRequest('/api/inventory/stock');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load stock');
      setStockRows(Array.isArray(data.data) ? data.data : []);
    } catch (loadError) {
      console.error('Error loading stock:', loadError);
    }
  }

  async function saveStock(event) {
    event.preventDefault();
    setError('');

    const parsedWeight = Number(stockForm.weight);
    const parsedQuantity = Number(stockForm.quantity);

    if (!Number.isFinite(parsedWeight) || parsedWeight < 0) {
      setError('Weight cannot be negative');
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      setError('Quantity cannot be negative');
      return;
    }

    setIsSavingStock(true);
    try {
      const payload = {
        ...stockForm,
        weight: parsedWeight,
        quantity: parsedQuantity
      };
      const endpoint = editingStock ? `/api/inventory/stock/${editingStock._id}` : '/api/inventory/stock';
      const method = editingStock ? 'PUT' : 'POST';

      const response = await authManager.apiRequest(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.details || data.message || 'Failed to add stock item');
      }
      setStockForm(emptyStock);
      setEditingStock(null);
      setShowStockModal(false);
      await loadStock();
    } catch (saveError) {
      setError(saveError.message || (editingStock ? 'Failed to update stock item' : 'Failed to add stock item'));
    } finally {
      setIsSavingStock(false);
    }
  }

  function startEditStock(stockItem) {
    setEditingStock(stockItem);
    setError('');
    setStockForm({
      name: stockItem.name || '',
      category: stockItem.category || 'Ring',
      karat: stockItem.karat || '22K',
      weight: String(stockItem.weight ?? ''),
      quantity: String(stockItem.quantity ?? ''),
      supplier: stockItem.supplierId || ''
    });
    setShowStockModal(true);
  }

  function cancelEditStock() {
    setEditingStock(null);
    setStockForm(emptyStock);
    setError('');
    setShowStockModal(false);
  }

  async function deleteStock(stockId) {
    if (!window.confirm('Delete this stock item?')) return;
    setError('');
    try {
      const response = await authManager.apiRequest(`/api/inventory/stock/${stockId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete stock item');
      }
      await loadStock();
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete stock item');
    }
  }

  // ============ RATES FUNCTIONS ============
  async function loadRates() {
    try {
      const response = await authManager.apiRequest('/api/inventory/gold-rates');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load rates');
      setGoldRates({ '18K': data['18K'] || 0, '22K': data['22K'] || 0, '24K': data['24K'] || 0 });
      setRateData(data);
    } catch (err) {
      console.error('Error loading rates:', err);
    }
  }

  async function saveRates(event) {
    event.preventDefault();
    setError('');

    const normalizedRates = {
      '18K': Number(goldRates['18K']),
      '22K': Number(goldRates['22K']),
      '24K': Number(goldRates['24K'])
    };

    const hasNegativeRate = Object.values(normalizedRates).some(
      (rate) => !Number.isFinite(rate) || rate < 0
    );

    if (hasNegativeRate) {
      setError('Gold rates cannot be negative');
      return;
    }

    setIsSavingRates(true);
    try {
      const response = await authManager.apiRequest('/api/inventory/gold-rates', {
        method: 'POST',
        body: JSON.stringify(normalizedRates)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update rates');
      setShowRatesModal(false);
      await loadRates();
    } catch (saveError) {
      setError(saveError.message || 'Failed to update rates');
    } finally {
      setIsSavingRates(false);
    }
  }

  // ============ SUPPLIERS FUNCTIONS ============
  async function loadSuppliers() {
    try {
      const response = await authManager.apiRequest('/api/inventory/suppliers');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load suppliers');

      const supplierRows = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.suppliers)
            ? data.suppliers
            : [];

      setSuppliers(supplierRows);
    } catch (err) {
      setError(err.message || 'Failed to load suppliers');
      setSuppliers([]);
    }
  }

  async function saveSupplier(event) {
    event.preventDefault();
    setError('');

    const normalizedName = supplierForm.name.trim();
    const normalizedContact = String(supplierForm.contact || '').replace(/\D/g, '');
    const duplicateSupplier = suppliers.find(
      (supplier) =>
        supplier.name?.trim().toLowerCase() === normalizedName.toLowerCase() &&
        supplier._id !== editingSupplier?._id
    );

    if (!/^\d{10}$/.test(normalizedContact)) {
      setError('Contact number must be exactly 10 digits');
      return;
    }

    if (duplicateSupplier) {
      setError('Supplier name already exists');
      return;
    }

    setIsSavingSupplier(true);
    try {
      const method = editingSupplier ? 'PATCH' : 'POST';
      const endpoint = editingSupplier 
        ? `/api/suppliers/${editingSupplier._id}`
        : '/api/suppliers';

      const payload = {
        ...supplierForm,
        name: normalizedName,
        contact: normalizedContact
      };

      const response = await authManager.apiRequest(endpoint, {
        method,
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to save supplier');
      
      setSupplierForm(emptySupplier);
      setEditingSupplier(null);
      setShowSupplierModal(false);
      await loadSuppliers();
    } catch (err) {
      setError(err.message || 'Failed to save supplier');
    } finally {
      setIsSavingSupplier(false);
    }
  }

  function startEditSupplier(supplier) {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email || '',
      location: supplier.location || '',
      itemsSupplied: supplier.itemsSupplied || ''
    });
    setShowSupplierModal(true);
  }

  function addStockForSupplier(supplier) {
    setStockForm({
      name: '',
      category: 'Ring',
      karat: '22K',
      weight: '',
      quantity: '',
      supplier: supplier._id
    });
    setEditingStock(null);
    setShowStockModal(true);
  }

  async function deleteSupplier(supplierId) {
    if (!window.confirm('Delete this supplier?')) return;
    
    try {
      setError('');
      const response = await authManager.apiRequest(`/api/suppliers/${supplierId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete supplier');
      await loadSuppliers();
    } catch (err) {
      setError(err.message || 'Failed to delete supplier');
    }
  }

  function calculatePercentageChange(current, previous) {
    if (!previous || previous === 0) return { percentage: 0, isPositive: false };
    const change = ((current - previous) / previous) * 100;
    return { percentage: change.toFixed(2), isPositive: change >= 0 };
  }

  function formatLastUpdate(date) {
    if (!date) return 'Not updated yet';
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) {
      return `Today at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  if (!staffUser) return <p style={{ padding: '1rem' }}>Checking inventory access...</p>;

  if (!staffUser) return <p style={{ padding: '1rem' }}>Checking inventory access...</p>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fafbfc', position: 'relative' }}>
      <style>
        {`
          @media (min-width: 768px) {
            .modal-content {
              width: 70% !important;
            }
          }
          @media (min-width: 1024px) {
            .modal-content {
              width: auto !important;
              maxWidth: 500px !important;
            }
          }
        `}
      </style>

      {/* Main Content */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        padding: '2rem 1rem 5rem'
      }}>
        {error && (
          <div style={{
            background: '#fee',
            border: '1px solid #fcc',
          color: '#c33',
          padding: '0.75rem 1rem',
          borderRadius: 8,
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {/* ALERTS TAB */}
      {activeTab === 'alerts' && (
        <div>
          <section style={{ background: '#fafbfc', border: '1px solid #eee', borderRadius: 12, padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
              <FiAlertTriangle size={28} style={{ color: '#d32f2f' }} />
              <div>
                <h3 style={{ margin: 0, color: '#6f0022', fontSize: '1.2rem' }}>Stock Alerts</h3>
                <p style={{ margin: '0.3rem 0 0', color: '#666', fontSize: '0.9rem' }}>Items with less than 5 units in stock</p>
              </div>
            </div>

            {lowStockAlerts.length === 0 ? (
              <div style={{
                background: '#e8f5e9',
                border: '1px solid #4caf50',
                borderRadius: 8,
                padding: '2rem',
                textAlign: 'center'
              }}>
                <p style={{ color: '#2e7d32', fontSize: '1rem', fontWeight: '500' }}>
                  All stock levels are healthy!
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.8rem' }}>
                {lowStockAlerts.map((item) => (
                  <div key={item._id} style={{
                    background: Number(item.quantity) === 0 ? '#ffebee' : '#fff3e0',
                    border: `2px solid ${Number(item.quantity) === 0 ? '#d32f2f' : '#ff9800'}`,
                    borderRadius: 8,
                    padding: '1rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.3rem', color: '#6f0022', fontSize: '1rem', fontWeight: '600' }}>
                          {item.name}
                        </h4>
                        <p style={{ margin: '0.2rem 0', color: '#666', fontSize: '0.9rem' }}>
                          Category: <strong>{item.category}</strong>
                        </p>
                        <p style={{ margin: '0.2rem 0', color: '#666', fontSize: '0.9rem' }}>
                          Karat: <strong>{item.karat}</strong>
                        </p>
                        <p style={{ margin: '0.2rem 0', color: '#666', fontSize: '0.9rem' }}>
                          Weight: <strong>{item.weight}g</strong>
                        </p>
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '0.5rem'
                      }}>
                        <div style={{
                          padding: '0.5rem 0.8rem',
                          background: Number(item.quantity) === 0 ? '#d32f2f' : '#ff9800',
                          color: '#fff',
                          borderRadius: 6,
                          fontSize: '0.9rem',
                          fontWeight: '700'
                        }}>
                          {Number(item.quantity) === 0 ? 'OUT OF STOCK' : `${item.quantity} units left`}
                        </div>
                        {item.supplier && (
                          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>
                            Supplier: <strong>{item.supplier}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => startEditStock(item)}
                      style={{
                        padding: '0.6rem 1.2rem',
                        background: '#6f0022',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: 'Poppins, sans-serif',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#5a001a'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#6f0022'}
                    >
                      Update Stock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick Update Form */}
          {editingStock && (
            <section style={{ background: '#e3f2fd', border: '2px solid #2196f3', borderRadius: 12, padding: '1.5rem', marginTop: '1.5rem' }}>
              <h3 style={{ marginTop: 0, color: '#1565c0', fontSize: '1.1rem' }}>
                Update Stock: {editingStock.name}
              </h3>
              <form onSubmit={saveStock} style={{ display: 'grid', gap: '0.8rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', color: '#333', fontSize: '0.85rem', fontWeight: '600' }}>
                      Current Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="Quantity"
                      value={stockForm.quantity}
                      onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                      style={{
                        padding: '0.6rem',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        fontSize: '0.94rem',
                        fontFamily: 'Poppins, sans-serif',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', color: '#333', fontSize: '0.85rem', fontWeight: '600' }}>
                      New Arrival Quantity (add to current)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Add quantity"
                      defaultValue="0"
                      onChange={(e) => {
                        const newQty = Number(stockForm.quantity) + Number(e.target.value);
                        if (e.target.value) {
                          setStockForm({ ...stockForm, quantity: String(newQty) });
                        }
                      }}
                      style={{
                        padding: '0.6rem',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        fontSize: '0.94rem',
                        fontFamily: 'Poppins, sans-serif',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={isSavingStock}
                    style={{
                      flex: 1,
                      padding: '0.7rem 1.2rem',
                      background: '#6f0022',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      cursor: isSavingStock ? 'not-allowed' : 'pointer',
                      fontFamily: 'Poppins, sans-serif',
                      opacity: isSavingStock ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isSavingStock ? 'Updating...' : 'Confirm Update'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditStock}
                    style={{
                      padding: '0.7rem 1.2rem',
                      background: '#fff',
                      color: '#666',
                      border: '1px solid #ddd',
                      borderRadius: 8,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      )}

      {/* STOCK TAB */}
      {activeTab === 'stock' && (
        <div>
          {/* Stats */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#fafbfc', border: '1px solid #eee', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Stock Entries</p>
              <h2 style={{ margin: '0.5rem 0 0', color: '#6f0022', fontSize: '1.8rem' }}>{stockRows.length}</h2>
            </div>
            <div style={{ background: '#fafbfc', border: '1px solid #eee', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Total Units</p>
              <h2 style={{ margin: '0.5rem 0 0', color: '#6f0022', fontSize: '1.8rem' }}>{totalUnits}</h2>
            </div>
            <div style={{ background: '#fafbfc', border: '1px solid #eee', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Suppliers</p>
              <h2 style={{ margin: '0.5rem 0 0', color: '#6f0022', fontSize: '1.8rem' }}>{suppliers.length}</h2>
            </div>
          </section>

          {/* Gold Rate Display */}
          <section style={{ background: 'linear-gradient(135deg, #e0bf63 0%, #d4af37 100%)', border: '2px solid #b8860b', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ margin: '0 0 0.5rem', color: '#3d2b00', fontSize: '0.95rem', fontWeight: '600', letterSpacing: '0.5px' }}>TODAY'S 22K GOLD RATE</p>
              <h2 style={{ margin: 0, color: '#3d2b00', fontSize: '2rem', fontWeight: '700' }}>Rs. {goldRates['22K'] ? goldRates['22K'].toLocaleString('en-IN') : 'N/A'} <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>per gram</span></h2>
            </div>
          </section>

          <section style={{ background: '#fafbfc', border: '1px solid #eee', borderRadius: 12, padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0, color: '#6f0022', fontSize: '1.1rem' }}>Stock Inventory</h3>
              <button
                onClick={() => {
                  setEditingStock(null);
                  setStockForm(emptyStock);
                  setError('');
                  setShowStockModal(true);
                }}
                style={{
                  padding: '0.6rem 1.2rem',
                  background: '#6f0022',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                Add Stock Item
              </button>
            </div>
            {stockRows.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>No stock items yet</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#6f0022', borderBottom: '2px solid #e0bf63' }}>
                      <th style={{ textAlign: 'left', padding: '0.8rem', fontWeight: '700', color: '#fff', fontSize: '0.78rem', letterSpacing: '0.06em' }}>SKU</th>
                      <th style={{ textAlign: 'left', padding: '0.8rem', fontWeight: '700', color: '#fff', fontSize: '0.78rem', letterSpacing: '0.06em' }}>NAME</th>
                      <th style={{ textAlign: 'left', padding: '0.8rem', fontWeight: '700', color: '#fff', fontSize: '0.78rem', letterSpacing: '0.06em' }}>CATEGORY</th>
                      <th style={{ textAlign: 'left', padding: '0.8rem', fontWeight: '700', color: '#fff', fontSize: '0.78rem', letterSpacing: '0.06em' }}>KARAT</th>
                      <th style={{ textAlign: 'left', padding: '0.8rem', fontWeight: '700', color: '#fff', fontSize: '0.78rem', letterSpacing: '0.06em' }}>WEIGHT</th>
                      <th style={{ textAlign: 'center', padding: '0.8rem', fontWeight: '700', color: '#fff', fontSize: '0.78rem', letterSpacing: '0.06em' }}>QTY</th>
                      <th style={{ textAlign: 'center', padding: '0.8rem', fontWeight: '700', color: '#fff', fontSize: '0.78rem', letterSpacing: '0.06em' }}>STATUS</th>
                      <th style={{ textAlign: 'left', padding: '0.8rem', fontWeight: '700', color: '#fff', fontSize: '0.78rem', letterSpacing: '0.06em' }}>SUPPLIER</th>
                      <th style={{ textAlign: 'center', padding: '0.8rem', fontWeight: '700', color: '#fff', fontSize: '0.78rem', letterSpacing: '0.06em' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockRows.map((row) => (
                      <tr key={row._id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.8rem', fontSize: '0.85rem', color: '#666' }}>{row.serial}</td>
                        <td style={{ padding: '0.8rem' }}>{row.name}</td>
                        <td style={{ padding: '0.8rem', fontSize: '0.9rem', color: '#666' }}>{row.category}</td>
                        <td style={{ padding: '0.8rem', fontWeight: '600', color: '#6f0022' }}>{row.karat || '-'}</td>
                        <td style={{ padding: '0.8rem', color: '#666' }}>{row.weight}g</td>
                        <td style={{ padding: '0.8rem', textAlign: 'center', fontWeight: '600', color: '#6f0022' }}>{row.quantity}</td>
                        <td style={{ padding: '0.8rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            background: Number(row.quantity) === 0 ? '#ffebee' : (Number(row.quantity) < 4 ? '#fff3e0' : '#e8f5e9'),
                            color: Number(row.quantity) === 0 ? '#c33' : (Number(row.quantity) < 4 ? '#e65100' : '#1f7a55')
                          }}>
                            {Number(row.quantity) === 0 ? 'Out of Stock' : (Number(row.quantity) < 4 ? 'Low Stock' : 'In Stock')}
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem', fontSize: '0.9rem', color: '#666' }}>{row.supplier || '-'}</td>
                        <td style={{ padding: '0.8rem', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => startEditStock(row)}
                              style={{
                                padding: '0.4rem 0.8rem',
                                background: '#e0bf63',
                                color: '#6f0022',
                                border: 'none',
                                borderRadius: 6,
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontFamily: 'Poppins, sans-serif'
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteStock(row._id)}
                              style={{
                                padding: '0.4rem 0.8rem',
                                background: '#fff',
                                color: '#c33',
                                border: '1px solid #ddd',
                                borderRadius: 6,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontFamily: 'Poppins, sans-serif'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* RATES TAB */}
      {activeTab === 'rates' && (
        <div>
          <section style={{ background: '#fafbfc', border: '1px solid #eee', borderRadius: 12, padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ marginTop: 0, color: '#6f0022', fontSize: '1.1rem' }}>Gold Rates</h3>
                <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>Current market rates for each gold karat</p>
              </div>
              <button
                onClick={() => setShowRatesModal(true)}
                style={{
                  padding: '0.6rem 1.2rem',
                  background: '#6f0022',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                Update Rates
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.9rem', fontWeight: '500' }}>18K Gold</p>
                <p style={{ margin: 0, color: '#6f0022', fontSize: '1.8rem', fontWeight: '700' }}>Rs. {goldRates['18K']}</p>
                {rateData && rateData.previous18K && rateData.previous18K !== goldRates['18K'] && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {(() => {
                      const change = calculatePercentageChange(goldRates['18K'], rateData.previous18K);
                      return (
                        <p style={{
                          margin: 0,
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: change.isPositive ? '#4caf50' : '#f44336'
                        }}>
                          {change.isPositive ? '↑' : '↓'} {Math.abs(change.percentage)}%
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>
              <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.9rem', fontWeight: '500' }}>22K Gold</p>
                <p style={{ margin: 0, color: '#6f0022', fontSize: '1.8rem', fontWeight: '700' }}>Rs. {goldRates['22K']}</p>
                {rateData && rateData.previous22K && rateData.previous22K !== goldRates['22K'] && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {(() => {
                      const change = calculatePercentageChange(goldRates['22K'], rateData.previous22K);
                      return (
                        <p style={{
                          margin: 0,
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: change.isPositive ? '#4caf50' : '#f44336'
                        }}>
                          {change.isPositive ? '↑' : '↓'} {Math.abs(change.percentage)}%
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>
              <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.9rem', fontWeight: '500' }}>24K Gold</p>
                <p style={{ margin: 0, color: '#6f0022', fontSize: '1.8rem', fontWeight: '700' }}>Rs. {goldRates['24K']}</p>
                {rateData && rateData.previous24K && rateData.previous24K !== goldRates['24K'] && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {(() => {
                      const change = calculatePercentageChange(goldRates['24K'], rateData.previous24K);
                      return (
                        <p style={{
                          margin: 0,
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: change.isPositive ? '#4caf50' : '#f44336'
                        }}>
                          {change.isPositive ? '↑' : '↓'} {Math.abs(change.percentage)}%
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
            {rateData && rateData.lastUpdated && (
              <div style={{
                marginTop: '1.5rem',
                padding: '0.8rem',
                background: '#f5f5f5',
                borderRadius: 8,
                textAlign: 'center',
                borderLeft: '4px solid #e0bf63'
              }}>
                <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>
                  Last updated: <strong>{formatLastUpdate(rateData.lastUpdated)}</strong>
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* SUPPLIERS TAB */}
      {activeTab === 'suppliers' && (
        <div>
          {/* Suppliers List */}
          <section style={{ background: '#fafbfc', border: '1px solid #eee', borderRadius: 12, padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0, color: '#6f0022', fontSize: '1.1rem' }}>Supplier Directory</h3>
              <button
                onClick={() => {
                  setEditingSupplier(null);
                  setSupplierForm(emptySupplier);
                  setError('');
                  setShowSupplierModal(true);
                }}
                style={{
                  padding: '0.6rem 1.2rem',
                  background: '#6f0022',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                Add Supplier
              </button>
            </div>
            {suppliers.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>No suppliers added yet</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.8rem' }}>
                {suppliers.map((supplier) => (
                  <div key={supplier._id} style={{
                    background: '#fff',
                    border: '1px solid #eee',
                    borderRadius: 8,
                    padding: '1rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'start',
                    gap: '1rem'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.4rem', color: '#6f0022', fontSize: '1rem' }}>
                        {supplier.name}
                      </h4>
                      <p style={{ margin: '0.3rem 0', color: '#333', fontSize: '0.9rem' }}>
                        Contact: <strong>{supplier.contact}</strong>
                      </p>
                      {supplier.email && (
                        <p style={{ margin: '0.2rem 0', color: '#666', fontSize: '0.9rem' }}>
                          Email: {supplier.email}
                        </p>
                      )}
                      {supplier.location && (
                        <p style={{ margin: '0.2rem 0', color: '#666', fontSize: '0.9rem' }}>
                          Location: {supplier.location}
                        </p>
                      )}
                      {supplier.itemsSupplied && (
                        <p style={{ margin: '0.3rem 0 0', color: '#666', fontSize: '0.9rem' }}>
                          Items: {supplier.itemsSupplied}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                      <button
                        onClick={() => startEditSupplier(supplier)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#e0bf63',
                          color: '#6f0022',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontFamily: 'Poppins, sans-serif',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => addStockForSupplier(supplier)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#6f0022',
                          color: '#e0bf63',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontFamily: 'Poppins, sans-serif',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Add Stock
                      </button>
                      <button
                        onClick={() => deleteSupplier(supplier._id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#fff',
                          color: '#c33',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontFamily: 'Poppins, sans-serif'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* STOCK MODAL */}
      {showStockModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }} onClick={() => cancelEditStock()}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            position: 'relative'
          }} className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => cancelEditStock()}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '4px',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Close modal"
            >
              ×
            </button>
            <h3 style={{ marginTop: 0, color: '#6f0022', fontSize: '1.25rem', marginBottom: '1.5rem', paddingRight: '40px' }}>
              {editingStock ? 'Edit Stock Item' : 'Add Stock Item'}
            </h3>
            {error && (
              <div style={{
                background: '#ffebee',
                border: '1px solid #ef5350',
                color: '#c62828',
                padding: '0.8rem',
                borderRadius: 6,
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}
            <form onSubmit={saveStock} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input
                  required
                  type="text"
                  placeholder="Product Name"
                  value={stockForm.name}
                  onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'Poppins, sans-serif',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                <select
                  value={stockForm.category}
                  onChange={(e) => setStockForm({ ...stockForm, category: e.target.value })}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'Poppins, sans-serif',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  <option>Ring</option>
                  <option>Necklace</option>
                  <option>Earrings</option>
                  <option>Bangle</option>
                  <option>Bracelet</option>
                  <option>Pendant</option>
                  <option>Chain</option>
                  <option>Bangles</option>
                  <option>Anklet</option>
                  <option>Other</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <select
                  value={stockForm.karat}
                  onChange={(e) => setStockForm({ ...stockForm, karat: e.target.value })}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'Poppins, sans-serif',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  <option>18K</option>
                  <option>22K</option>
                  <option>24K</option>
                </select>
                <input
                  type="number"
                  min="0.1"
                  step="0.01"
                  required
                  placeholder="Weight (g)"
                  value={stockForm.weight}
                  onChange={(e) => setStockForm({ ...stockForm, weight: e.target.value })}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'Poppins, sans-serif',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Quantity"
                  value={stockForm.quantity}
                  onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'Poppins, sans-serif',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <select
                value={stockForm.supplier}
                onChange={(e) => setStockForm({ ...stockForm, supplier: e.target.value })}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'Poppins, sans-serif',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select Supplier (optional)</option>
                {supplierOptions.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={isSavingStock}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#6f0022',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isSavingStock ? 'not-allowed' : 'pointer',
                    fontFamily: 'Poppins, sans-serif',
                    opacity: isSavingStock ? 0.6 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isSavingStock ? (editingStock ? 'Updating...' : 'Adding...') : (editingStock ? 'Update Stock' : 'Add Stock')}
                </button>
                <button
                  type="button"
                  onClick={cancelEditStock}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#fff',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER MODAL */}
      {showSupplierModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }} onClick={() => {
          setEditingSupplier(null);
          setSupplierForm(emptySupplier);
          setShowSupplierModal(false);
          setError('');
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            position: 'relative'
          }} className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setEditingSupplier(null);
                setSupplierForm(emptySupplier);
                setShowSupplierModal(false);
                setError('');
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '4px',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Close modal"
            >
              ×
            </button>
            <h3 style={{ marginTop: 0, color: '#6f0022', fontSize: '1.25rem', marginBottom: '1.5rem', paddingRight: '40px' }}>
              {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </h3>
            {error && (
              <div style={{
                background: '#ffebee',
                border: '1px solid #ef5350',
                color: '#c62828',
                padding: '0.8rem',
                borderRadius: 6,
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}
            <form onSubmit={saveSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input
                  required
                  type="text"
                  placeholder="Supplier Name"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'Poppins, sans-serif',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                <input
                  required
                  type="tel"
                  placeholder="Contact Number"
                  value={supplierForm.contact}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  maxLength={10}
                  pattern="[0-9]{10}"
                  title="Contact number must be exactly 10 digits"
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'Poppins, sans-serif',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'Poppins, sans-serif',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                <input
                  type="text"
                  placeholder="Location (optional)"
                  value={supplierForm.location}
                  onChange={(e) => setSupplierForm({ ...supplierForm, location: e.target.value })}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'Poppins, sans-serif',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <input
                type="text"
                placeholder="Items Supplied (optional)"
                value={supplierForm.itemsSupplied}
                onChange={(e) => setSupplierForm({ ...supplierForm, itemsSupplied: e.target.value })}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'Poppins, sans-serif',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={isSavingSupplier}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#6f0022',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isSavingSupplier ? 'not-allowed' : 'pointer',
                    fontFamily: 'Poppins, sans-serif',
                    opacity: isSavingSupplier ? 0.6 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isSavingSupplier ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Add Supplier'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSupplier(null);
                    setSupplierForm(emptySupplier);
                    setShowSupplierModal(false);
                    setError('');
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#fff',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RATES MODAL */}
      {showRatesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }} onClick={() => setShowRatesModal(false)}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            position: 'relative'
          }} className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowRatesModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '4px',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Close modal"
            >
              ×
            </button>
            <h3 style={{ marginTop: 0, color: '#6f0022', fontSize: '1.25rem', marginBottom: '1.5rem', paddingRight: '40px' }}>
              Update Gold Rates
            </h3>
            {rateData && rateData.lastUpdated && (
              <div style={{
                background: '#e8f5e9',
                border: '1px solid #c8e6c9',
                borderRadius: 8,
                padding: '0.8rem',
                marginBottom: '1.5rem',
                fontSize: '0.85rem',
                color: '#2e7d32'
              }}>
                <p style={{ margin: '0.3rem 0', fontWeight: '500' }}>
                  Last updated: {formatLastUpdate(rateData.lastUpdated)}
                </p>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem' }}>
                  Current rates - 18K: Rs. {goldRates['18K']} | 22K: Rs. {goldRates['22K']} | 24K: Rs. {goldRates['24K']}
                </p>
              </div>
            )}
            {error && (
              <div style={{
                background: '#ffebee',
                border: '1px solid #ef5350',
                color: '#c62828',
                padding: '0.8rem',
                borderRadius: 6,
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}
            <form onSubmit={saveRates} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontSize: '14px', fontWeight: '600' }}>
                    18K Gold Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={goldRates['18K']}
                    onChange={(e) => setGoldRates({ ...goldRates, '18K': Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontFamily: 'Poppins, sans-serif',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontSize: '14px', fontWeight: '600' }}>
                    22K Gold Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={goldRates['22K']}
                    onChange={(e) => setGoldRates({ ...goldRates, '22K': Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontFamily: 'Poppins, sans-serif',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontSize: '14px', fontWeight: '600' }}>
                    24K Gold Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={goldRates['24K']}
                    onChange={(e) => setGoldRates({ ...goldRates, '24K': Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontFamily: 'Poppins, sans-serif',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={isSavingRates}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#6f0022',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isSavingRates ? 'not-allowed' : 'pointer',
                    fontFamily: 'Poppins, sans-serif',
                    opacity: isSavingRates ? 0.6 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isSavingRates ? 'Updating...' : 'Update Rates'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRatesModal(false)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#fff',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </main>

      {/* Bottom Navigation */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '80px',
        background: 'linear-gradient(to top, #ffffff, #f0f0f0)',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 1000
      }}>
        {[
          { id: 'stock', icon: FiBox, label: 'Stock Management' },
          { id: 'rates', icon: FiTrendingUp, label: 'Gold Rates' },
          { id: 'suppliers', icon: FiTruck, label: 'Suppliers' },
          { id: 'alerts', icon: FiAlertTriangle, label: 'Stock Alerts' },
          { id: 'logout', icon: FiLogOut, label: 'Logout' }
        ].map(item => {
          const isActive = activeTab === item.id && item.id !== 'logout';
          const IconComponent = item.icon;
          const alertCount = item.id === 'alerts' ? lowStockAlerts.length : 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === 'logout') {
                  authManager.logout();
                } else {
                  setActiveTab(item.id);
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                background: 'transparent',
                border: 'none',
                color: item.id === 'logout' ? '#d32f2f' : (activeTab === item.id ? '#6f0022' : '#666'),
                fontSize: '12px',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: item.id === 'logout' ? 600 : (activeTab === item.id ? 600 : 500),
                cursor: 'pointer',
                transition: 'all 0.3s',
                borderRadius: '8px',
                position: 'relative',
                minWidth: '60px'
              }}
            >
              <IconComponent size={24} style={{ marginBottom: '4px' }} />
              <span>{item.label}</span>
              {alertCount > 0 && item.id === 'alerts' && (
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: '#d32f2f',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: '700'
                }}>
                  {alertCount}
                </div>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

