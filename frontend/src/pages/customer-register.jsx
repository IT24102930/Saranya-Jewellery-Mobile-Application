import { useEffect, useMemo, useState } from 'react';

function getSafeRedirect() {
  const redirectTarget = new URLSearchParams(window.location.search).get('redirect');
  if (!redirectTarget) return null;
  if (!redirectTarget.startsWith('/') || redirectTarget.startsWith('//')) return null;
  return redirectTarget;
}

export default function CustomerRegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [alertState, setAlertState] = useState({ message: '', type: 'error' });
  const safeRedirect = useMemo(() => getSafeRedirect(), []);

  useEffect(() => {
    document.title = 'Customer Registration - Saranya Jewellery';
  }, []);

  function showAlert(message, type = 'error') {
    setAlertState({ message, type });
    window.setTimeout(() => setAlertState({ message: '', type: 'error' }), 5000);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const normalizedPhone = phone.replace(/\D/g, '');

    if (!firstName || !lastName || !email || !phone || !form.password || !form.confirmPassword) {
      showAlert('Please fill in all required fields');
      return;
    }
    if (firstName.length < 2 || lastName.length < 2) {
      showAlert('First name and last name must be at least 2 characters long');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert('Please enter a valid email address');
      return;
    }

    if (!/^\d{10}$/.test(normalizedPhone)) {
      showAlert('Phone number must be exactly 10 digits');
      return;
    }
    if (form.password.length < 8) {
      showAlert('Password must be at least 8 characters long');
      return;
    }
    if (!/\d/.test(form.password)) {
      showAlert('Password must include at least 1 number');
      return;
    }
    if (form.password !== form.confirmPassword) {
      showAlert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone: normalizedPhone, password: form.password })
      });

      const data = await response.json();
      if (!response.ok) {
        showAlert(data.message || 'Registration failed');
        setLoading(false);
        return;
      }

      showAlert('Registration successful! Redirecting to login...', 'success');
      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
      window.setTimeout(() => {
        const loginPath = safeRedirect
          ? `/customer-login?redirect=${encodeURIComponent(safeRedirect)}`
          : '/customer-login';
        window.location.href = loginPath;
      }, 1500);
    } catch (error) {
      console.error('Registration error:', error);
      showAlert('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  }

  const loginHref = safeRedirect
    ? `/customer-login?redirect=${encodeURIComponent(safeRedirect)}`
    : '/customer-login';

  return (
    <div className="register-container">
      <div className="logo-area">
        <h1>Saranya</h1>
        <p>Customer Registration</p>
      </div>

      <div className="info-note">Join us to enjoy exclusive collections and earn loyalty rewards.</div>
      <div className={`alert ${alertState.message ? `alert-${alertState.type} show` : ''}`}>{alertState.message}</div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="firstName">First Name</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            placeholder="Enter your first name"
            required
            value={form.firstName}
            onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
          />
        </div>
        <div className="form-group">
          <label htmlFor="lastName">Last Name</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            placeholder="Enter your last name"
            required
            value={form.lastName}
            onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            required
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            placeholder="Enter 10-digit phone number"
            required
            pattern="[0-9]{10}"
            inputMode="numeric"
            maxLength={10}
            value={form.phone}
            onChange={(event) => {
              const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 10);
              setForm((prev) => ({ ...prev, phone: digitsOnly }));
            }}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Create a password"
            required
            minLength={8}
            pattern="(?=.*\d).{8,}"
            title="Password must be at least 8 characters and include at least 1 number"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Re-enter password"
            required
            minLength={8}
            value={form.confirmPassword}
            onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
          />
        </div>

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>

      <div className="footer-links">
        <a href={loginHref}>Already have an account? Login</a>
        <span className="divider">|</span>
        <a href="/">Back to Home</a>
      </div>
    </div>
  );
}
