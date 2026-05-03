import { useEffect, useState } from 'react';
import authManager from '../auth.js';

export default function StaffLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertState, setAlertState] = useState({ message: '', type: 'error' });

  useEffect(() => {
    document.title = 'Staff Login - Saranya Jewellery';
  }, []);

  function showAlert(message, type = 'error') {
    setAlertState({ message, type });
    window.setTimeout(() => setAlertState({ message: '', type: 'error' }), 5000);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      showAlert('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      showAlert('Please enter a valid email address');
      return;
    }

    setLoading(true);
    const result = await authManager.loginStaff(cleanEmail, password);
    if (result.success) {
      showAlert('Login successful! Redirecting...', 'success');
      window.setTimeout(() => {
        const redirectUrl = authManager.getRoleDashboard(result.data.staff?.role);
        window.location.href = redirectUrl;
      }, 500);
      return;
    }

    showAlert(result.error || 'Invalid email or password');
    setLoading(false);
  }

  return (
    <div className="login-container">
      <div className="logo-area">
        <h1>Saranya</h1>
        <p>Staff Portal Login</p>
      </div>

      <div className={`alert ${alertState.message ? `alert-${alertState.type} show` : ''}`}>{alertState.message}</div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Enter your password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
          />
        </div>

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="footer-links">
        <a href="/staff-register">Create Account</a>
        <span className="divider">|</span>
        <a href="/">Back to Home</a>
      </div>
    </div>
  );
}
