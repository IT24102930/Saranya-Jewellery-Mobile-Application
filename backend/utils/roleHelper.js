/**
 * Role-Based Dashboard Redirect Helper
 * 
 * This utility helps redirect authenticated users to their appropriate dashboard
 * based on their role after successful login.
 */

export const ROLE_DASHBOARDS = {
  'Admin': '/admin-dashboard.html',
  'Product Management': '/product-management-dashboard.html',
  'Order Management': '/order-management-dashboard.html',
  'Inventory': '/inventory-dashboard.html',
  'Customer Care': '/customer-care-dashboard.html',
  'Loyalty Management': '/loyalty-management-dashboard.html'
};

export const ROLE_PERMISSIONS = {
  'Admin': {
    canManageStaff: true,
    canManageProducts: true,
    canManageOrders: true,
    canManageInventory: true,
    canManagePromotions: true,
    canManageLoyalty: true,
    canViewAnalytics: true,
    description: 'Full system access with all administrative privileges'
  },
  'Product Management': {
    canManageStaff: false,
    canManageProducts: true,
    canManageOrders: false,
    canManageInventory: false,
    canManagePromotions: false,
    canManageLoyalty: false,
    canViewAnalytics: false,
    description: 'Manage product catalog, pricing, and availability'
  },
  'Order Management': {
    canManageStaff: false,
    canManageProducts: false,
    canManageOrders: true,
    canManageInventory: false,
    canManagePromotions: false,
    canManageLoyalty: false,
    canViewAnalytics: false,
    description: 'Process orders, payments, refunds, and invoices'
  },
  'Inventory': {
    canManageStaff: false,
    canManageProducts: false,
    canManageOrders: false,
    canManageInventory: true,
    canManagePromotions: false,
    canManageLoyalty: false,
    canViewAnalytics: false,
    description: 'Manage stock levels, gold rates, and inventory tracking'
  },
  'Customer Care': {
    canManageStaff: false,
    canManageProducts: false,
    canManageOrders: false,
    canManageInventory: false,
    canManagePromotions: true,
    canManageLoyalty: false,
    canViewAnalytics: false,
    description: 'Create promotions, respond to customer feedback'
  },
  'Loyalty Management': {
    canManageStaff: false,
    canManageProducts: false,
    canManageOrders: false,
    canManageInventory: false,
    canManagePromotions: false,
    canManageLoyalty: true,
    canViewAnalytics: false,
    description: 'Manage loyalty tiers, points, and reward programs'
  }
};

/**
 * Get dashboard URL for a specific role
 * @param {string} role - User role
 * @returns {string} Dashboard URL
 */
export function getDashboardForRole(role) {
  return ROLE_DASHBOARDS[role] || '/staff-login.html';
}

/**
 * Check if a role has specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean} Whether role has permission
 */
export function hasPermission(role, permission) {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return rolePermissions ? rolePermissions[permission] === true : false;
}

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {object} Role permissions object
 */
export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || null;
}

/**
 * Get role description
 * @param {string} role - User role
 * @returns {string} Role description
 */
export function getRoleDescription(role) {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return rolePermissions ? rolePermissions.description : 'Unknown role';
}

/**
 * Validate if a role exists in the system
 * @param {string} role - Role to validate
 * @returns {boolean} Whether role is valid
 */
export function isValidRole(role) {
  return Object.keys(ROLE_DASHBOARDS).includes(role);
}

/**
 * Get all available roles
 * @returns {array} Array of role names
 */
export function getAllRoles() {
  return Object.keys(ROLE_DASHBOARDS);
}

/**
 * Client-side role redirect function (to be used in HTML pages)
 * Add this to staff-login success handler
 */
export const clientRedirectScript = `
// Redirect to appropriate dashboard based on role
function redirectToDashboard(role) {
  const dashboards = {
    'Admin': '/admin-dashboard.html',
    'Product Management': '/product-management-dashboard.html',
    'Order Management': '/order-management-dashboard.html',
    'Inventory': '/inventory-dashboard.html',
    'Customer Care': '/customer-care-dashboard.html',
    'Loyalty Management': '/loyalty-management-dashboard.html'
  };
  
  const dashboard = dashboards[role];
  if (dashboard) {
    window.location.href = dashboard;
  } else {
    console.error('Unknown role:', role);
    window.location.href = '/staff-login.html';
  }
}
`;

export default {
  ROLE_DASHBOARDS,
  ROLE_PERMISSIONS,
  getDashboardForRole,
  hasPermission,
  getRolePermissions,
  getRoleDescription,
  isValidRole,
  getAllRoles,
  clientRedirectScript
};
