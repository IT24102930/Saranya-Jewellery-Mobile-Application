import { useEffect, useMemo, useState } from 'react';
import authManager from '../auth.js';
import StaffDashboardLayout from '../components/StaffDashboardLayout.jsx';

const DASHBOARD_LINKS = [
  { href: '/product-management-dashboard', label: 'Products' },
  { href: '/inventory-dashboard', label: 'Inventory' },
  { href: '/admin-dashboard', label: 'Admin' }
];

const emptyForm = {
  stockProductId: '',
  name: '',
  description: '',
  image: '/assets/placeholder-product.jpg',
  category: 'Ring',
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
  const [searchText, setSearchText] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const activeProducts = useMemo(
    () => products.filter((item) => item.productStatus === 'Active').length,
    [products]
  );

  const featuredProducts = useMemo(
    () => products.filter((item) => Boolean(item.featured)).length,
    [products]
  );

  const filteredProducts = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return products;
    return products.filter((item) => {
      const name = item.name || '';
      const category = item.category || '';
      const status = item.productStatus || '';
      return [name, category, status].some((value) => value.toLowerCase().includes(term));
    });
  }, [products, searchText]);

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
    setIsSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        stockProductId: form.stockProductId || undefined,
        featured: Boolean(form.featured)
      };
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
      featured: Boolean(product.featured)
    });
    setError('');
    setIsProductModalOpen(true);
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

  return (
    <StaffDashboardLayout
      title="Product Management Dashboard"
      staff={staffUser}
      onLogout={() => authManager.logout()}
      links={DASHBOARD_LINKS}
    >
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
        <div style={{ border: '1px solid #eee', borderRadius: 12, padding: '0.85rem' }}>
          <p style={{ margin: 0, color: '#666' }}>Total Products</p>
          <h2 style={{ margin: '0.35rem 0 0', color: '#6f0022' }}>{products.length}</h2>
        </div>
        <div style={{ border: '1px solid #eee', borderRadius: 12, padding: '0.85rem' }}>
          <p style={{ margin: 0, color: '#666' }}>Active Products</p>
          <h2 style={{ margin: '0.35rem 0 0', color: '#6f0022' }}>{activeProducts}</h2>
        </div>
        <div style={{ border: '1px solid #eee', borderRadius: 12, padding: '0.85rem' }}>
          <p style={{ margin: 0, color: '#666' }}>Draft Stock Options</p>
          <h2 style={{ margin: '0.35rem 0 0', color: '#6f0022' }}>{stockOptions.length}</h2>
        </div>
        <div style={{ border: '1px solid #eee', borderRadius: 12, padding: '0.85rem' }}>
          <p style={{ margin: 0, color: '#666' }}>Featured Products</p>
          <h2 style={{ margin: '0.35rem 0 0', color: '#6f0022' }}>{featuredProducts}</h2>
        </div>
      </section>

      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: '1rem', marginTop: '1rem', background: 'linear-gradient(180deg, #fff, #fdfaf6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '0.35rem', color: '#6f0022' }}>Create / Edit Product</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Open the popup window to create a new product or edit an existing one.</p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            style={{ background: '#6f0022', color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem 1rem', fontWeight: 600, cursor: 'pointer' }}
          >
            + Create Product
          </button>
        </div>
      </section>

      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: '1rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h3 style={{ marginTop: 0, marginBottom: 0, color: '#6f0022' }}>Product List</h3>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by name, category or status"
            style={{ padding: '0.55rem 0.7rem', border: '1px solid #ddd', borderRadius: 8, minWidth: 260 }}
          />
        </div>
        {error && <p style={{ color: '#b42318' }}>{error}</p>}
        <div style={{ marginTop: '0.8rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #efe5d0' }}>
                <th style={{ textAlign: 'left', padding: '0.65rem', color: '#fff' }}>Product</th>
                <th style={{ textAlign: 'left', padding: '0.65rem', color: '#fff' }}>Category</th>
                <th style={{ textAlign: 'left', padding: '0.65rem', color: '#fff' }}>Status</th>
                <th style={{ textAlign: 'right', padding: '0.65rem', color: '#fff' }}>Stock</th>
                <th style={{ textAlign: 'center', padding: '0.65rem', color: '#fff' }}>Featured</th>
                <th style={{ textAlign: 'center', padding: '0.65rem', color: '#fff' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <img
                        src={product.image || '/assets/placeholder-product.jpg'}
                        alt={product.name}
                        style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
                      />
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>{product.name}</p>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>{(product.description || '').slice(0, 70)}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.65rem', color: '#555' }}>{product.category || '-'}</td>
                  <td style={{ padding: '0.65rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.55rem',
                      borderRadius: 999,
                      background: product.productStatus === 'Active' ? '#e8f5e9' : '#fff5e5',
                      color: product.productStatus === 'Active' ? '#1b5e20' : '#8a5a00',
                      fontSize: '0.82rem',
                      fontWeight: 600
                    }}>
                      {product.productStatus || 'Draft'}
                    </span>
                    <div style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: '#666' }}>
                      {product.availabilityStatus || 'Out of Stock'}
                    </div>
                  </td>
                  <td style={{ padding: '0.65rem', textAlign: 'right', color: '#555' }}>{product.stockQuantity || 0}</td>
                  <td style={{ padding: '0.65rem', textAlign: 'center' }}>{product.featured ? 'Yes' : 'No'}</td>
                  <td style={{ padding: '0.65rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => startEditProduct(product)}
                        style={{ background: '#fff', border: '1px solid #d0c3a4', color: '#6f0022', borderRadius: 6, padding: '0.35rem 0.55rem' }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => updateProductState(product, { availabilityStatus: 'Out of Stock' })}
                        style={{ background: '#fff', border: '1px solid #f1d3a4', color: '#8a5a00', borderRadius: 6, padding: '0.35rem 0.55rem' }}
                      >
                        Out of Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => updateProductState(product, {
                          productStatus: product.productStatus === 'Active' ? 'Draft' : 'Active'
                        })}
                        style={{ background: '#fff', border: '1px solid #c8d6f9', color: '#1f4b9a', borderRadius: 6, padding: '0.35rem 0.55rem' }}
                      >
                        {product.productStatus === 'Active' ? 'Hide' : 'Unhide'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProduct(product._id)}
                        style={{ background: '#fff', border: '1px solid #f1c0c0', color: '#b42318', borderRadius: 6, padding: '0.35rem 0.55rem' }}
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
        {filteredProducts.length === 0 && <p style={{ margin: '0.8rem 0 0', color: '#666' }}>No products found.</p>}
      </section>

      {isProductModalOpen && (
        <div
          onClick={cancelEdit}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20, 14, 12, 0.52)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem'
          }}
        >
          <section
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(920px, 100%)',
              maxHeight: '90vh',
              overflow: 'auto',
              border: '1px solid #eee',
              borderRadius: 14,
              padding: '1rem',
              background: 'linear-gradient(180deg, #fff, #fdfaf6)',
              boxShadow: '0 22px 42px rgba(19, 13, 11, 0.24)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: '#6f0022' }}>
                {editingProductId ? 'Edit Product' : 'Create / Publish Product'}
              </h3>
              <button
                type="button"
                onClick={cancelEdit}
                style={{ background: '#fff', color: '#6f0022', border: '1px solid #d0c3a4', borderRadius: 8, padding: '0.45rem 0.75rem', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

            <form onSubmit={saveProduct} style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
                <select
                  value={form.stockProductId}
                  disabled={Boolean(editingProductId)}
                  onChange={(e) => setForm((prev) => ({ ...prev, stockProductId: e.target.value }))}
                  style={{ padding: '0.6rem', border: '1px solid #ddd', borderRadius: 8 }}
                >
                  <option value="">Create brand new product</option>
                  {stockOptions.map((item) => (
                    <option key={item._id} value={item._id}>{item.name} ({item.category}) - Qty {item.stockQuantity}</option>
                  ))}
                </select>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Product name"
                  style={{ padding: '0.6rem', border: '1px solid #ddd', borderRadius: 8 }}
                />
                <select
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  style={{ padding: '0.6rem', border: '1px solid #ddd', borderRadius: 8 }}
                >
                  <option>Ring</option>
                  <option>Necklace</option>
                  <option>Earrings</option>
                  <option>Bangles</option>
                  <option>Bracelet</option>
                  <option>Pendant</option>
                </select>
                <input
                  required
                  value={form.image}
                  onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                  placeholder="Image URL"
                  style={{ padding: '0.6rem', border: '1px solid #ddd', borderRadius: 8 }}
                />
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 0.6rem',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  background: '#fff',
                  cursor: isUploadingImage ? 'not-allowed' : 'pointer'
                }}>
                  <span style={{ color: '#6f0022', fontSize: '0.9rem', fontWeight: 600 }}>
                    {isUploadingImage ? 'Uploading image...' : 'Upload from device'}
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

              {form.image && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <img
                    src={form.image}
                    alt="Product preview"
                    style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', border: '1px solid #eee' }}
                  />
                  <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>{form.image}</p>
                </div>
              )}

              <textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description"
                style={{ padding: '0.6rem', border: '1px solid #ddd', borderRadius: 8, resize: 'vertical' }}
              />

              {error && <p style={{ margin: 0, color: '#b42318' }}>{error}</p>}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={form.featured} onChange={(e) => setForm((prev) => ({ ...prev, featured: e.target.checked }))} />
                  Featured Product
                </label>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    style={{ background: '#fff', color: '#6f0022', border: '1px solid #d0c3a4', borderRadius: 8, padding: '0.6rem 0.9rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{ background: '#6f0022', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 0.9rem' }}
                  >
                    {isSaving ? 'Saving...' : editingProductId ? 'Update Product' : 'Save Product'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </StaffDashboardLayout>
  );
}
