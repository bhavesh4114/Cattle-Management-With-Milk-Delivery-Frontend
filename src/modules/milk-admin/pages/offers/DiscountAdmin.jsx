import React, { useState, useEffect } from "react";
import api from "../../../../services/api";

const INITIAL_DISCOUNTS = [
  {
    id: 1,
    code: "WELCOME50",
    description: "50% Off on First Single Trial Order",
    discountType: "PERCENTAGE",
    value: 50,
    minOrderAmount: 100,
    maxDiscount: 150,
    validUntil: "2026-12-31",
    status: "ACTIVE",
    targetProductName: "",
    redemptionsCount: 42
  },
  {
    id: 2,
    code: "FRESH10",
    description: "10% Off on Monthly Cow Milk Subscriptions",
    discountType: "PERCENTAGE",
    value: 10,
    minOrderAmount: 1500,
    maxDiscount: 300,
    validUntil: "2026-11-30",
    status: "ACTIVE",
    targetProductName: "Cow Milk",
    redemptionsCount: 88
  },
  {
    id: 3,
    code: "DIWALI100",
    description: "Flat Rs. 100 Off on Bulk Festival Milk Deliveries",
    discountType: "FLAT",
    value: 100,
    minOrderAmount: 800,
    maxDiscount: 100,
    validUntil: "2026-11-15",
    status: "ACTIVE",
    targetProductName: "",
    redemptionsCount: 19
  },
  {
    id: 4,
    code: "SUMMER20",
    description: "Summer Chaas & Milk Special Offer",
    discountType: "PERCENTAGE",
    value: 20,
    minOrderAmount: 500,
    maxDiscount: 200,
    validUntil: "2026-06-30",
    status: "EXPIRED",
    targetProductName: "Fresh Chaas",
    redemptionsCount: 114
  }
];

