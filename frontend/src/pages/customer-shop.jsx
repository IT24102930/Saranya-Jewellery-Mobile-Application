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
  const [searchText, setSearchText] = useState('');
  const [addingProductId, setAddingProductId] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const isAuthenticated = Boolean(customer);
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  );

  const visibleProducts = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => {
      const fields = [product.name, product.category, product.karat];
      return fields.some((value) => String(value || '').toLowerCase().includes(term));
    });
  }, [products, searchText]);

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
  const activeFilterCount =
    (filters.category ? 1 : 0) + (filters.karat ? 1 : 0) + (filters.isAvailable ? 1 : 0);

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
          <a href={customer ? '/customer-dashboard' : `/customer-login?redirect=${returnTo}`}>
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

      <main className="shop-page">
        <section className="shop-hero">
          <h1 className="shop-hero-title">Fine Jewellery Collection</h1>
          <p className="shop-hero-subtitle">Discover handcrafted pieces curated for every moment.</p>
        </section>

        <div className="shop-toolbar">
          <div className="shop-search">
            <i className="fas fa-search shop-search-icon" />
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search rings, necklaces, karat..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
            />
            {searchText ? (
              <button
                type="button"
                className="shop-search-clear"
                onClick={() => setSearchText('')}
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}
          </div>

          <div className="shop-chips" role="tablist">
            <button
              type="button"
              className={`shop-chip ${!filters.category ? 'is-active' : ''}`}
              onClick={() => setFilters((prev) => ({ ...prev, category: '' }))}
            >
              All
            </button>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={`shop-chip ${filters.category === category ? 'is-active' : ''}`}
                onClick={() => setFilters((prev) => ({ ...prev, category }))}
              >
                {category}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="shop-filter-toggle"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            aria-expanded={showAdvancedFilters}
          >
            <i className="fas fa-sliders-h" /> Filters
            {activeFilterCount > 0 ? <span className="shop-filter-count">{activeFilterCount}</span> : null}
          </button>

          {showAdvancedFilters ? (
            <div className="shop-advanced-filters">
              <div className="shop-filter-row">
                <label htmlFor="karatFilter">Karat</label>
                <select
                  id="karatFilter"
                  value={filters.karat}
                  onChange={(e) => setFilters((prev) => ({ ...prev, karat: e.target.value }))}
                >
                  <option value="">All Types</option>
                  {KARATS.map((karat) => (
                    <option key={karat} value={karat}>{karat}</option>
                  ))}
                </select>
              </div>
              <div className="shop-filter-row">
                <label htmlFor="availabilityFilter">Availability</label>
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
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  className="shop-clear-filters"
                  onClick={() => setFilters({ category: '', karat: '', isAvailable: '' })}
                >
                  Clear all filters
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="shop-result-meta">
          {loadingProducts ? 'Loading…' : `${visibleProducts.length} ${visibleProducts.length === 1 ? 'item' : 'items'}`}
        </div>

        <section className="shop-grid">
          {loadingProducts ? (
            <div className="shop-empty">Loading products...</div>
          ) : null}

          {!loadingProducts && visibleProducts.length === 0 ? (
            <div className="shop-empty">No products match your search.</div>
          ) : null}

          {!loadingProducts
            ? visibleProducts.map((product) => {
                const summary = reviewSummaryByProduct[product._id] || { avgRating: 0, totalReviews: 0 };
                const hasReviews = Number(summary.totalReviews || 0) > 0;
                const isAdding = addingProductId === product._id;

                return (
                  <article
                    key={product._id}
                    className="shop-card"
                    onClick={() => {
                      window.location.href = `/customer-product?id=${encodeURIComponent(product._id)}`;
                    }}
                  >
                    <div className="shop-card-image-wrap">
                      <img
                        src={product.imageUrl || '/SaranyaLOGO.jpg'}
                        alt={product.name}
                        className="shop-card-image"
                        loading="lazy"
                      />
                      <span className={`shop-stock-badge ${product.isAvailable ? 'is-in-stock' : 'is-out-stock'}`}>
                        {product.isAvailable ? 'In Stock' : 'Out'}
                      </span>
                    </div>

                    <div className="shop-card-body">
                      <h3 className="shop-card-title">{product.name}</h3>
                      <p className="shop-card-meta">
                        {product.category}{product.karat ? ` · ${product.karat}` : ''}
                      </p>

                      <div className="shop-card-rating">
                        <span className="shop-card-stars">{renderStars(summary.avgRating)}</span>
                        <span className="shop-card-rating-text">
                          {hasReviews ? `${Number(summary.avgRating || 0).toFixed(1)} (${summary.totalReviews})` : 'New'}
                        </span>
                      </div>

                      <div className="shop-card-price">Rs. {product.price?.toLocaleString() || 'N/A'}</div>

                      <button
                        type="button"
                        className="shop-add-btn"
                        disabled={!product.isAvailable || isAdding}
                        onClick={(event) => {
                          event.stopPropagation();
                          addToCart(product);
                        }}
                      >
                        <i className="fas fa-cart-plus" />
                        <span>{isAdding ? 'Adding…' : product.isAvailable ? 'Add' : 'Sold out'}</span>
                      </button>
                    </div>
                  </article>
                );
              })
            : null}
        </section>
      </main>
    </>
  );
}
