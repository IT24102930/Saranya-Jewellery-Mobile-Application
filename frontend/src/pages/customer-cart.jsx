import { useEffect, useMemo, useState } from 'react';
import authManager from '../auth.js';

export default function CustomerCartPage() {
  const [customer, setCustomer] = useState(null);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('saranyaCart') || '[]'));
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  useEffect(() => {
    document.title = 'Shopping Cart - Saranya Jewellery';

    async function bootstrap() {
      const loggedInCustomer = await authManager.checkCustomerAuth();
      if (!loggedInCustomer) return;

      setCustomer(loggedInCustomer);
      if (loggedInCustomer.phone) {
        setPhoneNumber(loggedInCustomer.phone);
      }
    }

    bootstrap();
  }, []);

  const itemCount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  );
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [cart]
  );
  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
  const tax = Math.round(discountedSubtotal * 0.03);
  const total = discountedSubtotal + tax;

  function persistCart(nextCart) {
    setCart(nextCart);
    localStorage.setItem('saranyaCart', JSON.stringify(nextCart));
  }

  function updateQuantity(index, change) {
    const nextCart = [...cart];
    nextCart[index].quantity += change;
    if (nextCart[index].quantity <= 0) {
      nextCart.splice(index, 1);
    }
    persistCart(nextCart);
  }

  function removeFromCart(index) {
    if (!window.confirm('Remove this item from cart?')) return;
    const nextCart = [...cart];
    nextCart.splice(index, 1);
    persistCart(nextCart);
  }

  async function applyCoupon() {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError('');

    try {
      const response = await authManager.apiRequest('/api/loyalty/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: couponCode.toUpperCase(),
          customerId: customer?._id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setCouponError(data.message || 'Invalid coupon code');
        return;
      }

      const sub = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
      let discountAmount = 0;

      if (data.coupon.discountType === 'percentage') {
        discountAmount = Math.round(sub * (data.coupon.discountValue / 100));
      } else {
        discountAmount = data.coupon.discountValue;
      }

      setAppliedCoupon({
        code: data.coupon.code,
        discountType: data.coupon.discountType,
        discountValue: data.coupon.discountValue,
        discountAmount: Math.min(discountAmount, sub),
        message: data.coupon.message || 'Coupon applied successfully!'
      });
      setCouponError('');
    } catch (error) {
      setCouponError(error.message || 'Error validating coupon');
    } finally {
      setIsValidatingCoupon(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  }

  function openCheckout() {
    if (!cart.length) {
      alert('Your cart is empty');
      return;
    }
    setIsCheckoutOpen(true);
  }

  function handleReceiptChange(file) {
    setReceiptFile(file || null);
    if (!file) {
      setReceiptPreview('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptPreview(String(event.target?.result || ''));
    };
    reader.readAsDataURL(file);
  }

  async function handlePlaceOrder(event) {
    event.preventDefault();
    if (!cart.length) {
      alert('Your cart is empty. Please add items first.');
      return;
    }

    if (!receiptFile) {
      alert('Payment receipt is required. Please upload a screenshot of your bank transfer.');
      return;
    }

    for (const item of cart) {
      if (!item.productId || !item.name || !item.price) {
        alert('Invalid cart data. Please clear your cart and add items again.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let receiptPath = null;
      if (receiptFile) {
        console.log('Uploading receipt...');
        const formData = new FormData();
        formData.append('receipt', receiptFile);

        const uploadResponse = await authManager.apiRequest('/api/upload/receipt', {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) {
          let errorMessage = 'Failed to upload receipt';
          try {
            const payload = await uploadResponse.json();
            errorMessage = payload.message || errorMessage;
          } catch (_error) {
            errorMessage = 'Failed to upload receipt (server error)';
          }
          throw new Error(errorMessage);
        }

        const uploadData = await uploadResponse.json();
        receiptPath = uploadData.imagePath;
        console.log('Receipt uploaded:', receiptPath);
      }

      console.log('Creating order with data:', { itemCount: cart.length, total, phoneNumber });

      const orderData = {
        items: cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl || null
        })),
        phoneNumber: phoneNumber.trim(),
        paymentReceipt: receiptPath,
        orderNotes: orderNotes.trim(),
        subtotal,
        tax,
        total,
        couponCode: appliedCoupon?.code || null,
        couponDiscount: couponDiscount || 0
      };

      const response = await authManager.apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        let errorMessage = 'Failed to place order';
        try {
          const payload = await response.json();
          errorMessage = payload.message || errorMessage;
        } catch (_error) {
          errorMessage = `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const order = await response.json();
      persistCart([]);
      alert(`Order placed successfully! Order #${order.orderNumber}\nYou will be notified when your order is ready for collection.`);
      window.location.href = '/customer-orders';
    } catch (error) {
      console.error('Error placing order:', error);
      const errorMsg = error?.message || 'Unknown error occurred';
      alert(`Failed to place order: ${errorMsg}`);
      setIsSubmitting(false);
    }
  }

  function logout() {
    authManager.logout();
  }

  return (
    <>
      <div className="top-bar">
        <div><i className="fas fa-phone" /> <a href="tel:+1234567890">Contact Us</a></div>
        <div>
          <span style={{ marginRight: '1rem', color: 'var(--brand-gold-strong)' }}>{customer?.fullName || customer?.email || 'Loading...'}</span>
          <span style={{ marginRight: '1rem' }}>Loyalty: {customer?.loyaltyPoints || 0} Points</span>
          <button type="button" className="logout-btn" onClick={logout} style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}>Logout</button>
        </div>
      </div>

      <header className="header">
        <div className="nav">
          <a href="/">Home</a>
          <a href="/customer-shop">Shop</a>
          <a href="/customer-orders">My Orders</a>
          <a href="/customer-loyalty">Loyalty</a>
          <a href="/customer-support">Support</a>
        </div>
        <div className="logo">SARANYA JEWELLERY</div>
        <div className="header-icons">
          <i className="fas fa-search header-icon" />
          <a href="/customer-dashboard"><i className="fas fa-user header-icon" /></a>
          <a href="/customer-cart" style={{ position: 'relative' }}>
            <i className="fas fa-shopping-cart header-icon" />
            {itemCount > 0 ? (
              <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--brand-gold-strong)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem' }}>
                {itemCount}
              </span>
            ) : null}
          </a>
        </div>
      </header>

      <main className="cart-page">
        <header className="cart-hero">
          <h1 className="cart-title">Shopping Cart</h1>
          <p className="cart-subtitle">{itemCount} {itemCount === 1 ? 'item' : 'items'} ready for checkout</p>
        </header>

        <div className="cart-layout">
          <section className="cart-items">
            {!cart.length ? (
              <div className="cart-empty">
                <i className="fas fa-shopping-cart cart-empty-icon" />
                <h2>Your cart is empty</h2>
                <p>Browse our collection and start filling your cart.</p>
                <a href="/customer-shop" className="cart-empty-cta">Browse Products</a>
              </div>
            ) : (
              cart.map((item, index) => (
                <article key={`${item.productId}-${index}`} className="cart-item">
                  <img
                    src={item.imageUrl || '/SaranyaLOGO.jpg'}
                    alt={item.name}
                    className="cart-item-image"
                    loading="lazy"
                  />

                  <div className="cart-item-body">
                    <div className="cart-item-info">
                      <h3 className="cart-item-name">{item.name}</h3>
                      <p className="cart-item-meta">{item.category}{item.karat ? ` · ${item.karat}` : ''}</p>
                      <p className="cart-item-unit">Rs. {Number(item.price || 0).toLocaleString()}</p>
                    </div>

                    <div className="cart-item-actions">
                      <div className="cart-qty">
                        <button type="button" className="cart-qty-btn" onClick={() => updateQuantity(index, -1)} aria-label="Decrease quantity">−</button>
                        <span className="cart-qty-value">{item.quantity}</span>
                        <button type="button" className="cart-qty-btn" onClick={() => updateQuantity(index, 1)} aria-label="Increase quantity">+</button>
                      </div>
                      <button type="button" className="cart-remove-btn" onClick={() => removeFromCart(index)}>
                        <i className="fas fa-trash" />
                        <span>Remove</span>
                      </button>
                    </div>

                    <div className="cart-item-total">
                      Rs. {Number(item.price * item.quantity || 0).toLocaleString()}
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>

          <aside className="cart-summary">
            <h2 className="cart-summary-title">Order Summary</h2>

            <div className="cart-summary-rows">
              <div className="cart-summary-row">
                <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                <span>Rs. {subtotal.toLocaleString()}</span>
              </div>
              {appliedCoupon ? (
                <div className="cart-summary-row cart-summary-discount">
                  <span>Discount ({appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}%` : 'Fixed'})</span>
                  <span>−Rs. {appliedCoupon.discountAmount.toLocaleString()}</span>
                </div>
              ) : null}
              <div className="cart-summary-row">
                <span>Tax (3%)</span>
                <span>Rs. {tax.toLocaleString()}</span>
              </div>
            </div>

            <div className="cart-summary-total">
              <span>Total</span>
              <span>Rs. {total.toLocaleString()}</span>
            </div>

            <div className="cart-coupon">
              <h4>Have a Coupon Code?</h4>
              <p className={`cart-coupon-info ${customer?.isLoyalty ? 'is-loyalty' : ''}`}>
                {customer?.isLoyalty && customer?.loyaltyTier ? (
                  <><strong>Loyalty Member:</strong> {customer.loyaltyTier} tier — eligible for tier and general coupons.</>
                ) : (
                  <><strong>Standard Customer:</strong> You can use standard offers. Join loyalty for more!</>
                )}
              </p>

              {!appliedCoupon ? (
                <>
                  <div className="cart-coupon-row">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError('');
                      }}
                      disabled={isValidatingCoupon}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      className={couponError ? 'has-error' : ''}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={isValidatingCoupon || !couponCode.trim()}
                      className="cart-coupon-apply"
                    >
                      {isValidatingCoupon ? 'Checking…' : 'Apply'}
                    </button>
                  </div>
                  {couponError ? (
                    <p className="cart-coupon-error"><i className="fas fa-exclamation-circle" /> {couponError}</p>
                  ) : null}
                </>
              ) : (
                <div className="cart-coupon-applied">
                  <div className="cart-coupon-applied-row">
                    <span><i className="fas fa-check-circle" /> Code Applied: {appliedCoupon.code}</span>
                    <button type="button" onClick={removeCoupon} className="cart-coupon-remove">Remove</button>
                  </div>
                  <p>Discount: Rs. {appliedCoupon.discountAmount.toLocaleString()}</p>
                </div>
              )}
            </div>

            <div className="cart-collection-note">
              <strong>Shop Collection Only</strong> — Visit our store to collect.
            </div>

            <button type="button" onClick={openCheckout} disabled={!cart.length} className="cart-checkout-btn">
              Proceed to Checkout
            </button>

            <a href="/customer-shop" className="cart-continue-link">
              <i className="fas fa-arrow-left" /> Continue Shopping
            </a>
          </aside>
        </div>

        {cart.length ? (
          <div className="cart-mobile-bar">
            <div className="cart-mobile-bar-info">
              <span className="cart-mobile-bar-label">Total</span>
              <span className="cart-mobile-bar-total">Rs. {total.toLocaleString()}</span>
            </div>
            <button type="button" onClick={openCheckout} className="cart-mobile-bar-btn">
              Checkout
            </button>
          </div>
        ) : null}
      </main>

      {isCheckoutOpen ? (
        <div className="cart-modal" role="dialog" aria-modal="true">
          <div className="cart-modal-sheet">
            <div className="cart-modal-header">
              <h2>Checkout</h2>
              <button type="button" className="cart-modal-close" onClick={() => setIsCheckoutOpen(false)} aria-label="Close">×</button>
            </div>

            <div className="cart-modal-body">
              <div className="cart-collection-note">
                <strong>Shop Collection</strong> — Your order will be prepared at Saranya Jewellery.
              </div>

              <form onSubmit={handlePlaceOrder} className="cart-form">
                <div className="cart-form-group">
                  <label htmlFor="cartPhone">Phone Number *</label>
                  <input
                    id="cartPhone"
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>

                <div className="cart-form-group">
                  <label>Payment Method</label>
                  <div className="cart-payment-method">
                    <p className="cart-payment-title">Bank Transfer</p>
                    <p className="cart-payment-desc">Transfer the total amount and upload the receipt below.</p>
                  </div>
                </div>

                <div className="cart-form-group">
                  <label htmlFor="cartReceipt">Payment Receipt *</label>
                  <input
                    id="cartReceipt"
                    type="file"
                    accept="image/*"
                    required
                    onChange={(event) => handleReceiptChange(event.target.files?.[0])}
                  />
                  <p className="cart-form-help">Upload a screenshot or photo of your bank transfer (max 5MB).</p>
                  {receiptPreview ? (
                    <img src={receiptPreview} alt="Receipt preview" className="cart-receipt-preview" />
                  ) : null}
                </div>

                <div className="cart-form-group">
                  <label htmlFor="cartNotes">Order Notes (Optional)</label>
                  <textarea
                    id="cartNotes"
                    value={orderNotes}
                    onChange={(event) => setOrderNotes(event.target.value)}
                    placeholder="Any special instructions..."
                    rows={3}
                  />
                </div>

                <div className="cart-modal-summary">
                  <h3>Order Summary</h3>
                  <div className="cart-summary-row"><span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
                  {appliedCoupon ? (
                    <div className="cart-summary-row cart-summary-discount"><span>Discount</span><span>−Rs. {appliedCoupon.discountAmount.toLocaleString()}</span></div>
                  ) : null}
                  <div className="cart-summary-row"><span>Tax (3%)</span><span>Rs. {tax.toLocaleString()}</span></div>
                  <div className="cart-summary-total">
                    <span>Total</span>
                    <strong>Rs. {total.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="cart-modal-actions">
                  <button type="button" onClick={() => setIsCheckoutOpen(false)} className="cart-btn-ghost">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="cart-btn-primary">
                    {isSubmitting ? 'Placing Order…' : 'Place Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
