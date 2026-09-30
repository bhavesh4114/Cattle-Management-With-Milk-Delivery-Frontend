export const hasPermission = (adminData, feature, action = "view") => {
  if (!adminData || !adminData.permissions) return false;
  
  const perms = adminData.permissions;

  // Admin always has full access
  if (adminData.role === 'ADMIN' || perms.includes('*')) {
    return true;
  }

  // Exact match for feature_action
  const featureAction = `${feature}_${action}`;
  if (perms.includes(featureAction)) {
    return true;
  }

  // Legacy fallback: if they just have "feature" (without action), grant view
  if (perms.includes(feature) && action === "view") {
    return true;
  }
  
  // If they have any other action like "cows_add", they implicitly have "cows_view"
  if (action === "view") {
    if (perms.some(p => p.startsWith(`${feature}_`))) {
      return true;
    }
  }

  return false;
};
