import { useEffect, useMemo, useState } from 'react';
import { FiBox, FiPlus, FiDatabase, FiLogOut, FiMenu, FiX, FiSearch } from 'react-icons/fi';
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
  const [karatFilter, setKaratFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false));

  const activeProducts = useMemo(
    () => products.filter((item) => item.productStatus === 'Active').length,
    [products]
  );

  const featuredProducts = useMemo(
    () => products.filter((item) => Boolean(item.featured)).length,
    [products]
  );

  const filteredProducts = useMemo(() => {
    const searchLower = searchText.trim().toLowerCase();
    return products.filter((item) => {
      const categoryMatch = categoryFilter === 'all' ? true : item.category === categoryFilter;
      const statusMatch = statusFilter === 'all' ? true : item.productStatus === statusFilter;
      const featuredMatch = featuredFilter === 'all' ? true : (featuredFilter === 'featured' ? item.featured : !item.featured);
      const karatMatch = karatFilter === 'all' ? true : (item.kType === karatFilter || item.karat === karatFilter);
      const availabilityMatch = availabilityFilter === 'all' ? true : item.availabilityStatus === availabilityFilter;
      const searchMatch = searchLower
        ? [item.name, item.category, item.kType, item.karat, item.productStatus, item.availabilityStatus, item.description]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(searchLower)
        : true;
      return categoryMatch && statusMatch && featuredMatch && karatMatch && availabilityMatch && searchMatch;
    });
  }, [products, categoryFilter, statusFilter, featuredFilter, karatFilter, availabilityFilter, searchText]);

  const chipFilters = [
    { label: 'Ring', type: 'category', value: 'Ring' },
    { label: 'Earrings', type: 'category', value: 'Earrings' },
    { label: 'Bangles', type: 'category', value: 'Bangles' },
    { label: '22K', type: 'karat', value: '22K' },
    { label: '18K', type: 'karat', value: '18K' },
    { label: '24K', type: 'karat', value: '24K' },
    { label: 'Active', type: 'status', value: 'Active' },
    { label: 'Draft', type: 'status', value: 'Draft' },
    { label: 'In Stock', type: 'availability', value: 'In Stock' },
    { label: 'Out of Stock', type: 'availability', value: 'Out of Stock' },
    { label: 'Featured', type: 'featured', value: 'featured' }
  ];

  function toggleChipFilter(chip) {
    if (chip.type === 'category') {
      setCategoryFilter((current) => (current === chip.value ? 'all' : chip.value));
      return;
    }
    if (chip.type === 'status') {
      setStatusFilter((current) => (current === chip.value ? 'all' : chip.value));
      return;
    }
    if (chip.type === 'karat') {
      setKaratFilter((current) => (current === chip.value ? 'all' : chip.value));
      return;
    }
    if (chip.type === 'availability') {
      setAvailabilityFilter((current) => (current === chip.value ? 'all' : chip.value));
      return;
    }
    if (chip.type === 'featured') {
      setFeaturedFilter((current) => (current === 'featured' ? 'all' : 'featured'));
      return;
    }
  }

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

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 1024;
      setIsMobileView(mobile);
      if (!mobile) {
        setIsMobileNavOpen(false);
      }
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobileView || !isMobileNavOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileNavOpen, isMobileView]);

  useEffect(() => {
    if (isMobileView) {
      setIsMobileNavOpen(false);
    }
  }, [activeSection, isMobileView]);

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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fafbfc', position: 'relative' }}>
      {isMobileView && (
        <button
          type="button"
          onClick={() => setIsMobileNavOpen((prev) => !prev)}
          style={{
            position: 'fixed',
            top: '1rem',
            left: '1rem',
            zIndex: 220,
            border: 'none',
            background: '#6f0022',
            color: '#fff',
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.22)',
            cursor: 'pointer'
          }}
          aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {isMobileNavOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      )}

      {isMobileView && isMobileNavOpen && (
        <div
          onClick={() => setIsMobileNavOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(23, 12, 18, 0.45)',
            zIndex: 140
          }}
        />
      )}

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
        zIndex: 200,
        transform: isMobileView ? (isMobileNavOpen ? 'translateX(0)' : 'translateX(-105%)') : 'translateX(0)',
        transition: 'transform 0.25s ease',
        boxShadow: isMobileView ? '0 16px 28px rgba(0, 0, 0, 0.24)' : 'none'
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
                  onClick={() => {
                    setActiveSection(item.key);
                    if (isMobileView) {
                      setIsMobileNavOpen(false);
                    }
                  }}
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
        marginLeft: isMobileView ? 0 : '320px',
        padding: isMobileView ? '5rem 1rem 1.25rem' : '2rem',
        overflowY: 'auto'
      }}>
        {/* Stats Cards - Only on Product List */}
        {activeSection === 'productList' && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#6f0022', border: '1px solid #d4af37', borderRadius: '18px', padding: '1rem 1rem 0.85rem', color: '#fff', minHeight: '100px' }}>
              <p style={{ margin: 0, color: '#f3e3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Total Products</p>
              <h2 style={{ margin: '0.65rem 0 0', color: '#f5d35b', fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{products.length}</h2>
            </div>
            <div style={{ background: '#6f0022', border: '1px solid #d4af37', borderRadius: '18px', padding: '1rem 1rem 0.85rem', color: '#fff', minHeight: '100px' }}>
              <p style={{ margin: 0, color: '#f3e3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Active Products</p>
              <h2 style={{ margin: '0.65rem 0 0', color: '#f5d35b', fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{activeProducts}</h2>
            </div>
            <div style={{ background: '#6f0022', border: '1px solid #d4af37', borderRadius: '18px', padding: '1rem 1rem 0.85rem', color: '#fff', minHeight: '100px' }}>
              <p style={{ margin: 0, color: '#f3e3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Stock Available</p>
              <h2 style={{ margin: '0.65rem 0 0', color: '#f5d35b', fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{stockOptions.length}</h2>
            </div>
            <div style={{ background: '#6f0022', border: '1px solid #d4af37', borderRadius: '18px', padding: '1rem 1rem 0.85rem', color: '#fff', minHeight: '100px' }}>
              <p style={{ margin: 0, color: '#f3e3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Featured Items</p>
              <h2 style={{ margin: '0.65rem 0 0', color: '#f5d35b', fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{featuredProducts}</h2>
            </div>
          </section>
        )}

        {/* Product List Section */}
        {activeSection === 'productList' && (
          <>
            <section style={{ background: '#fff', borderRadius: '12px', padding: '2rem', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#6f0022', fontSize: '1.4rem', fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}>Product List</h3>
                  <p style={{ margin: '0.5rem 0 0', color: '#666', fontSize: '0.95rem' }}>Search, filter and manage products on a mobile-friendly list.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('createProduct')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#6f0022', color: '#fff', border: 'none', padding: '0.85rem 1.2rem', borderRadius: 12, fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  <FiPlus size={18} />
                  Add Product
                </button>
              </div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.95rem 1rem', background: '#fff', border: '1px solid #ddd', borderRadius: 16, boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)' }}>
                  <FiSearch size={18} color="#6f0022" />
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search products, category, karat..."
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1rem', color: '#2d3748' }}
                  />
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {chipFilters.map((chip) => {
                    const isActive =
                      (chip.type === 'category' && categoryFilter === chip.value) ||
                      (chip.type === 'status' && statusFilter === chip.value) ||
                      (chip.type === 'karat' && karatFilter === chip.value) ||
                      (chip.type === 'availability' && availabilityFilter === chip.value) ||
                      (chip.type === 'featured' && featuredFilter === 'featured');

                    return (
                      <button
                        key={`${chip.type}-${chip.value}`}
                        type="button"
                        onClick={() => toggleChipFilter(chip)}
                        style={{
                          padding: '0.55rem 0.9rem',
                          borderRadius: 999,
                          border: isActive ? '1px solid #6f0022' : '1px solid #ddd',
                          background: isActive ? '#6f0022' : '#fff',
                          color: isActive ? '#fff' : '#4a5568',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          boxShadow: isActive ? '0 6px 18px rgba(111, 0, 34, 0.15)' : 'none'
                        }}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && <p style={{ color: '#b42318', marginTop: '1rem' }}>{error}</p>}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                {filteredProducts.map((product) => (
                  <div
                    key={product._id}
                    style={{
                      background: '#fff',
                      borderRadius: '20px',
                      padding: '1.25rem',
                      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <img
                        src={product.image || '/assets/placeholder-product.jpg'}
                        alt={product.name}
                        style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 16, border: '1px solid #eee', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h4 style={{ margin: 0, color: '#1f2937', fontSize: '1.1rem', fontWeight: 700 }}>{product.name}</h4>
                        <p style={{ margin: '0.35rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                          {product.category || 'Unknown'} / {product.productStatus || 'Draft'}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ padding: '0.5rem 0.75rem', borderRadius: 999, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontSize: '0.85rem' }}>
                        {product.kType || product.karat || 'No karat'}
                      </span>
                      <span style={{ padding: '0.5rem 0.75rem', borderRadius: 999, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontSize: '0.85rem' }}>
                        {product.weight ? `${product.weight}g` : 'Weight unknown'}
                      </span>
                      <span style={{ padding: '0.5rem 0.75rem', borderRadius: 999, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontSize: '0.85rem' }}>
                        {product.availabilityStatus || 'Status unknown'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <p style={{ margin: 0, color: '#6f0022', fontSize: '0.9rem' }}>Price</p>
                        <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>
                          LKR {Number(product.price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => startEditProduct(product)}
                          style={{ padding: '0.65rem 0.95rem', borderRadius: 12, border: '1px solid #d0c3a4', background: '#fff', color: '#6f0022', fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newStatus = product.productStatus === 'Active' ? 'Draft' : 'Active';
                            updateProductState(product, { productStatus: newStatus });
                          }}
                          style={{ padding: '0.65rem 0.95rem', borderRadius: 12, border: '1px solid #c8d6f9', background: '#fff', color: '#1f4b9a', fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          {product.productStatus === 'Active' ? 'Hide' : 'Show'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeProduct(product._id)}
                          style={{ padding: '0.65rem 0.95rem', borderRadius: 12, border: '1px solid #f1c0c0', background: '#fff', color: '#b42318', fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredProducts.length === 0 && <p style={{ margin: '1.5rem 0 0', color: '#999', textAlign: 'center' }}>No products match your search or filters.</p>}
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
