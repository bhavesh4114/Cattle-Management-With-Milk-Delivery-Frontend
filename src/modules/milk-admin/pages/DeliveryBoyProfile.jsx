import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const DeliveryBoyProfile = ({ onNavigateToDeliveries, onNavigateToLeaves }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveriesCount, setDeliveriesCount] = useState(0);
  const [leavesCount, setLeavesCount] = useState({ total: 0, approved: 0 });
  const [toast, setToast] = useState({ text: "", type: "" });
  
  // Mobile Edit State
  const [isEditingMobile, setIsEditingMobile] = useState(false);
  const [mobileInput, setMobileInput] = useState("");
  const [savingMobile, setSavingMobile] = useState(false);

  // Availability Modal State
  const [availModal, setAvailModal] = useState({ isOpen: false });
  const [availForm, setAvailForm] = useState({
    date: new Date().toISOString().split("T")[0],
    status: "Available",
  });
  const [savingAvail, setSavingAvail] = useState(false);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Profile
      const profRes = await api.get("/delivery/boys/my-profile");
      setProfileData(profRes.data);
      setMobileInput(profRes.data?.profile?.mobile || "");

      // 2. Fetch Deliveries
      try {
        const delivRes = await api.get("/delivery/my-deliveries");
        setDeliveriesCount(Array.isArray(delivRes.data) ? delivRes.data.length : 0);
      } catch (e) {
        console.error("Failed to load deliveries count", e);
      }

      // 3. Fetch Leaves
      try {
        const leavesRes = await api.get("/delivery/my-leaves");
        if (Array.isArray(leavesRes.data)) {
          const approved = leavesRes.data.filter((l) => l.status === "APPROVED").length;
          setLeavesCount({ total: leavesRes.data.length, approved });
        }
      } catch (e) {
        console.error("Failed to load leaves count", e);
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to load profile details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMobile = async () => {
    if (!mobileInput.trim()) {
      showToast("Mobile number cannot be empty", "error");
      return;
    }
    try {
      setSavingMobile(true);
      const res = await api.post("/delivery/boys/my-profile", {
        mobile: mobileInput.trim(),
      });
      showToast("Mobile number updated successfully!");
      setIsEditingMobile(false);
      setProfileData((prev) => ({
        ...prev,
        profile: { ...prev.profile, mobile: mobileInput.trim() },
      }));
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update mobile number", "error");
    } finally {
      setSavingMobile(false);
    }
  };

  const handleSaveAvailability = async () => {
    try {
      setSavingAvail(true);
      await api.post("/delivery/boys/my-availability", availForm);
      showToast(`Availability set to ${availForm.status} for ${availForm.date}`);
      setAvailModal({ isOpen: false });
      
      // Update local profile state if today
      const today = new Date().toISOString().split("T")[0];
      if (availForm.date === today) {
        setProfileData((prev) => ({
          ...prev,
          profile: { ...prev.profile, dailyStatus: availForm.status },
        }));
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update availability", "error");
    } finally {
      setSavingAvail(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
        <div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div>
        <div>Loading your delivery profile...</div>
      </div>
    );
  }

  const admin = profileData?.admin || {};
  const profile = profileData?.profile || {};
  const dailyStatus = profile?.dailyStatus || "Available";
  const accountStatus = profile?.accountStatus || admin?.status || "Active";
  const pincodes = profile?.pincodes || [];
  const radius = profile?.deliveryRadius || 10;

  return (
    <div style={{ maxWidth: "1050px", margin: "0 auto" }}>
      {/* Toast Notification */}
      {toast.text && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "14px 20px",
            background: toast.type === "error" ? "#ef4444" : "#10b981",
            color: "white",
            borderRadius: "10px",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: 500,
          }}
        >
          {toast.type === "error" ? "⚠️" : "✅"} {toast.text}
        </div>
      )}

      {/* Hero Profile Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
          borderRadius: "18px",
          padding: "32px",
          color: "white",
          marginBottom: "24px",
          boxShadow: "0 10px 25px -5px rgba(30, 58, 138, 0.25)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(4px)",
              border: "3px solid rgba(255, 255, 255, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "38px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            🚴‍♂️
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "700" }}>{admin.name || "Delivery Boy"}</h2>
              <span
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {admin.customRole?.name || "Delivery Staff"}
              </span>
            </div>
            <div style={{ color: "#bfdbfe", fontSize: "14px", marginTop: "4px" }}>
              ✉️ {admin.email} {profile.mobile ? ` | 📱 ${profile.mobile}` : ""}
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  background: accountStatus === "Active" ? "#10b981" : "#ef4444",
                  color: "white",
                  padding: "2px 10px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                ● Account: {accountStatus}
              </span>
              <span
                style={{
                  background:
                    dailyStatus === "Available"
                      ? "#10b981"
                      : dailyStatus === "On Leave"
                      ? "#f59e0b"
                      : "#ef4444",
                  color: "white",
                  padding: "2px 10px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                ● Today: {dailyStatus}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setAvailModal({ isOpen: true })}
          style={{
            background: "rgba(255, 255, 255, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.4)",
            color: "white",
            padding: "10px 18px",
            borderRadius: "10px",
            fontWeight: "600",
            fontSize: "13.5px",
            cursor: "pointer",
            backdropFilter: "blur(4px)",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")}
        >
          📅 Set My Availability
        </button>
      </div>

      {/* Stats Cards Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          onClick={onNavigateToDeliveries}
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            cursor: onNavigateToDeliveries ? "pointer" : "default",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => onNavigateToDeliveries && (e.currentTarget.style.borderColor = "#3b82f6")}
          onMouseLeave={(e) => onNavigateToDeliveries && (e.currentTarget.style.borderColor = "#e2e8f0")}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>
              Active Deliveries
            </span>
            <span style={{ fontSize: "20px" }}>🛵</span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: "#1e3a8a", marginTop: "6px" }}>
            {deliveriesCount}
          </div>
          <div style={{ fontSize: "12.5px", color: "#3b82f6", fontWeight: "600", marginTop: "4px" }}>
            View Deliveries &rarr;
          </div>
        </div>

        <div
          onClick={onNavigateToLeaves}
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            cursor: onNavigateToLeaves ? "pointer" : "default",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => onNavigateToLeaves && (e.currentTarget.style.borderColor = "#3b82f6")}
          onMouseLeave={(e) => onNavigateToLeaves && (e.currentTarget.style.borderColor = "#e2e8f0")}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>
              Approved Leaves
            </span>
            <span style={{ fontSize: "20px" }}>🏖️</span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: "#166534", marginTop: "6px" }}>
            {leavesCount.approved}
          </div>
          <div style={{ fontSize: "12.5px", color: "#15803d", fontWeight: "600", marginTop: "4px" }}>
            {leavesCount.total} total applied &rarr;
          </div>
        </div>

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>
              Assigned Areas
            </span>
            <span style={{ fontSize: "20px" }}>📍</span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a", marginTop: "6px" }}>
            {pincodes.length}
          </div>
          <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px" }}>
            Covering ~{radius} km radius
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "24px",
          marginBottom: "24px",
        }}
      >
        {/* Card 1: Personal & Account Details */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            padding: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "18px",
              paddingBottom: "12px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700", color: "#0f172a" }}>
              👤 Personal & Account Details
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                Full Name
              </div>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a", marginTop: "2px" }}>
                {admin.name || "N/A"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                Email Address
              </div>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a", marginTop: "2px" }}>
                {admin.email || "N/A"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                Mobile Number
              </div>
              {isEditingMobile ? (
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <input
                    type="tel"
                    value={mobileInput}
                    onChange={(e) => setMobileInput(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                    }}
                  />
                  <button
                    disabled={savingMobile}
                    onClick={handleSaveMobile}
                    style={{
                      background: "#10b981",
                      color: "white",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      fontWeight: "600",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    {savingMobile ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingMobile(false);
                      setMobileInput(profile.mobile || "");
                    }}
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      color: "#475569",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      fontWeight: "600",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "2px" }}>
                  <span style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>
                    {profile.mobile || "Not specified"}
                  </span>
                  <button
                    onClick={() => setIsEditingMobile(true)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#2563eb",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    ✏️ Edit
                  </button>
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                Role / Designation
              </div>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a", marginTop: "2px" }}>
                {admin.customRole?.name || "Delivery Partner"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                Account Status
              </div>
              <div style={{ marginTop: "4px" }}>
                <span
                  style={{
                    background: accountStatus === "Active" ? "#dcfce7" : "#fee2e2",
                    color: accountStatus === "Active" ? "#166534" : "#991b1b",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "12.5px",
                    fontWeight: "600",
                  }}
                >
                  {accountStatus}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                Member Since
              </div>
              <div style={{ fontSize: "14px", color: "#475569", marginTop: "2px" }}>
                {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Delivery Area & Operational Details */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            padding: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "18px",
              paddingBottom: "12px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700", color: "#0f172a" }}>
              📍 Delivery Area & Operations
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                Assigned Delivery Pincodes
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                {pincodes.length > 0 ? (
                  pincodes.map((pin) => (
                    <span
                      key={pin}
                      style={{
                        background: "#eff6ff",
                        color: "#1e40af",
                        border: "1px solid #bfdbfe",
                        padding: "4px 12px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      📍 {pin}
                    </span>
                  ))
                ) : (
                  <span style={{ color: "#94a3b8", fontSize: "13.5px" }}>No specific pincodes assigned.</span>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                Delivery Operating Radius
              </div>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a", marginTop: "4px" }}>
                {radius} Kilometers (km)
              </div>
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                Today's Working Status
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px" }}>
                <span
                  style={{
                    background:
                      dailyStatus === "Available"
                        ? "#dcfce7"
                        : dailyStatus === "On Leave"
                        ? "#fef3c7"
                        : "#fee2e2",
                    color:
                      dailyStatus === "Available"
                        ? "#166534"
                        : dailyStatus === "On Leave"
                        ? "#b45309"
                        : "#991b1b",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  {dailyStatus === "Available"
                    ? "🟢 Available for Delivery"
                    : dailyStatus === "On Leave"
                    ? "🟡 On Approved Leave"
                    : "🔴 Unavailable"}
                </span>
                <button
                  onClick={() => setAvailModal({ isOpen: true })}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#2563eb",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Change &rarr;
                </button>
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div style={{ marginTop: "12px", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", marginBottom: "10px" }}>
                Quick Navigation
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {onNavigateToDeliveries && (
                  <button
                    onClick={onNavigateToDeliveries}
                    style={{
                      flex: 1,
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      color: "#1e3a8a",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    🛵 My Deliveries
                  </button>
                )}
                {onNavigateToLeaves && (
                  <button
                    onClick={onNavigateToLeaves}
                    style={{
                      flex: 1,
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      color: "#166534",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    🏖️ Apply / View Leaves
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Set Availability Modal */}
      {availModal.isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "400px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
              padding: "24px",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", color: "#0f172a", fontSize: "1.2rem", fontWeight: "700" }}>
              📅 Set My Availability
            </h3>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                Select Date
              </label>
              <input
                type="date"
                value={availForm.date}
                onChange={(e) => setAvailForm({ ...availForm, date: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box",
                  fontSize: "14px",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                Status
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {["Available", "On Leave", "Unavailable"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAvailForm({ ...availForm, status: s })}
                    style={{
                      flex: 1,
                      padding: "10px 6px",
                      border: "1px solid",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "600",
                      borderColor:
                        availForm.status === s
                          ? s === "Available"
                            ? "#16a34a"
                            : s === "On Leave"
                            ? "#d97706"
                            : "#dc2626"
                          : "#cbd5e1",
                      background:
                        availForm.status === s
                          ? s === "Available"
                            ? "#dcfce7"
                            : s === "On Leave"
                            ? "#fef3c7"
                            : "#fee2e2"
                          : "white",
                      color:
                        availForm.status === s
                          ? s === "Available"
                            ? "#16a34a"
                            : s === "On Leave"
                            ? "#d97706"
                            : "#dc2626"
                          : "#64748b",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setAvailModal({ isOpen: false })}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "white",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAvail}
                onClick={handleSaveAvailability}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#1e3a8a",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: savingAvail ? "not-allowed" : "pointer",
                  fontWeight: "700",
                }}
              >
                {savingAvail ? "Saving..." : "Save Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryBoyProfile;
