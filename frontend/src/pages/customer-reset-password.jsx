import { useEffect, useState } from 'react';

export default function CustomerResetPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertState, setAlertState] = useState({ message: '', type: 'error' });

  useEffect(() => {
    document.title = 'Reset Password - Saranya Jewellery';
  }, []);

  function showAlert(message, type = 'error') {
    setAlertState({ message, type });
    window.setTimeout(() => setAlertState({ message: '', type: 'error' }), 5000);
  }

  async function sendOtp(event) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      showAlert('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      showAlert('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/customer/forgot-password/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });

      const data = await response.json();
      if (!response.ok) {
        showAlert(data.message || 'Failed to send OTP');
        setLoading(false);
        return;
      }

      showAlert('OTP sent successfully. Please check your email.', 'success');
      setStep(2);
      setLoading(false);
    } catch (error) {
      console.error('Send OTP error:', error);
      showAlert('Network error. Please try again.');
      setLoading(false);
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      showAlert('Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/customer/forgot-password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp: cleanOtp })
      });

      const data = await response.json();
      if (!response.ok) {
        showAlert(data.message || 'OTP verification failed');
        setLoading(false);
        return;
      }

      showAlert('OTP verified. You can now set a new password.', 'success');
      setStep(3);
      setLoading(false);
    } catch (error) {
      console.error('Verify OTP error:', error);
      showAlert('Network error. Please try again.');
      setLoading(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!newPassword || !confirmPassword) {
      showAlert('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 8) {
      showAlert('Password must be at least 8 characters long');
      return;
    }

    if (!/\d/.test(newPassword)) {
      showAlert('Password must include at least 1 number');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/customer/forgot-password/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, newPassword })
      });

      const data = await response.json();
      if (!response.ok) {
        showAlert(data.message || 'Password reset failed');
        setLoading(false);
        return;
      }

      showAlert('Password reset successful! Redirecting to login...', 'success');
      setTimeout(() => {
        window.location.href = '/customer-login';
      }, 1200);
    } catch (error) {
      console.error('Reset password error:', error);
      showAlert('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="register-container">
      <div className="logo-area">
        <h1>Saranya</h1>
        <p>Reset Password</p>
      </div>

      <div className={`alert ${alertState.message ? `alert-${alertState.type} show` : ''}`}>{alertState.message}</div>

      {step === 1 ? (
        <form onSubmit={sendOtp}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your registered email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      ) : null}

      {step === 2 ? (
        <form onSubmit={verifyOtp}>
          <div className="form-group">
            <label htmlFor="otp">Enter OTP</label>
            <input
              type="text"
              id="otp"
              name="otp"
              placeholder="Enter 6-digit OTP"
              required
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>
      ) : null}

      {step === 3 ? (
        <form onSubmit={resetPassword}>
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              placeholder="Enter new password"
              required
              minLength={8}
              pattern="(?=.*\d).{8,}"
              title="Password must be at least 8 characters and include at least 1 number"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Re-enter new password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      ) : null}

      <div className="footer-links">
        <a href="/customer-login">Back to Login</a>
        <span className="divider">|</span>
        <a href="/">Back to Home</a>
      </div>
    </div>
  );
}
