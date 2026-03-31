import { useEffect, useMemo, useState } from 'react';
import authManager from '../auth.js';

const CATEGORIES = ['Ring', 'Necklace', 'Bracelet', 'Earring', 'Pendant', 'Chain', 'Bangles', 'Anklet'];
const KARATS = ['18K', '22K', '24K'];

function renderStars(rating) {
  const value = Number(rating) || 0;
  return [1, 2, 3, 4, 5].map((star) => (star <= Math.round(value) ? '★' : '☆')).join('');
}

function getCurrentReturnPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export default function CustomerShopPage() {
  const [customer, setCustomer] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('saranyaCart') || '[]'));
  const [reviewSummaryByProduct, setReviewSummaryByProduct] = useState({});
  const [filters, setFilters] = useState({ category: '', karat: '', isAvailable: '' });
  const [addingProductId, setAddingProductId] = useState('');

  const isAuthenticated = Boolean(customer);
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  );

  useEffect(() => {
    document.title = 'Shop - Saranya Jewellery';
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const loggedInCustomer = await authManager.checkCustomerAuth({
        redirectOnFail: false,
        returnToCurrentPath: false
      });
      setCustomer(loggedInCustomer);
    }

    bootstrap();
  }, []);

  useEffect(() => {
    async function loadProducts() {
      setLoadingProducts(true);
      try {
        const params = new URLSearchParams();
        if (filters.category) params.set('category', filters.category);
        if (filters.karat) params.set('karat', filters.karat);
        if (filters.isAvailable) params.set('isAvailable', filters.isAvailable);

        const query = params.toString();
        const url = query ? `/api/products?${query}` : '/api/products';

        const response = await authManager.apiRequest(url);
        if (!response.ok) throw new Error('Failed to load products');

        const data = await response.json();
        setProducts(data);

        const productIds = data.map((product) => product?._id).filter(Boolean);
        if (!productIds.length) {
          setReviewSummaryByProduct({});
          return;
        }

        const summaryResponse = await authManager.apiRequest(
          `/api/reviews/summary?productIds=${encodeURIComponent(productIds.join(','))}`
        );

        if (!summaryResponse.ok) {
          setReviewSummaryByProduct({});
          return;
        }

        const summaryData = await summaryResponse.json();
        setReviewSummaryByProduct(summaryData.summary || {});
      } catch (error) {
        console.error('Error loading products:', error);
        setProducts([]);
        setReviewSummaryByProduct({});
      } finally {
        setLoadingProducts(false);
      }
    }

    loadProducts();
  }, [filters]);

  function redirectToCustomerLogin(returnTo) {
    authManager.redirectToLogin('customer', { returnTo });
  }

  function handleProtectedNavigate(event, targetPath) {
    if (isAuthenticated) return;

    event.preventDefault();
    redirectToCustomerLogin(targetPath || getCurrentReturnPath());
  }

  async function addToCart(product) {
    if (!isAuthenticated) {
      redirectToCustomerLogin(getCurrentReturnPath());
      return;
    }

    setAddingProductId(product._id);
    try {
      const nextCart = [...cart];
      const existingItem = nextCart.find((item) => item.productId === product._id);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        nextCart.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          category: product.category,
          karat: product.karat,
          quantity: 1
        });
      }

      localStorage.setItem('saranyaCart', JSON.stringify(nextCart));
      setCart(nextCart);
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add to cart');
    } finally {
      setAddingProductId('');
    }
  }

  function logout() {
    authManager.logout();
  }

  const currentPath = window.location.pathname;
  const returnTo = encodeURIComponent(getCurrentReturnPath());

  return (
    <>
      <div className="top-bar">
        <div>
          <i className="fas fa-phone" /> <a href="tel:+1234567890">Contact Us</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ color: 'var(--brand-gold-strong)' }}>{customer?.fullName || customer?.email || 'Guest'}</span>
          {customer ? <span>Loyalty: {customer.loyaltyPoints || 0} Points</span> : null}

          {!customer ? (
            <>
              <a
                href={`/customer-login?redirect=${returnTo}`}
                className="logout-btn"
                style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem', textDecoration: 'none' }}
              >
                Login
              </a>
              <a
                href={`/customer-register?redirect=${returnTo}`}
                className="logout-btn"
                style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem', textDecoration: 'none' }}
              >
                Register
              </a>
            </>
          ) : (
            <button
              type="button"
              className="logout-btn"
              onClick={logout}
              style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}
            >
              Logout
            </button>
          )}
        </div>
      </div>

      <header className="header">
        <div className="nav">
          <a href="/" className={currentPath === '/' ? 'active' : ''}>Home</a>
          <a href="/customer-shop" className={currentPath === '/customer-shop' ? 'active' : ''}>Shop</a>
          <a href="/customer-orders" onClick={(e) => handleProtectedNavigate(e, '/customer-orders')}>My Orders</a>
          <a href="/customer-loyalty" onClick={(e) => handleProtectedNavigate(e, '/customer-loyalty')}>Loyalty</a>
          <a href="/customer-support" onClick={(e) => handleProtectedNavigate(e, '/customer-support')}>Support</a>
        </div>

        <div className="logo">SARANYA JEWELLERY</div>

        <div className="header-icons">
          <i className="fas fa-search header-icon" />
          <a href={customer ? '/customer-dashboard?openProfile=true' : `/customer-login?redirect=${returnTo}`}>
            <i className="fas fa-user header-icon" />
          </a>
          <a
            href="/customer-cart"
            style={{ position: 'relative' }}
            onClick={(event) => handleProtectedNavigate(event, getCurrentReturnPath())}
          >
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
        <div className="container" style={{ paddingTop: '2rem' }}>
          <h1
            style={{
              textAlign: 'center',
              marginBottom: '2rem',
              fontFamily: "'Cormorant Garamond', serif",
              color: 'var(--brand-burgundy)'
            }}
          >
            Fine Jewellery Collection
          </h1>

          <div
            className="filter-container"
            style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <div>
              <label htmlFor="categoryFilter">Category:</label>
              <select
                id="categoryFilter"
                value={filters.category}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="karatFilter">Karat:</label>
              <select
                id="karatFilter"
                value={filters.karat}
                onChange={(e) => setFilters((prev) => ({ ...prev, karat: e.target.value }))}
              >
                <option value="">All Types</option>
                {KARATS.map((karat) => (
                  <option key={karat} value={karat}>
                    {karat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="availabilityFilter">Availability:</label>
              <select
                id="availabilityFilter"
                value={filters.isAvailable}
                onChange={(e) => setFilters((prev) => ({ ...prev, isAvailable: e.target.value }))}
              >
                <option value="">All</option>
                <option value="true">In Stock</option>
                <option value="false">Out of Stock</option>
              </select>
            </div>
          </div>

          <div className="category-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
            {loadingProducts ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#999' }}>Loading products...</div>
            ) : null}

            {!loadingProducts && products.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#999' }}>No products found</div>
            ) : null}

            {!loadingProducts
              ? products.map((product) => {
                  const summary = reviewSummaryByProduct[product._id] || { avgRating: 0, totalReviews: 0 };
                  const hasReviews = Number(summary.totalReviews || 0) > 0;

                  return (
                    <div
                      key={product._id}
                      className="category-card"
                      style={{
                        cursor: 'pointer',
                        padding: '1rem',
                        background: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'transform 0.3s'
                      }}
                      onClick={() => {
                        window.location.href = `/customer-product?id=${encodeURIComponent(product._id)}`;
                      }}
                    >
                      <img
                        src={product.imageUrl || '/SaranyaLOGO.jpg'}
                        alt={product.name}
                        style={{ width: '100%', height: '250px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                      <h3 style={{ margin: '1rem 0 0.5rem', color: 'var(--brand-burgundy)' }}>{product.name}</h3>
                      <p style={{ color: '#666', fontSize: '0.9rem', margin: '0.5rem 0' }}>
                        {product.category} - {product.karat}
                      </p>

                      {hasReviews ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: '0.35rem 0 0.5rem' }}>
                          <span style={{ color: '#e0bf63', fontSize: '0.95rem' }}>{renderStars(summary.avgRating)}</span>
                          <span style={{ fontSize: '0.82rem', color: '#666' }}>
                            {Number(summary.avgRating || 0).toFixed(1)} ({summary.totalReviews})
                          </span>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.82rem', color: '#999', margin: '0.35rem 0 0.5rem' }}>No reviews yet</p>
                      )}

                      <p style={{ color: 'var(--brand-gold-strong)', fontWeight: 600, fontSize: '1.1rem', margin: '0.5rem 0' }}>
                        Rs. {product.price?.toLocaleString() || 'N/A'}
                      </p>
                      <p style={{ color: '#666', fontSize: '0.85rem', margin: '0.25rem 0' }}>
                        Stock: {product.stockQuantity ?? 0}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                        <span style={{ fontSize: '0.85rem', color: product.isAvailable ? '#28a745' : '#dc3545' }}>
                          {product.isAvailable ? 'In Stock' : 'Out of Stock'}
                        </span>
                        {product.isAvailable ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              addToCart(product);
                            }}
                            disabled={addingProductId === product._id}
                            style={{
                              background: 'var(--brand-burgundy)',
                              color: 'white',
                              border: 'none',
                              padding: '0.5rem 1rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              opacity: addingProductId === product._id ? 0.7 : 1
                            }}
                          >
                            <i className="fas fa-cart-plus" /> {addingProductId === product._id ? 'Adding...' : 'Add to Cart'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              : null}
          </div>
        </div>
      </main>
    </>
  );
}
