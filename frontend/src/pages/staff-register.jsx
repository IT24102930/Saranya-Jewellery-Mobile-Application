import { useEffect, useState } from 'react';

export default function StaffRegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', role: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [alertState, setAlertState] = useState({ message: '', type: 'error' });

  useEffect(() => {
    document.title = 'Staff Registration - Saranya Jewellery';
  }, []);

  function showAlert(message, type = 'error') {
    setAlertState({ message, type });
    window.setTimeout(() => setAlertState({ message: '', type: 'error' }), 5000);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const fullName = form.fullName.trim();
    const email = form.email.trim();

    if (!fullName || !email || !form.role || !form.password || !form.confirmPassword) {
      showAlert('Please fill in all fields');
      return;
    }
    if (fullName.length < 3) {
      showAlert('Name must be at least 3 characters long');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert('Please enter a valid email address');
      return;
    }
    if (form.password.length < 6) {
      showAlert('Password must be at least 6 characters long');
      return;
    }
    if (form.password !== form.confirmPassword) {
      showAlert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, role: form.role, password: form.password })
      });

      const data = await response.json();
      if (!response.ok) {
        showAlert(data.message || 'Registration failed');
        setLoading(false);
        return;
      }

      showAlert('Registration successful! Your account is pending approval. Redirecting to login...', 'success');
      setForm({ fullName: '', email: '', role: '', password: '', confirmPassword: '' });
      window.setTimeout(() => {
        window.location.href = '/staff-login';
      }, 2000);
    } catch (error) {
      console.error('Registration error:', error);
      showAlert('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  }

  return (
    <div className="register-container">
      <div className="logo-area">
        <h1>Saranya</h1>
        <p>Staff Portal Registration</p>
      </div>

      <div className="info-note">Your account will be pending approval until an administrator reviews and approves it.</div>
      <div className={`alert ${alertState.message ? `alert-${alertState.type} show` : ''}`}>{alertState.message}</div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            placeholder="Enter your full name"
            required
            value={form.fullName}
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
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
          <label htmlFor="role">Select Your Role</label>
          <select
            id="role"
            name="role"
            required
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
          >
            <option value="">-- Choose Role --</option>
            <option value="Customer Care">Customer Care</option>
            <option value="Inventory">Inventory</option>
            <option value="Order Management">Order Management</option>
            <option value="Loyalty Management">Loyalty Management</option>
            <option value="Product Management">Product Management</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Create a password"
            required
            minLength={6}
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
            minLength={6}
            value={form.confirmPassword}
            onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
          />
        </div>

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>

      <div className="footer-links">
        <a href="/staff-login">Already have an account? Login</a>
        <span className="divider">|</span>
        <a href="/">Back to Home</a>
      </div>
    </div>
  );
}
