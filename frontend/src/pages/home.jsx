import { useEffect, useMemo, useState } from 'react';

const CATEGORIES = ['Ring', 'Necklace', 'Bracelet', 'Earring', 'Pendant', 'Chain', 'Bangles', 'Anklet', 'Other'];
const KARATS = ['18K', '22K', '24K'];
const AVAILABILITY = ['In Stock', 'Out of Stock', 'Pre-Order'];

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userIconHref, setUserIconHref] = useState('/customer-login');
  const [filters, setFilters] = useState({ category: '', karat: '', availability: '', featured: false });
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('saranyaCart') || '[]'));

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  );

  useEffect(() => {
    document.title = 'Saranya Jewellery - Elegance Redefined';
  }, []);

  useEffect(() => {
    async function checkLoginStatus() {
      try {
        const response = await fetch('/api/customer/me', { credentials: 'same-origin' });
        if (!response.ok) return;

        const data = await response.json();
        if (data.customer) {
          setUserIconHref('/customer-dashboard');
        }
      } catch (_error) {
        // Guest users keep default icon target.
      }
    }

    checkLoginStatus();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [filters]);

  async function loadProducts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.karat) params.append('kType', filters.karat);
      if (filters.availability) params.append('availabilityStatus', filters.availability);
      if (filters.featured) params.append('featured', 'true');

      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load products');

      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  async function ensureCustomerLoggedIn() {
    try {
      const response = await fetch('/api/customer/me', { credentials: 'same-origin' });
      if (response.ok) return true;
    } catch (error) {
      console.error('Auth check failed:', error);
    }

    const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash || '#collections'}`;
    window.location.href = `/customer-login?redirect=${encodeURIComponent(returnPath)}`;
    return false;
  }

  async function addToCart(product) {
    if (product.availabilityStatus !== 'In Stock') {
      alert('This product is currently not in stock.');
      return;
    }

    const isAuthenticated = await ensureCustomerLoggedIn();
    if (!isAuthenticated) return;

    const nextCart = [...cart];
    const existing = nextCart.find((item) => item.id === product._id);

    if (existing) {
      existing.quantity += 1;
    } else {
      nextCart.push({
        id: product._id,
        productId: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        imageUrl: product.imageUrl || product.image,
        category: product.category,
        karat: product.karat || product.kType,
        kType: product.kType,
        weight: product.weight,
        quantity: 1
      });
    }

    localStorage.setItem('saranyaCart', JSON.stringify(nextCart));
    setCart(nextCart);
    alert(`${product.name} added to cart`);
  }

  return (
    <>
      <div className="top-bar">
        <div><i className="fas fa-phone" /> <a href="tel:+1234567890">Contact Us</a></div>
        <div />
      </div>

      <header className="header">
        <div className="nav">
          <a href="#home">Home</a>
          <a href="#collections">Shop</a>
          <a href="#rings">Rings</a>
          <a href="#necklaces">Necklaces</a>
        </div>

        <div className="logo">SARANYA JEWELLERY</div>

        <div className="header-icons">
          <i className="fas fa-search header-icon" />
          <a href={userIconHref}><i className="fas fa-user header-icon" /></a>
          <a href="/customer-cart" style={{ position: 'relative' }}>
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
        <section className="hero">
          <div className="hero-content">
            <h1>Customised Diamond & Gemstone Fine Jewellery</h1>
            <p>
              Mark your Joyous Moments with gifts that last a lifetime. Make it perfect with Saranya no matter if it
              is a diamond necklace, tennis bracelet, diamond earring, blue sapphire ring, emerald ring or diamond
              bracelet.
            </p>
            <a href="#collections" className="btn">Shop Now</a>
          </div>
          <div className="hero-image">
            <img src="SaranyaLOGO.jpg" alt="Elegant Jewellery Collection" />
          </div>
        </section>

        <section className="category-showcase">
          <h2 className="section-title">Shop By Category (Fine Jewellery)</h2>
          <div className="category-grid">
            {['Ring', 'Earring', 'Necklace', 'Bracelet'].map((category) => (
              <div
                key={category}
                className="category-card"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, category }));
                  document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <img src="SaranyaLOGO.jpg" alt={category} />
                <h3>{category.toUpperCase()}</h3>
              </div>
            ))}
          </div>
        </section>

        <section className="category-showcase" id="collections">
          <h2 className="section-title">Popular Fine Jewellery</h2>

          <div className="filter-container">
            <label htmlFor="categoryFilter">Category:</label>
            <select
              id="categoryFilter"
              value={filters.category}
              onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <label htmlFor="kTypeFilter">Karat:</label>
            <select
              id="kTypeFilter"
              value={filters.karat}
              onChange={(event) => setFilters((prev) => ({ ...prev, karat: event.target.value }))}
            >
              <option value="">All Types</option>
              {KARATS.map((karat) => (
                <option key={karat} value={karat}>{karat}</option>
              ))}
            </select>

            <label htmlFor="availabilityFilter">Availability:</label>
            <select
              id="availabilityFilter"
              value={filters.availability}
              onChange={(event) => setFilters((prev) => ({ ...prev, availability: event.target.value }))}
            >
              <option value="">All</option>
              {AVAILABILITY.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <label>
              <input
                type="checkbox"
                checked={filters.featured}
                onChange={(event) => setFilters((prev) => ({ ...prev, featured: event.target.checked }))}
              />
              Featured Only
            </label>
          </div>

          {loading ? <div className="loading">Loading our beautiful collection...</div> : null}
          {!loading ? (
            <div className="grid-container" id="productsGrid">
              {products.length === 0 ? (
                <div className="no-products">No products found. Check back soon for new arrivals!</div>
              ) : (
                products.map((product) => {
                  const statusBadgeClass =
                    product.availabilityStatus === 'In Stock'
                      ? 'badge-in-stock'
                      : product.availabilityStatus === 'Out of Stock'
                        ? 'badge-out-stock'
                        : 'badge-pre-order';

                  return (
                    <div key={product._id} className="product-card">
                      <img
                        src={product.image || product.imageUrl || '/SaranyaLOGO.jpg'}
                        alt={product.name}
                        className="product-image"
                      />
                      <div className="product-content">
                        <div className="product-name">{product.name}</div>
                        <div className="product-price">Rs. {Number(product.price || 0).toLocaleString()}</div>
                        <div className="product-details">{product.category} | {product.kType || product.karat} | {product.weight}g</div>
                        <div>
                          <span className={`product-badge ${statusBadgeClass}`}>{product.availabilityStatus}</span>
                          {product.featured ? <span className="product-badge badge-featured">Featured</span> : null}
                        </div>
                        <button
                          type="button"
                          className="home-add-cart-btn"
                          disabled={product.availabilityStatus !== 'In Stock'}
                          onClick={() => addToCart(product)}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
        </section>

        <section className="featured-sections">
          <div className="featured-grid">
            <div className="featured-item">
              <img src="SaranyaLOGO.jpg" alt="Anniversary Gift Guide" />
              <h3>Anniversary Gift Guide</h3>
            </div>
            <div className="featured-item">
              <img src="SaranyaLOGO.jpg" alt="Personalized Jewellery" />
              <h3>Personalized Jewellery</h3>
            </div>
            <div className="featured-item">
              <img src="SaranyaLOGO.jpg" alt="Gemstone Jewellery" />
              <h3>Gemstone Jewellery Below Rs. 5,000</h3>
            </div>
          </div>
        </section>

        <section className="category-showcase" id="about">
          <h2 className="section-title">Years Of Craftsmanship</h2>
          <p className="section-subtitle">
            We are passionate about the quality of our fine jewellery. With decades of experience, our jewellery
            craftsmen dedicate themselves to perfecting their jewellery crafting skills. Each unique piece is created
            by order with exceptional finishing, which is the hallmark of our brand.
          </p>
          <div className="text-center">
            <a href="#collections" className="btn">Shop Jewellery</a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>ABOUT SARANYA</h3>
            <ul>
              <li><a href="#story">Our Story</a></li>
              <li><a href="#education">Education</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>WHY SARANYA?</h3>
            <ul>
              <li><a href="#quality">Quality Guarantee</a></li>
              <li><a href="#warranty">Lifetime Warranty</a></li>
              <li><a href="#certification">Certified Jewellery</a></li>
              <li><a href="#shipping">Free Shipping</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>SERVICES</h3>
            <ul>
              <li><a href="#custom">Custom Design</a></li>
              <li><a href="#resize">Free Ring Resize</a></li>
              <li><a href="#gift">Gift Services</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>POLICIES</h3>
            <ul>
              <li><a href="#policies">Our Policies</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms & Conditions</a></li>
              <li><a href="#returns">Return Policy</a></li>
              <li><a href="#payment">Payment Methods</a></li>
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
