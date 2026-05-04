import { useEffect, useMemo, useState } from 'react';
import authManager from '../auth.js';

function renderStars(rating) {
  const value = Number(rating) || 0;
  return [1, 2, 3, 4, 5].map((star) => (star <= value ? '★' : '☆')).join('');
}

function getProductIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id');
}

function getCurrentReturnPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export default function CustomerProductPage() {
  const [customer, setCustomer] = useState(null);
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ avgRating: 0, totalReviews: 0 });
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('saranyaCart') || '[]'));

  const isAuthenticated = Boolean(customer);
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  );

  useEffect(() => {
    async function bootstrap() {
      const productId = getProductIdFromUrl();
      if (!productId) {
        setLoading(false);
        return;
      }

      const loggedInCustomer = await authManager.checkCustomerAuth({
        redirectOnFail: false,
        returnToCurrentPath: false
      });
      setCustomer(loggedInCustomer);

      try {
        const productResponse = await authManager.apiRequest(`/api/products/${productId}`);
        if (!productResponse.ok) throw new Error('Failed to load product details');
        const productData = await productResponse.json();
        setProduct(productData);
        document.title = `${productData.name} - Saranya Jewellery`;

        const reviewResponse = await authManager.apiRequest(`/api/reviews/product/${productData._id}`);
        if (reviewResponse.ok) {
          const reviewData = await reviewResponse.json();
          setReviews(reviewData.reviews || []);
          setReviewSummary({
            avgRating: Number(reviewData.avgRating || 0),
            totalReviews: Number(reviewData.totalReviews || 0)
          });
        }

        const params = new URLSearchParams();
        if (productData.category) params.append('category', productData.category);
        const relatedResponse = await authManager.apiRequest(`/api/products?${params.toString()}`);
        if (relatedResponse.ok) {
          const relatedData = await relatedResponse.json();
          setRelatedProducts(relatedData.filter((item) => item._id !== productData._id).slice(0, 4));
        }
      } catch (error) {
        console.error('Error loading product page:', error);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  function updateHeaderForGuest() {
    const returnPath = encodeURIComponent(getCurrentReturnPath());
    return {
      loginHref: `/customer-login?redirect=${returnPath}`,
      registerHref: `/customer-register?redirect=${returnPath}`,
      userProfileHref: `/customer-login?redirect=${returnPath}`
    };
  }

  const guestLinks = updateHeaderForGuest();

  function handleProtectedNavigate(event, targetPath) {
    if (isAuthenticated) return;
    event.preventDefault();
    authManager.redirectToLogin('customer', { returnTo: targetPath || getCurrentReturnPath() });
  }

  async function addToCart() {
    if (!product?._id) return;

    if (!isAuthenticated) {
      authManager.redirectToLogin('customer', { returnTo: getCurrentReturnPath() });
      return;
    }

    const nextCart = [...cart];
    const existingItem = nextCart.find((item) => item.productId === product._id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      nextCart.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl || product.image,
        category: product.category,
        karat: product.karat || product.kType,
        quantity: 1
      });
    }

    localStorage.setItem('saranyaCart', JSON.stringify(nextCart));
    setCart(nextCart);
    alert('Added to cart');
  }

  function logout() {
    authManager.logout();
  }

  return (
    <>
      <div className="top-bar">
        <div><i className="fas fa-phone" /> <a href="tel:+1234567890">Contact Us</a></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ color: 'var(--brand-gold-strong)' }}>{customer?.fullName || customer?.email || 'Guest'}</span>
          {customer ? <span>Loyalty: {customer.loyaltyPoints || 0} Points</span> : null}
          {!customer ? (
            <>
              <a href={guestLinks.loginHref} className="logout-btn" style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem', textDecoration: 'none' }}>Login</a>
              <a href={guestLinks.registerHref} className="logout-btn" style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem', textDecoration: 'none' }}>Register</a>
            </>
          ) : (
            <button type="button" className="logout-btn" onClick={logout} style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}>Logout</button>
          )}
        </div>
      </div>

      <header className="header">
        <div className="nav">
          <a href="/">Home</a>
          <a href="/customer-shop" className="active">Shop</a>
          <a href="/customer-orders" data-requires-auth="true" onClick={(event) => handleProtectedNavigate(event, '/customer-orders')}>My Orders</a>
          <a href="/customer-loyalty" data-requires-auth="true" onClick={(event) => handleProtectedNavigate(event, '/customer-loyalty')}>Loyalty</a>
          <a href="/customer-support" data-requires-auth="true" onClick={(event) => handleProtectedNavigate(event, '/customer-support')}>Support</a>
        </div>

        <div className="logo">SARANYA JEWELLERY</div>

        <div className="header-icons">
          <i className="fas fa-search header-icon" />
          <a href={customer ? '/customer-dashboard' : guestLinks.userProfileHref}><i className="fas fa-user header-icon" /></a>
          <a href="/customer-cart" style={{ position: 'relative' }} onClick={(event) => handleProtectedNavigate(event, getCurrentReturnPath())}>
            <i className="fas fa-shopping-cart header-icon" />
            {cartCount > 0 ? (
              <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--brand-gold-strong)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem' }}>
                {cartCount}
              </span>
            ) : null}
          </a>
        </div>
      </header>

      <main>
        <div className="container" style={{ padding: '2rem 1rem 3rem', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <a href="/customer-shop" style={{ color: 'var(--brand-burgundy)', textDecoration: 'none', fontWeight: 600 }}>
              <i className="fas fa-arrow-left" /> Back to Shop
            </a>
          </div>

          <section style={{ background: 'white', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: '1.5rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading product details...</div>
            ) : null}

            {!loading && !product ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Unable to load product details</div>
            ) : null}

            {!loading && product ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                <div>
                  <img src={product.imageUrl || product.image || '/SaranyaLOGO.jpg'} alt={product.name} style={{ width: '100%', borderRadius: '10px', objectFit: 'cover', maxHeight: '500px' }} />
                </div>
                <div>
                  <h1 style={{ margin: '0 0 0.75rem', color: 'var(--brand-burgundy)', fontFamily: "'Cormorant Garamond', serif", fontSize: '2.2rem' }}>{product.name}</h1>
                  <p style={{ color: 'var(--brand-gold-strong)', fontWeight: 700, fontSize: '1.8rem', margin: '0.5rem 0 1.2rem' }}>Rs. {Number(product.price || 0).toLocaleString()}</p>

                  <div style={{ display: 'grid', gap: '0.55rem', marginBottom: '1.2rem' }}>
                    <p style={{ margin: 0 }}><strong>Category:</strong> {product.category || 'N/A'}</p>
                    <p style={{ margin: 0 }}><strong>Karat:</strong> {product.karat || product.kType || 'N/A'}</p>
                    <p style={{ margin: 0 }}><strong>Weight:</strong> {product.weight || 0}g</p>
                    <p style={{ margin: 0 }}><strong>SKU:</strong> {product.sku || 'N/A'}</p>
                    <p style={{ margin: 0 }}><strong>Stock:</strong> {product.stockQuantity ?? 0}</p>
                    <p style={{ margin: 0 }}><strong>Tax:</strong> {Number(product.taxPercentage ?? 0).toFixed(1)}%</p>
                    <p style={{ margin: 0 }}>
                      <strong>Availability:</strong>{' '}
                      <span style={{ color: product.isAvailable ? '#28a745' : '#dc3545' }}>
                        {product.isAvailable ? 'In Stock' : product.availabilityStatus || 'Out of Stock'}
                      </span>
                    </p>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '0.4rem', color: 'var(--brand-burgundy)' }}>Description</h3>
                    <p style={{ margin: 0, color: '#666', lineHeight: 1.7 }}>{product.description || 'No description available.'}</p>
                  </div>

                  {product.isAvailable ? (
                    <button type="button" onClick={addToCart} style={{ background: 'var(--brand-burgundy)', color: 'white', border: 'none', padding: '0.95rem 1.4rem', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', fontWeight: 600 }}>
                      <i className="fas fa-cart-plus" /> Add to Cart
                    </button>
                  ) : (
                    <button type="button" disabled style={{ background: '#bbb', color: '#fff', border: 'none', padding: '0.95rem 1.4rem', borderRadius: '6px', fontSize: '1rem', fontWeight: 600, cursor: 'not-allowed' }}>
                      Currently Unavailable
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </section>

          <section style={{ marginTop: '2rem', background: 'white', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem', color: 'var(--brand-burgundy)', fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem' }}>Customer Reviews</h2>

            {reviewSummary.totalReviews > 0 ? (
              <div style={{ padding: '0.8rem 1rem', border: '1px solid #eee', borderRadius: '8px', background: '#faf7ee', marginBottom: '1rem' }}>
                <strong style={{ color: 'var(--brand-burgundy)' }}>{reviewSummary.avgRating.toFixed(1)} / 5</strong>
                <span style={{ marginLeft: '0.4rem', color: '#e0bf63' }}>{renderStars(Math.round(reviewSummary.avgRating))}</span>
                <span style={{ color: '#666', marginLeft: '0.6rem' }}>({reviewSummary.totalReviews} review{reviewSummary.totalReviews > 1 ? 's' : ''})</span>
              </div>
            ) : null}

            <div style={{ display: 'grid', gap: '0.85rem' }}>
              {!loading && reviews.length === 0 ? <div style={{ textAlign: 'center', color: '#999' }}>No reviews yet for this product.</div> : null}
              {reviews.map((review) => (
                <div key={review._id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.7rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <strong>{review.customerName || 'Customer'}</strong>
                    <small style={{ color: '#888' }}>{new Date(review.createdAt).toLocaleDateString()}</small>
                  </div>
                  <div style={{ marginBottom: '0.4rem', color: '#e0bf63' }}>{renderStars(review.rating)}</div>
                  <p style={{ margin: 0, color: '#555', lineHeight: 1.6 }}>{review.comment || 'No comment provided.'}</p>
                  {review.staffReply?.reply ? (
                    <div style={{ marginTop: '0.7rem', background: '#f8f9fa', borderLeft: '3px solid #6f0022', padding: '0.65rem', borderRadius: '6px' }}>
                      <p style={{ margin: '0 0 0.3rem', fontWeight: 600, color: '#6f0022' }}>Customer Care Reply</p>
                      <p style={{ margin: 0, color: '#555' }}>{review.staffReply.reply}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginTop: '3rem' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--brand-burgundy)', fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem' }}>Related Products</h2>
            <div className="category-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.2rem' }}>
              {!loading && relatedProducts.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#999' }}>No related products found</div>
              ) : null}

              {relatedProducts.map((related) => (
                <div
                  key={related._id}
                  className="category-card"
                  style={{ cursor: 'pointer', padding: '1rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  onClick={() => {
                    window.location.href = `/customer-product?id=${encodeURIComponent(related._id)}`;
                  }}
                >
                  <img src={related.imageUrl || related.image || '/SaranyaLOGO.jpg'} alt={related.name} style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '6px' }} />
                  <h3 style={{ margin: '0.9rem 0 0.3rem', color: 'var(--brand-burgundy)' }}>{related.name}</h3>
                  <p style={{ margin: '0.35rem 0', color: '#666', fontSize: '0.9rem' }}>{related.category} - {related.karat || related.kType || 'N/A'}</p>
                  <p style={{ margin: '0.35rem 0', color: 'var(--brand-gold-strong)', fontWeight: 600 }}>Rs. {Number(related.price || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>ABOUT SARANYA</h3>
            <ul>
              <li><a href="/#story">Our Story</a></li>
              <li><a href="/#education">Education</a></li>
              <li><a href="/#faq">FAQ</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>WHY SARANYA?</h3>
            <ul>
              <li><a href="/#quality">Quality Guarantee</a></li>
              <li><a href="/#warranty">Lifetime Warranty</a></li>
              <li><a href="/#certification">Certified Jewellery</a></li>
              <li><a href="/#shipping">Free Shipping</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>SERVICES</h3>
            <ul>
              <li><a href="/#custom">Custom Design</a></li>
              <li><a href="/#resize">Free Ring Resize</a></li>
              <li><a href="/#gift">Gift Services</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>POLICIES</h3>
            <ul>
              <li><a href="/#policies">Our Policies</a></li>
              <li><a href="/#privacy">Privacy Policy</a></li>
              <li><a href="/#terms">Terms & Conditions</a></li>
              <li><a href="/#returns">Return Policy</a></li>
              <li><a href="/#payment">Payment Methods</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>CONNECT WITH US</h3>
            <div className="social-links">
              <a href="#" className="social-icon"><i className="fab fa-facebook-f" /></a>
              <a href="#" className="social-icon"><i className="fab fa-instagram" /></a>
              <a href="#" className="social-icon"><i className="fab fa-twitter" /></a>
              <a href="#" className="social-icon"><i className="fab fa-pinterest" /></a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Saranya Jewellery. All Rights Reserved.</p>
        </div>
      </footer>
    </>
  );
}
