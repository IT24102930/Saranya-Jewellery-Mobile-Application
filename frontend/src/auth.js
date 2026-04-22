/**
 * Centralized Authentication Utility
 * Handles session persistence across page navigation
 */

class AuthManager {
  constructor() {
    this.userType = null; // 'staff' or 'customer'
  }

  /**
   * Build a safe same-origin return path for post-login navigation
   */
  getCurrentPathWithQuery() {
    const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    return path.startsWith('/') ? path : '/';
  }

  /**
   * Make authenticated API request with credentials
   */
  async apiRequest(url, options = {}) {
    // Determine API base URL
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const apiBaseUrl = isProduction 
      ? window.location.origin 
      : 'http://localhost:3000';
    
    // Build full URL if relative path provided
    const fullUrl = url.startsWith('http') ? url : `${apiBaseUrl}${url}`;

    const defaultOptions = {
      credentials: 'include', // Include cookies from cross-origin requests
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // Merge options properly, ensuring headers are combined
    const mergedOptions = {
      ...options,
      ...defaultOptions,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    const response = await fetch(fullUrl, mergedOptions);
    return response;
  }

  /**
   * Check staff authentication
   */
  async checkStaffAuth(requiredRole = null) {
    try {
      const response = await this.apiRequest('/api/auth/me');
      
      if (!response.ok) {
        this.redirectToLogin('staff');
        return null;
      }

      const user = await response.json();

      // Check if account is active
      if (!user.isActive) {
        alert('Your account has been deactivated. Please contact administrator.');
        this.redirectToLogin('staff');
        return null;
      }

      // Check for required role if specified
      if (requiredRole && user.role !== requiredRole && user.role !== 'Admin') {
        alert(`Access denied. This page requires ${requiredRole} role.`);
        this.redirectToLogin('staff');
        return null;
      }

      // Check approval status
      if (user.status !== 'Approved') {
        return { ...user, needsApproval: true };
      }

      this.userType = 'staff';
      return user;
    } catch (error) {
      console.error('Staff auth check failed:', error);
      this.redirectToLogin('staff');
      return null;
    }
  }

  /**
   * Check customer authentication
   */
  async checkCustomerAuth(options = {}) {
    const { redirectOnFail = true, returnToCurrentPath = true } = options;
    try {
      const response = await this.apiRequest('/api/customer/me');
      
      if (!response.ok) {
        if (redirectOnFail) {
          this.redirectToLogin('customer', {
            returnTo: returnToCurrentPath ? this.getCurrentPathWithQuery() : null
          });
        }
        return null;
      }

      const data = await response.json();
      const customer = data.customer;

      if (!customer.isActive) {
        alert('Your account has been deactivated. Please contact support.');
        if (redirectOnFail) {
          this.redirectToLogin('customer', {
            returnTo: returnToCurrentPath ? this.getCurrentPathWithQuery() : null
          });
        }
        return null;
      }

      this.userType = 'customer';
      return customer;
    } catch (error) {
      console.error('Customer auth check failed:', error);
      if (redirectOnFail) {
        this.redirectToLogin('customer', {
          returnTo: returnToCurrentPath ? this.getCurrentPathWithQuery() : null
        });
      }
      return null;
    }
  }

  /**
   * Login as staff
   */
  async loginStaff(email, password) {
    try {
      const response = await this.apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      this.userType = 'staff';
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Login as customer
   */
  async loginCustomer(email, password) {
    try {
      const response = await this.apiRequest('/api/customer/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      this.userType = 'customer';
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Logout current user
   */
  async logout() {
    try {
      const endpoint = this.userType === 'customer' ? '/api/customer/logout' : '/api/auth/logout';
      await this.apiRequest(endpoint, { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.redirectToLogin(this.userType || 'staff', { returnTo: null });
    }
  }

  /**
   * Redirect to appropriate login page
   */
  redirectToLogin(type, options = {}) {
    const { returnTo = this.getCurrentPathWithQuery() } = options;
    const loginPage = type === 'customer' ? '/customer-login' : '/staff-login';
    const redirectQuery = returnTo && returnTo.startsWith('/') ? `?redirect=${encodeURIComponent(returnTo)}` : '';
    const targetUrl = `${loginPage}${redirectQuery}`;

    if (window.location.pathname !== loginPage) {
      window.location.href = targetUrl;
    }
  }

  /**
   * Get role-based dashboard URL
   */
  getRoleDashboard(role) {
    const dashboards = {
      'Admin': '/admin-dashboard',
      'Product Management': '/product-management-dashboard',
      'Order Management': '/order-management-dashboard',
      'Inventory': '/inventory-dashboard',
      'Customer Care': '/customer-care-dashboard',
      'Loyalty Management': '/loyalty-management-dashboard'
    };
    return dashboards[role] || '/admin-dashboard';
  }
}

// Create singleton instance
const authManager = new AuthManager();

// Export for use in HTML pages
if (typeof window !== 'undefined') {
  window.AuthManager = authManager;
}

export default authManager;
