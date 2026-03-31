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
  const tax = Math.round(subtotal * 0.03);
  const total = subtotal + tax;

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
        const formData = new FormData();
        formData.append('receipt', receiptFile);

        const uploadResponse = await fetch('/api/upload/receipt', {
          method: 'POST',
          credentials: 'same-origin',
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
      }

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
        total
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
      alert(`Failed to place order: ${error.message}`);
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
          <a href="/customer-dashboard?openProfile=true"><i className="fas fa-user header-icon" /></a>
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

      <main>
        <div className="container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: "'Cormorant Garamond', serif", color: 'var(--brand-burgundy)' }}>Shopping Cart</h1>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            <div>
              {!cart.length ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '8px' }}>
                  <i className="fas fa-shopping-cart" style={{ fontSize: '4rem', color: '#ddd', marginBottom: '1rem' }} />
                  <h2 style={{ color: '#999', marginBottom: '1rem' }}>Your cart is empty</h2>
                  <a href="/customer-shop" style={{ display: 'inline-block', background: 'var(--brand-burgundy)', color: 'white', padding: '1rem 2rem', borderRadius: '4px', textDecoration: 'none' }}>
                    Browse Products
                  </a>
                </div>
              ) : (
                cart.map((item, index) => (
                  <div key={`${item.productId}-${index}`} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '1rem', display: 'flex', gap: '1.5rem' }}>
                    <img src={item.imageUrl || '/SaranyaLOGO.jpg'} alt={item.name} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '4px' }} />

                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 0.5rem', color: 'var(--brand-burgundy)' }}>{item.name}</h3>
                      <p style={{ color: '#666', margin: '0.25rem 0', fontSize: '0.9rem' }}>{item.category} - {item.karat}</p>
                      <p style={{ color: 'var(--brand-gold-strong)', fontWeight: 600, fontSize: '1.1rem', margin: '0.5rem 0' }}>Rs. {Number(item.price || 0).toLocaleString()}</p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button type="button" onClick={() => updateQuantity(index, -1)} style={{ background: '#f0f0f0', border: 'none', padding: '0.5rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}>-</button>
                          <span style={{ padding: '0 1rem', fontWeight: 600 }}>{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(index, 1)} style={{ background: '#f0f0f0', border: 'none', padding: '0.5rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}>+</button>
                        </div>

                        <button type="button" onClick={() => removeFromCart(index)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: '0.5rem 1rem' }}>
                          <i className="fas fa-trash" /> Remove
                        </button>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 600, fontSize: '1.2rem', color: 'var(--brand-burgundy)', margin: 0 }}>Rs. {Number(item.price * item.quantity || 0).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div>
              <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', position: 'sticky', top: '2rem' }}>
                <h2 style={{ margin: '0 0 1.5rem', fontFamily: "'Cormorant Garamond', serif", color: 'var(--brand-burgundy)' }}>Order Summary</h2>

                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Subtotal ({itemCount} items):</span>
                    <span>Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Tax (3%):</span>
                    <span>Rs. {tax.toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem' }}>
                  <span>Total:</span>
                  <span style={{ color: 'var(--brand-gold-strong)' }}>Rs. {total.toLocaleString()}</span>
                </div>

                <div style={{ background: '#d1f2eb', padding: '0.8rem', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center' }}>
                  <p style={{ margin: 0, color: '#0d6655', fontSize: '0.9rem' }}><strong>Shop Collection Only</strong> - Visit our store to collect</p>
                </div>

                <button type="button" onClick={openCheckout} disabled={!cart.length} style={{ width: '100%', background: 'var(--brand-burgundy)', color: 'white', border: 'none', padding: '1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', opacity: cart.length ? 1 : 0.65 }}>
                  Proceed to Checkout
                </button>

                <a href="/customer-shop" style={{ display: 'block', textAlign: 'center', color: 'var(--brand-burgundy)', textDecoration: 'none' }}>
                  <i className="fas fa-arrow-left" /> Continue Shopping
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {isCheckoutOpen ? (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '2rem' }}>
          <div style={{ background: 'white', borderRadius: '8px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <div style={{ padding: '2rem' }}>
              <h2 style={{ margin: '0 0 1.5rem', fontFamily: "'Cormorant Garamond', serif", color: 'var(--brand-burgundy)' }}>Checkout</h2>

              <div style={{ background: '#d1f2eb', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 600, color: '#0d6655' }}>Shop Collection</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#0d6655' }}>Your order will be prepared for collection at Saranya Jewellery</p>
              </div>

              <form onSubmit={handlePlaceOrder}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Phone Number *</label>
                  <input type="tel" required value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Payment Method</label>
                  <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', border: '1px solid #ddd' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>Bank Transfer</p>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#666' }}>Please transfer the total amount to our bank account and upload the receipt/screenshot below.</p>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Payment Receipt / Screenshot (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleReceiptChange(event.target.files?.[0])}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#666' }}>Upload a screenshot or photo of your bank transfer receipt (max 5MB). You can also submit this later.</p>
                  {receiptPreview ? (
                    <div style={{ marginTop: '0.5rem' }}>
                      <img src={receiptPreview} alt="Receipt preview" style={{ maxWidth: '200px', borderRadius: '4px', border: '1px solid #ddd' }} />
                    </div>
                  ) : null}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Order Notes (Optional)</label>
                  <textarea value={orderNotes} onChange={(event) => setOrderNotes(event.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'inherit', minHeight: '80px' }} placeholder="Any special instructions..." />
                </div>

                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Order Summary</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Total Amount:</span>
                    <strong style={{ color: 'var(--brand-gold-strong)' }}>Rs. {total.toLocaleString()}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => setIsCheckoutOpen(false)} style={{ flex: 1, background: '#6c757d', color: 'white', border: 'none', padding: '1rem', borderRadius: '4px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} style={{ flex: 1, background: 'var(--brand-burgundy)', color: 'white', border: 'none', padding: '1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
                    {isSubmitting ? 'Placing Order...' : 'Place Order'}
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
