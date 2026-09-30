import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import "../../../css/dashboard.css"; // We can reuse base dashboard CSS
import StaffMilkReportsView from "./StaffMilkReportsView";
import CustomerOrdersAdmin from "../../orders/pages/CustomerOrdersAdmin";
import ProductsAdmin from "./products/ProductsAdmin";
import MilkTrialsAdmin from "./trials/MilkTrialsAdmin";
import MilkSubscriptionsAdmin from "./subscriptions/MilkSubscriptionsAdmin";
import DeliveryBoyManagement from "./DeliveryBoyManagement";
import MyDeliveries from "./MyDeliveries";
import RoleCreation from "../../roles/pages/RoleCreation";

const MilkAdminDashboard = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(localStorage.getItem("milkAdminActiveTab") || "dashboard");
  const [stats, setStats] = useState({ totalCustomers: 0, todayDelivery: 0, pendingPayments: 0 });

  const adminData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("adminData")) || {};
    } catch {
      return {};
    }
  }, []);

  const isDeliveryBoy = adminData?.customRole?.name?.toLowerCase().includes("delivery");

  useEffect(() => {
    if (isDeliveryBoy && activeTab !== "my-deliveries") {
      setActiveTab("my-deliveries");
    }
  }, [isDeliveryBoy, activeTab]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
        fetchStats();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
        const res = await api.get('/api/milk-module/dashboard/stats');
        setStats(res.data);
    } catch (e) {
        console.error("Failed to fetch dashboard stats", e);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem("milkAdminActiveTab", tabId);
    setIsSidebarOpen(false);
  };

  return (
    <div className="admin-shell" style={{ background: "#f8fafc" }}>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            zIndex: 99
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`admin-sidebar ${isSidebarOpen ? "open" : ""}`}
        style={{
          background: "linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)", // Blue theme for milk
          borderRight: "none",
          zIndex: 100
        }}
      >
        <div className="sidebar-brand" style={{ background: "transparent", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h1 style={{ color: "white", margin: 0 }}>🥛 Milk Admin</h1>
            <button
              className="sidebar-close-btn"
              onClick={() => setIsSidebarOpen(false)}
              style={{ color: "white" }}
            >
              ×
            </button>
          </div>
          <p style={{ color: "#93c5fd" }}>Delivery Management</p>
        </div>

        <nav className="sidebar-nav" style={{ padding: "20px 10px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {[
            { id: "dashboard", icon: "📊", label: "Dashboard" },
            { id: "products", icon: "📦", label: "Products" },
            { id: "orders", icon: "🛒", label: "Customer Orders" },
            { id: "staff-reports", icon: "📋", label: "Staff Reports" },
            { id: "delivery", icon: "👥", label: "Delivery Boy Mgmt" },
            { id: "roles", icon: "🛡️", label: "Role Creation" },
            { id: "my-deliveries", icon: "🛵", label: "My Deliveries" }
          ].filter(item => {
            if (isDeliveryBoy) return item.id === "my-deliveries";
            if (item.id === "my-deliveries") return false;
            if (item.id === "roles") return adminData?.role === "ADMIN";
            return true;
          }).map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              style={{
                display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "8px", border: "none", textAlign: "left", width: "100%", fontSize: "14px", fontWeight: "500", cursor: "pointer", transition: "all 0.2s",
                ...(activeTab === item.id ? { background: "rgba(255,255,255,0.15)", color: "white" } : { background: "transparent", color: "#cbd5e1" })
              }}
            >
              <span style={{ fontSize: "18px" }}>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", padding: "20px 10px" }}>
          <button className="nav-item" onClick={() => navigate("/")} style={{ color: "#fca5a5", width: "100%", background: "transparent", border: "none", display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", cursor: "pointer", fontWeight: "bold" }}>
            <span style={{ fontSize: "18px" }}>&gt;</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-topbar" style={{ background: "white", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setIsSidebarOpen(true)}
              style={{ fontSize: "32px", color: "#1e3a8a" }}
            >
              ☰
            </button>
            <div>
              <h2 style={{ color: "#0f172a" }}>Milk Delivery Dashboard</h2>
              <p style={{ color: "#64748b" }}>Manage milk distribution and customers</p>
            </div>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              onClick={() => navigate("/admin/dashboard")}
              style={{
                background: "#f1f5f9",
                color: "#334155",
                border: "1px solid #cbd5e1",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6H4zM14 14h6v6h-6zM14 4h6v6h-6zM4 4h6v6H4z"/></svg>
              Farm Admin
            </button>
          </div>
        </header>

        <section className="admin-content" style={{ padding: "24px" }}>
          {activeTab === "dashboard" && (
            <div>
              <h3 style={{ fontSize: "1.5rem", color: "#1e293b", marginBottom: "20px" }}>Overview</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "30px" }}>
                <div style={{ background: "white", padding: "16px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}>
                  <div style={{ color: "#64748b", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>Total Customers</div>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a", marginTop: "4px" }}>{stats.totalCustomers}</div>
                </div>
                <div style={{ background: "white", padding: "16px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}>
                  <div style={{ color: "#64748b", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>Today's Delivery (Liters)</div>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#3b82f6", marginTop: "4px" }}>{stats.todayDelivery} L</div>
                </div>
                <div style={{ background: "white", padding: "16px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}>
                  <div style={{ color: "#64748b", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>Pending Payments</div>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ef4444", marginTop: "4px" }}>₹{stats.pendingPayments}</div>
                </div>
              </div>
              <div className="quick-actions-container" style={{ background: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
                <h3 style={{ fontSize: "1.25rem", color: "#1e293b", marginBottom: "20px" }}>Quick Actions</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                  {[
                    { id: "products", icon: "📦", label: "Manage Products" },
                    { id: "orders", icon: "🛒", label: "All Orders" },
                    { id: "staff-reports", icon: "📋", label: "Staff Reports" },
                    { id: "delivery", icon: "👥", label: "Delivery Boy Mgmt" }
                  ].map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleTabChange(action.id)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "12px",
                        padding: "24px",
                        background: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#3b82f6";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 6px rgba(59, 130, 246, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
                      }}
                    >
                      <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                        {action.icon}
                      </div>
                      <span style={{ color: "#334155", fontWeight: "600" }}>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === "staff-reports" && <StaffMilkReportsView />}
          {activeTab === "orders" && <CustomerOrdersAdmin />}
          {activeTab === "products" && <ProductsAdmin />}
          { activeTab === "subscriptions" && <MilkSubscriptionsAdmin /> }
          { activeTab === "trials" && <MilkTrialsAdmin /> }
          { activeTab === "delivery" && <DeliveryBoyManagement /> }
          { activeTab === "my-deliveries" && <MyDeliveries /> }
          { activeTab === "roles" && <RoleCreation /> }

          {activeTab !== "dashboard" && activeTab !== "staff-reports" && activeTab !== "orders" && activeTab !== "products" && activeTab !== "subscriptions" && activeTab !== "trials" && activeTab !== "delivery" && activeTab !== "my-deliveries" && activeTab !== "roles" && (
            <div style={{ background: "white", padding: "40px", borderRadius: "16px", textAlign: "center", border: "1px dashed #cbd5e1" }}>
              <h3 style={{ color: "#475569", textTransform: "capitalize" }}>{activeTab} Module Coming Soon</h3>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default MilkAdminDashboard;
