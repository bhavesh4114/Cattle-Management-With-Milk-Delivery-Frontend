import React from "react";
import { useNavigate } from "react-router-dom";

const StockDashboard = () => {
  const navigate = useNavigate();

  const modules = [
    {
      title: "Stock Levels",
      description: "View current inventory levels and track stock status",
      icon: "📦",
      path: "/admin/stock/current",
      color: "blue"
    },
    {
      title: "Items",
      description: "Manage inventory items and initial stock",
      icon: "⬢",
      path: "/admin/items",
      color: "purple"
    },
    {
      title: "Orders",
      description: "Manage stock orders and vendor purchases",
      icon: "▣",
      path: "/admin/orders",
      color: "orange"
    },
    {
      title: "Create Adjustment",
      description: "Create new stock adjustment",
      icon: "➕",
      path: "/admin/stock-adjustments/new",
      color: "emerald"
    },
    {
      title: "Stock Update",
      description: "Update stock quantities",
      icon: "🔄",
      path: "/admin/stock-update",
      color: "indigo"
    }
  ];

  return (
    <div style={{ padding: "20px", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: "30px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ background: "#2e6f40", color: "white", padding: "10px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"></path></svg>
        </div>
        <div>
          <h2 style={{ margin: 0, color: "#1e293b", fontSize: "24px", fontWeight: "800" }}>Stock Management Modules</h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px", marginTop: "4px" }}>Manage inventory, track stock levels, and perform adjustments.</p>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "24px"
      }}>
        {modules.map((mod, idx) => (
          <div
            key={idx}
            onClick={() => navigate(mod.path)}
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "24px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 12px 25px rgba(0,0,0,0.08)";
              e.currentTarget.style.borderColor = "#cbd5e1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.03)";
              e.currentTarget.style.borderColor = "#e2e8f0";
            }}
          >
            <div style={{
              fontSize: "42px",
              marginBottom: "16px",
              background: "#f8fafc",
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #f1f5f9"
            }}>
              {mod.icon}
            </div>
            <h3 style={{ margin: "0 0 10px 0", color: "#1e293b", fontSize: "18px", fontWeight: "700" }}>{mod.title}</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "13px", lineHeight: "1.5", padding: "0 10px" }}>
              {mod.description}
            </p>
            <div style={{
              marginTop: "20px",
              background: "#2e6f40",
              color: "white",
              padding: "8px 20px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              width: "100%",
              boxSizing: "border-box",
              transition: "background 0.2s"
            }}>
              Open Module
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StockDashboard;
