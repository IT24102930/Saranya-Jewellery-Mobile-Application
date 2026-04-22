import { useEffect, useMemo, useState } from 'react';
import { FiBox, FiPlus, FiDatabase, FiLogOut } from 'react-icons/fi';
import authManager from '../auth.js';

const emptyForm = {
  stockProductId: '',
  name: '',
  description: '',
  image: '/assets/placeholder-product.jpg',
  category: 'Ring',
  taxPercentage: '',
  featured: false
};

export default function ProductManagementDashboardPage() {
  const [staffUser, setStaffUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [stockOptions, setStockOptions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [activeSection, setActiveSection] = useState('productList');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState('all');

  const activeProducts = useMemo(
    () => products.filter((item) => item.productStatus === 'Active').length,
    [products]
  );

  const featuredProducts = useMemo(
    () => products.filter((item) => Boolean(item.featured)).length,
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const categoryMatch = categoryFilter === 'all' ? true : item.category === categoryFilter;
      const statusMatch = statusFilter === 'all' ? true : item.productStatus === statusFilter;
      const featuredMatch = featuredFilter === 'all' ? true : (featuredFilter === 'featured' ? item.featured : !item.featured);
      return categoryMatch && statusMatch && featuredMatch;
    });
  }, [products, categoryFilter, statusFilter, featuredFilter]);

  useEffect(() => {
    document.title = 'Product Management Dashboard - Saranya Jewellery';
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const me = await authManager.checkStaffAuth('Product Management');
      if (!me || me.needsApproval) return;
      setStaffUser(me);
      await Promise.all([loadProducts(), loadStockOptions()]);
    }
    bootstrap();
  }, []);

  async function loadProducts() {
    setError('');
    try {
      const response = await authManager.apiRequest('/api/products');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load products');
      setProducts([]);
    }
  }

  async function loadStockOptions() {
    try {
      const response = await authManager.apiRequest('/api/products/stock-options');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load inventory options');
      setStockOptions(Array.isArray(data) ? data : []);
    } catch {
      setStockOptions([]);
    }
  }

  async function saveProduct(event) {
    event.preventDefault();
    setError('');

    const parsedTaxPercentage = form.taxPercentage === '' ? 0 : Number(form.taxPercentage);
    if (!Number.isFinite(parsedTaxPercentage) || parsedTaxPercentage < 0 || parsedTaxPercentage > 100) {
      setError('Tax percentage must be between 0 and 100');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        stockProductId: form.stockProductId || undefined,
        taxPercentage: parsedTaxPercentage,
        featured: Boolean(form.featured)
      };
      // Remove price from payload - it's calculated by backend based on stock weight, karat, and gold rate
      delete payload.price;
      
      const response = await authManager.apiRequest(
        editingProductId ? `/api/products/${editingProductId}` : '/api/products',
        {
          method: editingProductId ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to save product');
      setForm(emptyForm);
      setEditingProductId(null);
      setIsProductModalOpen(false);
      await Promise.all([loadProducts(), loadStockOptions()]);
    } catch (saveError) {
      setError(saveError.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadImageFromDevice(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to upload image');

      setForm((prev) => ({
        ...prev,
        image: data.imagePath || prev.image
      }));
    } catch (uploadError) {
      setError(uploadError.message || 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      event.target.value = '';
    }
  }

  async function updateProductState(product, updates) {
    setError('');
    try {
      const response = await authManager.apiRequest(`/api/products/${product._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: product.name,
          description: product.description,
          image: product.image,
          category: product.category,
          taxPercentage: Number(product.taxPercentage || 0),
          featured: Boolean(product.featured),
          ...updates
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update product state');
      await loadProducts();
    } catch (stateError) {
      setError(stateError.message || 'Failed to update product state');
    }
  }

  function startEditProduct(product) {
    setEditingProductId(product._id);
    setForm({
      stockProductId: '',
      name: product.name || '',
      description: product.description || '',
      image: product.image || '/assets/placeholder-product.jpg',
      category: product.category || 'Ring',
      price: Number(product.price || 0),
      taxPercentage: Number(product.taxPercentage || 0),
      featured: Boolean(product.featured)
    });
    setError('');
    setActiveSection('createProduct');
  }

  function cancelEdit() {
    setEditingProductId(null);
    setForm(emptyForm);
    setError('');
    setIsProductModalOpen(false);
  }

  function openCreateModal() {
    setEditingProductId(null);
    setForm(emptyForm);
    setError('');
    setIsProductModalOpen(true);
  }

  async function removeProduct(productId) {
    if (!window.confirm('Delete this product?')) return;
    setError('');
    try {
      const response = await authManager.apiRequest(`/api/products/${productId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete product');
      await Promise.all([loadProducts(), loadStockOptions()]);
    } catch (removeError) {
      setError(removeError.message || 'Failed to delete product');
    }
  }

  if (!staffUser) return <p style={{ padding: '1rem' }}>Checking product management access...</p>;

  const selectedStockItem = stockOptions.find((item) => item._id === form.stockProductId);

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
            <FiBox size={28} />
            Product Management
          </h1>
        </div>

        {/* Navigation Items */}
        <nav style={{
          flex: 1,
          padding: '1.5rem 1rem',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { key: 'productList', label: 'Product List', icon: FiBox },
              { key: 'createProduct', label: 'Create Product', icon: FiPlus },
              { key: 'stockInventory', label: 'Stock Inventory', icon: FiDatabase }
            ].map((item) => {
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
            onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
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
        {/* Stats Cards - Only on Product List */}
        {activeSection === 'productList' && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <p style={{ margin: 0, color: '#666' }}>Total Products</p>
              <h2 style={{ margin: '0.35rem 0 0', color: '#6f0022', fontSize: '2rem', fontWeight: 700 }}>{products.length}</h2>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <p style={{ margin: 0, color: '#666' }}>Active Products</p>
              <h2 style={{ margin: '0.35rem 0 0', color: '#6f0022', fontSize: '2rem', fontWeight: 700 }}>{activeProducts}</h2>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <p style={{ margin: 0, color: '#666' }}>Available Stock</p>
              <h2 style={{ margin: '0.35rem 0 0', color: '#6f0022', fontSize: '2rem', fontWeight: 700 }}>{stockOptions.length}</h2>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <p style={{ margin: 0, color: '#666' }}>Featured Products</p>
              <h2 style={{ margin: '0.35rem 0 0', color: '#6f0022', fontSize: '2rem', fontWeight: 700 }}>{featuredProducts}</h2>
            </div>
          </section>
        )}

        {/* Product List Section */}
        {activeSection === 'productList' && (
          <>
            <section style={{ background: '#fff', borderRadius: '12px', padding: '2rem', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: '#6f0022', fontSize: '1.4rem', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}>Product List</h3>
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{ padding: '0.55rem 0.7rem', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.95rem', background: '#fff', cursor: 'pointer' }}
                  >
                    <option value="all">All Categories</option>
                    <option value="Ring">Ring</option>
                    <option value="Necklace">Necklace</option>
                    <option value="Earrings">Earrings</option>
                    <option value="Bangles">Bangles</option>
                    <option value="Bracelet">Bracelet</option>
                    <option value="Pendant">Pendant</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: '0.55rem 0.7rem', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.95rem', background: '#fff', cursor: 'pointer' }}
                  >
                    <option value="all">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                  </select>
                  <select
                    value={featuredFilter}
                    onChange={(e) => setFeaturedFilter(e.target.value)}
                    style={{ padding: '0.55rem 0.7rem', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.95rem', background: '#fff', cursor: 'pointer' }}
                  >
                    <option value="all">All Products</option>
                    <option value="featured">Featured Only</option>
                    <option value="regular">Regular Only</option>
                  </select>
                </div>
              </div>
              {error && <p style={{ color: '#b42318', marginBottom: '1rem' }}>{error}</p>}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e9ecef', background: '#f8f9fa' }}>
                      <th style={{ textAlign: 'left', padding: '0.85rem', color: '#333' }}>Product</th>
                      <th style={{ textAlign: 'left', padding: '0.85rem', color: '#333' }}>Category</th>
                      <th style={{ textAlign: 'left', padding: '0.85rem', color: '#333' }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '0.85rem', color: '#333' }}>Price</th>
                      <th style={{ textAlign: 'right', padding: '0.85rem', color: '#333' }}>Stock</th>
                      <th style={{ textAlign: 'center', padding: '0.85rem', color: '#333' }}>Featured</th>
                      <th style={{ textAlign: 'center', padding: '0.85rem', color: '#333' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product._id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <img
                              src={product.image || '/assets/placeholder-product.jpg'}
                              alt={product.name}
                              style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
                            />
                            <div>
                              <p style={{ margin: 0, fontWeight: 600, color: '#1f2937' }}>{product.name}</p>
                              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>{(product.description || '').slice(0, 50)}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem', color: '#555' }}>{product.category || '-'}</td>
                        <td style={{ padding: '0.85rem' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.6rem',
                            borderRadius: 999,
                            background: product.productStatus === 'Active' ? '#d1fae5' : '#fef3c7',
                            color: product.productStatus === 'Active' ? '#065f46' : '#92400e',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}>
                            {product.productStatus || 'Draft'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem', textAlign: 'right', color: '#555' }}>LKR {(Number(product.price || 0) + (Number(product.price || 0) * Number(product.taxPercentage || 0) / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td style={{ padding: '0.85rem', textAlign: 'right', color: '#555' }}>{product.stockQuantity || 0}</td>
                        <td style={{ padding: '0.85rem', textAlign: 'center', color: '#555' }}>{product.featured ? 'Yes' : 'No'}</td>
                        <td style={{ padding: '0.85rem', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => startEditProduct(product)}
                              style={{ background: '#fff', border: '1px solid #d0c3a4', color: '#6f0022', borderRadius: 6, padding: '0.35rem 0.55rem', fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newStatus = product.productStatus === 'Active' ? 'Draft' : 'Active';
                                updateProductState(product, {
                                  productStatus: newStatus
                                });
                              }}
                              style={{ background: '#fff', border: '1px solid #c8d6f9', color: '#1f4b9a', borderRadius: 6, padding: '0.35rem 0.55rem', fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                              {product.productStatus === 'Active' ? 'Hide' : 'Show'}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeProduct(product._id)}
                              style={{ background: '#fff', border: '1px solid #f1c0c0', color: '#b42318', borderRadius: 6, padding: '0.35rem 0.55rem', fontSize: '0.8rem', cursor: 'pointer' }}
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
              {filteredProducts.length === 0 && <p style={{ margin: '1.5rem 0 0', color: '#999', textAlign: 'center' }}>No products found.</p>}
            </section>
          </>
        )}

        {/* Create Product Section */}
        {activeSection === 'createProduct' && (
          <section style={{ background: '#fff', borderRadius: '12px', padding: '2rem', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#6f0022', fontSize: '1.4rem', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}>Create / Publish Product</h3>
              <p style={{ margin: '0.35rem 0 0', color: '#666', fontSize: '0.95rem' }}>Create a new product or publish one from your inventory stock.</p>
            </div>

            <form onSubmit={saveProduct} style={{ display: 'grid', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label style={{ color: '#6f0022', fontSize: '0.9rem', fontWeight: 600 }}>Select Stock (optional)</label>
                  <select
                    value={form.stockProductId}
                    disabled={Boolean(editingProductId)}
                    onChange={(e) => {
                      const stockProductId = e.target.value;
                      const item = stockOptions.find((stockItem) => stockItem._id === stockProductId);
                      setForm((prev) => ({
                        ...prev,
                        stockProductId,
                        category: item?.category === 'Bangle' ? 'Bangles' : item?.category === 'Earring' ? 'Earrings' : item?.category || prev.category
                      }));
                    }}
                    style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: 8, fontSize: '1rem' }}
                  >
                    <option value="">Create brand new product</option>
                    {stockOptions.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name} ({item.category}) - Qty {item.quantity ?? item.stockQuantity ?? 0}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label style={{ color: '#6f0022', fontSize: '0.9rem', fontWeight: 600 }}>Jewellery Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter jewellery name"
                    style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: 8, fontSize: '1rem' }}
                  />
                </div>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label style={{ color: '#6f0022', fontSize: '0.9rem', fontWeight: 600 }}>Tax Percentage (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    value={form.taxPercentage}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setForm((prev) => ({ ...prev, taxPercentage: '' }));
                      } else {
                        let numValue = parseFloat(value);
                        if (!isNaN(numValue)) {
                          numValue = Math.max(0, Math.min(100, numValue));
                          setForm((prev) => ({ ...prev, taxPercentage: numValue }));
                        }
                      }
                    }}
                    placeholder="0 to 100"
                    style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: 8, fontSize: '1rem' }}
                  />
                </div>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label style={{ color: '#6f0022', fontSize: '0.9rem', fontWeight: 600 }}>Jewellery Type</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: 8, fontSize: '1rem' }}
                  >
                    <option>Ring</option>
                    <option>Necklace</option>
                    <option>Earrings</option>
                    <option>Bangles</option>
                    <option>Bracelet</option>
                    <option>Pendant</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '0.35rem' }}>
                <label style={{ color: '#6f0022', fontSize: '0.9rem', fontWeight: 600 }}>Description</label>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Write product details"
                  style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: 8, fontSize: '1rem', resize: 'vertical', fontFamily: 'Poppins, sans-serif' }}
                />
              </div>

              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label style={{ color: '#6f0022', fontSize: '0.9rem', fontWeight: 600 }}>Image URL</label>
                  <input
                    required
                    value={form.image}
                    onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                    placeholder="https://..."
                    style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: 8, fontSize: '1rem' }}
                  />
                </div>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label style={{ color: '#6f0022', fontSize: '0.9rem', fontWeight: 600 }}>Upload Image</label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    background: '#fff',
                    cursor: isUploadingImage ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem'
                  }}>
                    <span style={{ color: '#6f0022', fontWeight: 600 }}>
                      {isUploadingImage ? 'Uploading...' : 'Upload from device'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={uploadImageFromDevice}
                      disabled={isUploadingImage}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {form.image && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                  <img
                    src={form.image}
                    alt="Product preview"
                    style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid #ddd' }}
                  />
                  <p style={{ margin: 0, color: '#666', fontSize: '0.9rem', wordBreak: 'break-word' }}>{form.image}</p>
                </div>
              )}

              {error && <p style={{ margin: 0, color: '#b42318', fontWeight: 500 }}>{error}</p>}

              {selectedStockItem && (
                <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: 8, background: '#fffaf1', color: '#6f0022' }}>
                  <strong>Selected Stock:</strong> {selectedStockItem.name} • {selectedStockItem.category} • Quantity {selectedStockItem.quantity ?? selectedStockItem.stockQuantity ?? 0}
                </div>
              )}

              {/* Price Display Section */}
              {selectedStockItem && (() => {
                const basePrice = (selectedStockItem.weight || 0) * (selectedStockItem.karatRate || 0);
                const taxAmount = basePrice * Number(form.taxPercentage || 0) / 100;
                const finalPrice = basePrice + taxAmount;
                return (
                  <div style={{ padding: '1.5rem', border: '2px solid #e0bf63', borderRadius: 10, background: '#fffbf0', marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 1rem', color: '#6f0022', fontSize: '1rem', fontWeight: 700 }}>Calculated Product Price</h4>
                    <div style={{ display: 'grid', gap: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#555', fontSize: '0.95rem' }}>Base Price (from stock):</span>
                        <span style={{ color: '#1f2937', fontWeight: 600, fontSize: '1.1rem' }}>LKR {basePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#555', fontSize: '0.95rem' }}>Tax ({form.taxPercentage}%):</span>
                        <span style={{ color: '#666', fontWeight: 500 }}>+ LKR {taxAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ borderTop: '2px solid #dcc5a8', paddingTop: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#6f0022', fontSize: '1.1rem', fontWeight: 700 }}>Final Price:</span>
                        <span style={{ color: '#6f0022', fontSize: '1.4rem', fontWeight: 700 }}>LKR {finalPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid #e9ecef' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: featuredProducts >= 5 && !form.featured ? 'not-allowed' : 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={form.featured} 
                      onChange={(e) => {
                        const isChecking = e.target.checked;
                        if (isChecking && featuredProducts >= 5) {
                          setError('Featured products are limited to 5. Please unfeature another product first.');
                          return;
                        }
                        setForm((prev) => ({ ...prev, featured: isChecking }));
                        if (isChecking) {
                          setError('');
                        }
                      }}
                      disabled={featuredProducts >= 5 && !form.featured}
                      style={{ cursor: featuredProducts >= 5 && !form.featured ? 'not-allowed' : 'pointer' }} 
                    />
                    <span style={{ color: '#333', fontWeight: 500 }}>Featured Product {featuredProducts >= 5 && !form.featured ? '(Limit reached)' : `(${featuredProducts}/5)`}</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.8rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(emptyForm);
                      setEditingProductId(null);
                      setError('');
                    }}
                    style={{
                      border: '1px solid #dee2e6',
                      color: '#6b7280',
                      background: '#fff',
                      padding: '0.8rem 1.5rem',
                      fontSize: '1rem',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.style.background = '#fff'}
                  >
                    Clear Form
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{
                      background: '#6f0022',
                      color: '#fff',
                      border: 'none',
                      padding: '0.8rem 1.5rem',
                      fontSize: '1rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      opacity: isSaving ? 0.7 : 1,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => !isSaving && (e.target.style.background = '#4f0018')}
                    onMouseLeave={(e) => !isSaving && (e.target.style.background = '#6f0022')}
                  >
                    {isSaving ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}

        {/* Stock Inventory Section */}
        {activeSection === 'stockInventory' && (
          <section style={{ background: '#fff', borderRadius: '12px', padding: '2rem', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <h3 style={{ margin: '0 0 1.5rem', color: '#6f0022', fontSize: '1.4rem', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}>Available Stock from Inventory</h3>
            {stockOptions.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>No stock items available from inventory.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {stockOptions.map((item) => (
                  <div key={item._id} style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    background: '#f8f9fa',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, color: '#1f2937', fontSize: '1.1rem', fontWeight: 600 }}>{item.name}</h4>
                      <span style={{
                        background: item.quantity > 0 ? '#d1fae5' : '#fecaca',
                        color: item.quantity > 0 ? '#065f46' : '#991b1b',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '999px',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}>
                        {item.quantity ?? item.stockQuantity ?? 0} left
                      </span>
                    </div>
                    <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.95rem', color: '#555' }}>
                      <p style={{ margin: 0 }}><strong>Category:</strong> {item.category}</p>
                      <p style={{ margin: 0 }}><strong>SKU:</strong> {item.sku || 'N/A'}</p>
                      <p style={{ margin: 0 }}><strong>Added:</strong> {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <button
                      onClick={() => {
                        const stockProductId = item._id;
                        setForm((prev) => ({
                          ...prev,
                          stockProductId,
                          category: item.category === 'Bangle' ? 'Bangles' : item.category === 'Earring' ? 'Earrings' : item.category || prev.category
                        }));
                        setActiveSection('createProduct');
                      }}
                      style={{
                        width: '100%',
                        background: '#6f0022',
                        color: '#fff',
                        border: 'none',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#4f0018'}
                      onMouseLeave={(e) => e.target.style.background = '#6f0022'}
                    >
                      Publish as Product
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