const DiscountAdmin = () => {
  const [discounts, setDiscounts] = useState(() => {
    try {
      const saved = localStorage.getItem("milkAdminDiscounts");
      return saved ? JSON.parse(saved) : INITIAL_DISCOUNTS;
    } catch {
      return INITIAL_DISCOUNTS;
    }
  });

  const [productList, setProductList] = useState([
    { id: 1, name: "Cow Milk", price: 60 },
    { id: 2, name: "Fresh Chaas", price: 30 },
    { id: 3, name: "Pure Desi Ghee", price: 650 },
    { id: 4, name: "Buffalo Milk", price: 70 }
  ]);

  useEffect(() => {
    api.get("/products/active")
      .then((res) => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setProductList(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState({ text: "", type: "" });

  const [form, setForm] = useState({
    code: "",
    description: "",
    discountType: "PERCENTAGE",
    value: "",
    minOrderAmount: "",
    maxDiscount: "",
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "ACTIVE",
    applicableTo: "ALL",
    targetProductName: ""
  });

  useEffect(() => {
    localStorage.setItem("milkAdminDiscounts", JSON.stringify(discounts));
    window.dispatchEvent(new CustomEvent("milk-discounts-updated", { detail: discounts }));
  }, [discounts]);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 3500);
  };

  const handleToggleStatus = (id) => {
    setDiscounts((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: d.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } : d
      )
    );
    showToast("Discount status updated!");
  };

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this discount coupon?")) return;
    setDiscounts((prev) => prev.filter((d) => d.id !== id));
    showToast("Discount coupon removed!");
  };

  const handleCreateDiscount = (e) => {
    e.preventDefault();
    if (!form.code || !form.value) {
      showToast("Please fill in coupon code and value.", "error");
      return;
    }

    const newDiscount = {
      id: Date.now(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || `${form.value}${form.discountType === "PERCENTAGE" ? "%" : " Rs."} Off`,
      discountType: form.discountType,
      value: parseFloat(form.value) || 0,
      minOrderAmount: parseFloat(form.minOrderAmount) || 0,
      maxDiscount: parseFloat(form.maxDiscount) || 0,
      validUntil: form.validUntil,
      status: form.status,
      targetProductName: form.applicableTo === "SPECIFIC" ? form.targetProductName : "",
      redemptionsCount: 0
    };

    setDiscounts([newDiscount, ...discounts]);
    showToast(`Coupon ${newDiscount.code} created successfully!`);
    setIsModalOpen(false);
    setForm({
      code: "",
      description: "",
      discountType: "PERCENTAGE",
      value: "",
      minOrderAmount: "",
      maxDiscount: "",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "ACTIVE",
      applicableTo: "ALL",
      targetProductName: ""
    });
  };

  const filteredDiscounts = discounts.filter((d) => {
    const matchesSearch =
      d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = discounts.filter((d) => d.status === "ACTIVE").length;

  return (
    <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      {/* Toast Alert */}
      {toast.text && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background: toast.type === "error" ? "#ef4444" : "#10b981",
            color: "white",
            padding: "14px 22px",
            borderRadius: "10px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            zIndex: 9999,
            fontWeight: "700",
            fontSize: "0.9rem"
          }}
        >
          {toast.text}
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.7rem", fontWeight: "800", color: "#0f172a", margin: "0 0 6px 0" }}>
            🏷️ Discount & Coupon Management
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
            Create and configure promotional discounts, coupon codes, and special seasonal offers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          style={{
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            padding: "12px 22px",
            fontWeight: "700",
            fontSize: "0.95rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)"
          }}
        >
          <span>＋</span> Create New Coupon
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px"
        }}
      >
        <div style={{ background: "#ffffff", padding: "18px 22px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Active Coupons</div>
          <div style={{ fontSize: "1.85rem", fontWeight: "900", color: "#16a34a", marginTop: "4px" }}>
            {activeCount}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "4px" }}>Available for customers</div>
        </div>

        <div style={{ background: "#ffffff", padding: "18px 22px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Total Offers Listed</div>
          <div style={{ fontSize: "1.85rem", fontWeight: "900", color: "#0f172a", marginTop: "4px" }}>
            {discounts.length}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "4px" }}>Across all time</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: "#ffffff",
          padding: "16px 20px",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          marginBottom: "20px",
          display: "flex",
          gap: "14px",
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "space-between"
        }}
      >
        <div style={{ flex: 1, minWidth: "260px" }}>
          <input
            type="text"
            placeholder="Search by Coupon Code or Description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1.5px solid #cbd5e1",
              fontSize: "0.9rem",
              outline: "none"
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "1.5px solid #cbd5e1",
            fontSize: "0.9rem",
            background: "#ffffff",
            fontWeight: "600",
            color: "#1e293b"
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {/* Discount Coupons Table */}
      <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#475569" }}>
              <th style={{ padding: "14px 18px", fontWeight: "700" }}>Coupon Code</th>
              <th style={{ padding: "14px 18px", fontWeight: "700" }}>Discount Offer</th>
              <th style={{ padding: "14px 18px", fontWeight: "700" }}>Min Order</th>
              <th style={{ padding: "14px 18px", fontWeight: "700" }}>Valid Until</th>
              <th style={{ padding: "14px 18px", fontWeight: "700" }}>Redemptions</th>
              <th style={{ padding: "14px 18px", fontWeight: "700" }}>Status</th>
              <th style={{ padding: "14px 18px", fontWeight: "700", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDiscounts.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                  No discount coupons match your criteria.
                </td>
              </tr>
            ) : (
              filteredDiscounts.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "14px 18px" }}>
                    <span
                      style={{
                        background: "#eff6ff",
                        color: "#1e40af",
                        padding: "5px 12px",
                        borderRadius: "8px",
                        fontWeight: "800",
                        letterSpacing: "0.5px",
                        fontFamily: "monospace",
                        fontSize: "0.95rem",
                        border: "1px dashed #bfdbfe"
                      }}
                    >
                      {item.code}
                    </span>
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ fontWeight: "700", color: "#0f172a" }}>
                      {item.discountType === "PERCENTAGE" ? `${item.value}% OFF` : `Rs. ${item.value} FLAT OFF`}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>
                      {item.description}
                    </div>
                    <div style={{ marginTop: "4px" }}>
                      {item.targetProductName ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: "700", color: "#0369a1", background: "#e0f2fe", border: "1px solid #bae6fd", padding: "2px 8px", borderRadius: "6px" }}>
                          🎯 Only: {item.targetProductName}
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: "600", color: "#475569", background: "#f1f5f9", padding: "2px 8px", borderRadius: "6px" }}>
                          🌐 All Products
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "14px 18px", color: "#334155" }}>
                    {item.minOrderAmount > 0 ? `Rs. ${item.minOrderAmount}` : "No Min."}
                  </td>
                  <td style={{ padding: "14px 18px", color: "#64748b" }}>
                    {new Date(item.validUntil).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "14px 18px", fontWeight: "700", color: "#0f172a" }}>
                    {item.redemptionsCount}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <span
                      style={{
                        background: item.status === "ACTIVE" ? "#dcfce7" : item.status === "EXPIRED" ? "#fee2e2" : "#f1f5f9",
                        color: item.status === "ACTIVE" ? "#15803d" : item.status === "EXPIRED" ? "#b91c1c" : "#64748b",
                        padding: "4px 10px",
                        borderRadius: "14px",
                        fontSize: "0.78rem",
                        fontWeight: "800"
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 18px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item.id)}
                        style={{
                          padding: "6px 12px",
                          background: item.status === "ACTIVE" ? "#fffbeb" : "#f0fdf4",
                          color: item.status === "ACTIVE" ? "#b45309" : "#166534",
                          border: "1px solid",
                          borderColor: item.status === "ACTIVE" ? "#fde68a" : "#bbf7d0",
                          borderRadius: "6px",
                          fontWeight: "700",
                          fontSize: "0.8rem",
                          cursor: "pointer"
                        }}
                      >
                        {item.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        style={{
                          padding: "6px 12px",
                          background: "#fef2f2",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                          borderRadius: "6px",
                          fontWeight: "700",
                          fontSize: "0.8rem",
                          cursor: "pointer"
                        }}
                      >
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

      {/* Create Coupon Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2500,
            padding: "16px"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              maxWidth: "500px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "26px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: "800", color: "#0f172a" }}>
                🏷️ Create New Coupon
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: "#f1f5f9", border: "none", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", fontSize: "1rem", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDiscount}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
                  Coupon Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MILK20 or FESTIVE50"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "0.95rem", textTransform: "uppercase", fontWeight: "700" }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20% off on all monthly milk subscriptions"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem" }}
                />
              </div>

              {/* Target Product Selection */}
              <div style={{ marginBottom: "16px", background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1.5px solid #e2e8f0" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "8px" }}>
                  🎯 Apply Discount To:
                </label>
                <div style={{ display: "flex", gap: "16px", marginBottom: form.applicableTo === "SPECIFIC" ? "10px" : "0px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.88rem", fontWeight: "600", color: "#334155", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="applicableTo"
                      checked={form.applicableTo === "ALL"}
                      onChange={() => setForm({ ...form, applicableTo: "ALL", targetProductName: "" })}
                    />
                    🌐 All Products
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.88rem", fontWeight: "600", color: "#334155", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="applicableTo"
                      checked={form.applicableTo === "SPECIFIC"}
                      onChange={() => setForm({ ...form, applicableTo: "SPECIFIC", targetProductName: form.targetProductName || productList[0]?.name || "Cow Milk" })}
                    />
                    🥛 Specific Product Only
                  </label>
                </div>

                {form.applicableTo === "SPECIFIC" && (
                  <div style={{ marginTop: "10px" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#1e40af", marginBottom: "4px" }}>
                      Select Product for Discount *
                    </label>
                    <select
                      value={form.targetProductName}
                      onChange={(e) => setForm({ ...form, targetProductName: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #3b82f6", fontSize: "0.9rem", fontWeight: "700", background: "#eff6ff", color: "#1e3a8a" }}
                    >
                      {productList.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name} {p.price ? `(Base: ₹${p.price})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
                    Discount Type
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem", fontWeight: "600" }}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (Rs.)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
                    Value ({form.discountType === "PERCENTAGE" ? "%" : "Rs."}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={form.discountType === "PERCENTAGE" ? "e.g. 15" : "e.g. 100"}
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
                    Min Order Amount (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={form.minOrderAmount}
                    onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                    style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
                    Valid Until
                  </label>
                  <input
                    type="date"
                    required
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                    style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, padding: "12px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 2, padding: "12px", background: "#2563eb", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: "800", cursor: "pointer" }}
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountAdmin;
