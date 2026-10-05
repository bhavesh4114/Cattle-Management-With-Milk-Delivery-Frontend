import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import { useConfirm } from "../../../context/ConfirmContext";

const availableFeatures = [
  { key: "cows", label: "Manage Cows" },
  { key: "deaths", label: "Cow Death" },
  { key: "stock", label: "Stock Management" },
  { key: "feed", label: "Feed Plan" },
  { key: "intake", label: "Food Intake" },
  { key: "milk", label: "Cow Milk" },
  { key: "sales", label: "Cow Sold" },
  { key: "treatments", label: "Cow Treatment" },
  { key: "items", label: "Items" },
  { key: "orders", label: "Orders" },
  { key: "reports", label: "Reports" },
  { key: "alerts", label: "Alert Reports" },
  { key: "staff-milk-report", label: "Staff Milk Processing" },
  { key: "milk-pricing", label: "Milk Pricing" },
  { key: "milk-subscriptions", label: "Milk Subscriptions" },
  { key: "milk-trials", label: "Milk Trials" },
  { key: "my-deliveries", label: "My Deliveries (Delivery Boy Dashboard)", readOnly: true },
];

const RoleCreation = () => {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formMode, setFormMode] = useState("create"); // "create" | "edit_user" | "edit_role"
  
  // Unified Form State
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    customRoleId: "", // "CREATE_NEW" or existing role ID
    newRoleName: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    status: "Active",
    permissions: []
  });

  const [formError, setFormError] = useState("");
  const { confirm, customAlert } = useConfirm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        api.get("/admin/roles"),
        api.get("/admin/roles/users")
      ]);
      setRoles(rolesRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // If they select an existing role, load its permissions so they can see them
      if (name === "customRoleId" && value !== "" && value !== "CREATE_NEW") {
        const selectedRole = roles.find(r => r.id.toString() === value.toString());
        if (selectedRole) {
          updated.permissions = selectedRole.permissions || [];
        }
      } else if (name === "customRoleId" && value === "CREATE_NEW") {
        updated.permissions = []; // Reset for new role
      }
      return updated;
    });
  };

  const setFeaturePermission = (feature, level) => {
    setFormData(prev => {
      let perms = prev.permissions.filter(p => !p.startsWith(`${feature}_`) && p !== feature);
      if (level === "view") {
        perms.push(`${feature}_view`);
      } else if (level === "full") {
        perms.push(`${feature}_view`, `${feature}_add`, `${feature}_edit`, `${feature}_delete`);
      }
      return { ...prev, permissions: perms };
    });
  };

  const handleAddClick = () => {
    setFormMode("create");
    setFormData({
      customRoleId: "",
      newRoleName: "",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      status: "Active",
      permissions: []
    });
    setFormError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowForm(true);
  };

  const handleEditUser = (user) => {
    setFormMode("edit_user");
    setEditingUserId(user.id);
    setFormData({
      customRoleId: user.customRoleId || "",
      newRoleName: "",
      name: user.name,
      email: user.email || "",
      password: "",
      confirmPassword: "",
      status: user.status,
      permissions: []
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormError("");
    setShowForm(true);
  };

  const handleEditRole = (role) => {
    setFormMode("edit_role");
    setEditingRoleId(role.id);
    setFormData({
      customRoleId: role.id,
      newRoleName: role.name,
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      status: role.status,
      permissions: role.permissions || []
    });
    setFormError("");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (formMode === "edit_role") {
      try {
        await api.put(`/admin/roles/${editingRoleId}`, {
          name: formData.newRoleName,
          status: formData.status,
          permissions: formData.permissions
        });
        customAlert("Role permissions updated successfully");
        setShowForm(false);
        fetchData();
      } catch (error) {
        setFormError(error.response?.data?.message || "An error occurred updating the role");
      }
      return;
    }

    if (!formData.customRoleId) {
      return setFormError("Please select a role.");
    }
    
    if (formMode === "create" && formData.customRoleId === "CREATE_NEW" && !formData.newRoleName) {
      return setFormError("Please provide a name for the new role.");
    }

    if (formData.password !== formData.confirmPassword) {
      return setFormError("Passwords do not match");
    }

    try {
      let roleIdToUse = formData.customRoleId;

      // 1. Create role if needed
      if (formMode === "create" && formData.customRoleId === "CREATE_NEW") {
        const roleRes = await api.post("/admin/roles", {
          name: formData.newRoleName,
          status: "Active",
          permissions: formData.permissions
        });
        roleIdToUse = roleRes.data.data.id;
      } else if (roleIdToUse && roleIdToUse !== "CREATE_NEW") {
        // Update the existing role's permissions just in case they modified them while creating/editing user
        try {
          await api.put(`/admin/roles/${roleIdToUse}`, {
            permissions: formData.permissions
          });
        } catch (e) {
          console.error("Failed to update role permissions during user save", e);
        }
      }

      // 2. Create or Update User
      const payload = {
        name: formData.name,
        email: formData.email,
        status: formData.status,
        customRoleId: roleIdToUse
      };
      
      if (formData.password && formData.password !== "••••••••") {
        payload.password = formData.password;
      }

      if (formMode === "edit_user") {
        await api.put(`/admin/roles/users/${editingUserId}`, payload);
        customAlert("User updated successfully");
      } else {
        await api.post("/admin/roles/users", payload);
        customAlert("User and Role created successfully");
      }

      setShowForm(false);
      fetchData();
    } catch (error) {
      setFormError(error.response?.data?.message || "An error occurred");
    }
  };

  const handleDeleteUser = async (id, name) => {
    const isConfirmed = await confirm(`Are you sure you want to delete user '${name}'?`);
    if (isConfirmed) {
      try {
        await api.delete(`/admin/roles/users/${id}`);
        fetchData();
      } catch (error) {
        customAlert("Failed to delete user");
      }
    }
  };

  const handleDeleteRole = async (id, name) => {
    const isConfirmed = await confirm(`Are you sure you want to delete the role '${name}'? This will also delete all associated users.`);
    if (isConfirmed) {
      try {
        await api.delete(`/admin/roles/${id}`);
        fetchData();
      } catch (error) {
        customAlert("Failed to delete role");
      }
    }
  };

  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === "Active" ? "Inactive" : "Active";
    try {
      await api.put(`/admin/roles/users/${user.id}`, { status: newStatus });
      fetchData();
    } catch (error) {
      customAlert(`Failed to ${newStatus === "Active" ? "activate" : "deactivate"} user`);
    }
  };

  if (showForm) {
    const isCreatingRole = formData.customRoleId === "CREATE_NEW";

    return (
      <section style={{ background: "#fff", borderRadius: "8px", padding: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
          <h2 style={{ margin: 0, color: "#1e293b", fontSize: "20px" }}>
            {formMode === "create" ? "Create Role & User" : formMode === "edit_role" ? "Edit Role Permissions" : "Edit User"}
          </h2>
          <button type="button" onClick={() => setShowForm(false)} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
        </div>

        { formError && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "12px", borderRadius: "6px", marginBottom: "16px", border: "1px solid #fca5a5" }}>{formError}</div> }

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: "16px" }}>
            
            {formMode !== "edit_role" && (
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>Select Role *</label>
                  <select name="customRoleId" value={formData.customRoleId} onChange={handleInputChange} required style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", background: "#f8fafc", cursor: "pointer" }}>
                    <option value="">-- Select Role --</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                    {formMode === "create" && (
                      <option value="CREATE_NEW" style={{ fontWeight: 'bold', color: '#2e6f40' }}>+ Create New Role</option>
                    )}
                  </select>
                </div>
                {isCreatingRole && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>New Role Name *</label>
                    <input type="text" name="newRoleName" value={formData.newRoleName} onChange={handleInputChange} placeholder="e.g. Area Manager" required style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", background: "#f8fafc" }} />
                  </div>
                )}
              </div>
            )}

            {formMode === "edit_role" && (
              <div style={{ gridColumn: "1 / -1" }}>
                 <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>Role Name *</label>
                 <input type="text" name="newRoleName" value={formData.newRoleName} onChange={handleInputChange} required style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", background: "#f8fafc" }} />
              </div>
            )}

            {formMode !== "edit_role" && (
              <>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>User Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Vishva" required style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", background: "#f8fafc" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>Email Address *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="user@example.com" required style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", background: "#f8fafc" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>Password {formMode === "edit_user" && <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "normal" }}>(Leave blank to keep current)</span>}</label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} placeholder={formMode === "edit_user" ? "••••••••" : "Enter secure password"} required={formMode === "create"} style={{ width: "100%", padding: "12px 40px 12px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", background: "#f8fafc" }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 0, display: "flex", alignItems: "center" }} title={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>Confirm Password</label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} placeholder={formMode === "edit_user" ? "••••••••" : "Re-enter password"} required={formMode === "create" && !!formData.password} style={{ width: "100%", padding: "12px 40px 12px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", background: "#f8fafc" }} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 0, display: "flex", alignItems: "center" }} title={showConfirmPassword ? "Hide password" : "Show password"}>
                        {showConfirmPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange} style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", background: "#f8fafc", cursor: "pointer" }}>
                <option value="Active">🟢 Active</option>
                <option value="Inactive">🔴 Inactive</option>
              </select>
            </div>
          </div >

          <div style={{ marginTop: "10px", minWidth: 0, width: "100%" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", color: "#1e293b" }}>
              Assign Features / Permissions
            </h3>
              <div style={{ overflowX: "auto", width: "100%", maxWidth: "100%" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                      <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Feature</th>
                      <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", color: "#475569", textAlign: "right" }}>Access Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableFeatures.map(feat => {
                      const noWrite = ['dashboard'].includes(feat.key);
                      const hasLegacy = formData.permissions.includes(feat.key);
                      const canView = formData.permissions.includes(`${feat.key}_view`) || hasLegacy;
                      const canAdd = formData.permissions.includes(`${feat.key}_add`) || hasLegacy;
                      const canEdit = formData.permissions.includes(`${feat.key}_edit`) || hasLegacy;
                      const canDelete = formData.permissions.includes(`${feat.key}_delete`) || hasLegacy;
                      
                      let currentLevel = "none";
                      if (canView && canAdd && canEdit && canDelete) {
                        currentLevel = "full";
                      } else if (canView && !canAdd && !canEdit && !canDelete) {
                        currentLevel = "view";
                      } else if (canView) {
                        currentLevel = "full";
                      }
                      
                      if (noWrite) {
                        if (canView) currentLevel = "view";
                        else currentLevel = "none";
                      }
                      
                      const canEditPermissions = true;
                      
                      const buttonStyle = (isActive) => ({
                        padding: "6px 16px",
                        background: isActive ? "#2e6f40" : "#fff",
                        color: isActive ? "#fff" : "#475569",
                        fontSize: "13px",
                        fontWeight: isActive ? "600" : "500",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      });
                      
                      return (
                        <tr key={feat.key} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 16px", fontWeight: "500", color: "#334155" }}>{feat.label}</td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", borderRadius: "6px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
                              <button type="button" onClick={() => setFeaturePermission(feat.key, "none")} style={{ ...buttonStyle(currentLevel === "none"), border: "none", borderRight: "1px solid #cbd5e1" }}>None</button>
                              <button type="button" onClick={() => setFeaturePermission(feat.key, "view")} style={{ ...buttonStyle(currentLevel === "view"), border: "none", borderRight: noWrite ? "none" : "1px solid #cbd5e1" }}>View only</button>
                              {!noWrite && (
                                <button type="button" onClick={() => setFeaturePermission(feat.key, "full")} style={{ ...buttonStyle(currentLevel === "full"), border: "none" }}>Full access</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
            <button type="submit" style={{ background: "#2e6f40", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
              {formMode === "create" ? "Save" : "Update"}
            </button>
          </div>
        </form >
      </section >
    );
  }

  return (
    <section className="cattle-table-card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0, color: "#1e293b", fontSize: "20px" }}>User & Role Management</h2>
        <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" onClick={handleAddClick} style={{ background: "#2e6f40", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
            + Create Role / User
            </button>
        </div>
      </div>

      <div className="table-wrap">
        <div style={{ marginBottom: "30px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>User Name</th>
                <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Email</th>
                <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Role</th>
                <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Status</th>
                <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0", textAlign: "right" }}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {loading ? (
                <tr><td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>Loading...</td></tr>
                ) : users.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>No users created yet.</td></tr>
                ) : (
                users.map(user => (
                    <tr key={user.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "12px", fontWeight: "600" }}>{user.name}</td>
                        <td style={{ padding: "12px", color: "#64748b" }}>{user.email}</td>
                        <td style={{ padding: "12px", color: "#64748b" }}>{user.customRole?.name || "N/A"}</td>
                        <td style={{ padding: "12px", width: "100px" }}>
                            <div
                            onClick={() => handleToggleUserStatus(user)}
                            title={user.status === "Active" ? "Deactivate User" : "Activate User"}
                            style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", userSelect: "none" }}
                            >
                                <div style={{ position: "relative", width: "34px", height: "18px", background: user.status === "Active" ? "#22c55e" : "#cbd5e1", borderRadius: "20px", transition: "background 0.3s ease" }}>
                                    <div style={{ position: "absolute", top: "2px", left: user.status === "Active" ? "18px" : "2px", width: "14px", height: "14px", background: "#fff", borderRadius: "50%", transition: "left 0.3s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}></div>
                                </div>
                            </div>
                        </td>
                        <td style={{ padding: "12px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
                            <button type="button" onClick={() => handleEditUser(user)} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
                            Edit
                            </button>
                            <button type="button" onClick={() => handleDeleteUser(user.id, user.name)} style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#fee2e2"} onMouseLeave={(e) => e.currentTarget.style.background = "#fef2f2"}>
                            Delete
                            </button>
                        </div>
                        </td>
                    </tr>
                ))
                )}
            </tbody>
            </table>
        </div>


      </div >
    </section >
  );
};

export default RoleCreation;
