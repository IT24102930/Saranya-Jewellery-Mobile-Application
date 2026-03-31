// Middleware to check if user is authenticated (staff or customer)
export const isAuthenticated = (req, res, next) => {
  if (req.session && (req.session.staffId || req.session.customerId)) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized. Please login.' });
};

// Middleware to check if user is an admin
export const isAdmin = (req, res, next) => {
  if (req.session && req.session.staffId && req.session.role === 'Admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Admin only.' });
};

// Middleware to check if user's account is approved
export const isApproved = (req, res, next) => {
  if (req.session && req.session.status === 'Approved') {
    return next();
  }
  return res.status(403).json({ 
    message: 'Account pending approval',
    status: req.session.status || 'Pending'
  });
};

// Role-based access control middleware
export const hasRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.staffId) {
      return res.status(401).json({ message: 'Unauthorized. Please login.' });
    }
    
    if (!allowedRoles.includes(req.session.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        requiredRole: allowedRoles,
        yourRole: req.session.role
      });
    }
    
    return next();
  };
};

// Middleware to check if user is Product Manager
export const isProductManager = (req, res, next) => {
  if (req.session && req.session.staffId && 
      (req.session.role === 'Product Management' || req.session.role === 'Admin')) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Product Manager only.' });
};

// Middleware to check if user is Order Manager
export const isOrderManager = (req, res, next) => {
  if (req.session && req.session.staffId && 
      (req.session.role === 'Order Management' || req.session.role === 'Admin')) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Order Manager only.' });
};

// Middleware to check if user is Inventory Manager
export const isInventoryManager = (req, res, next) => {
  if (req.session && req.session.staffId && 
      (req.session.role === 'Inventory' || req.session.role === 'Inventory Management' || req.session.role === 'Admin')) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Inventory Manager only.' });
};

// Middleware to check if user is Customer Care Manager
export const isCustomerCareManager = (req, res, next) => {
  if (req.session && req.session.staffId && 
      (req.session.role === 'Customer Care' || req.session.role === 'Admin')) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Customer Care Manager only.' });
};

// Middleware to check if user is Loyalty Manager
export const isLoyaltyManager = (req, res, next) => {
  if (req.session && req.session.staffId && 
      (req.session.role === 'Loyalty Management' || req.session.role === 'Admin')) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Loyalty Manager only.' });
};
