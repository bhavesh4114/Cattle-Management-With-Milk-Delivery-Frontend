import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const STATUS_BADGES = {
  PENDING: { label: "Pending", bg: "#fef3c7", color: "#92400e" },
  IN_PROGRESS: { label: "In Progress", bg: "#dbeafe", color: "#1e40af" },
  RESOLVED: { label: "Resolved", bg: "#dcfce7", color: "#166534" },
  REOPENED: { label: "Reopened", bg: "#f3e8ff", color: "#6b21a8" }
};

const AdminFeedbackComplaints = () => {
  const [activeTab, setActiveTab] = useState("complaints"); // "complaints" | "feedbacks"
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Complaints state
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [complaintSearch, setComplaintSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [staffList, setStaffList] = useState([]);

  // Complaint edit modal state
  const [editStatus, setEditStatus] = useState("PENDING");
  const [editStaffId, setEditStaffId] = useState("");
  const [editAdminNotes, setEditAdminNotes] = useState("");
  const [editResolutionNotes, setEditResolutionNotes] = useState("");
  const [savingComplaint, setSavingComplaint] = useState(false);

  // Feedbacks state
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState("ALL");
  const [feedbackSearch, setFeedbackSearch] = useState("");

  const [toast, setToast] = useState({ text: "", type: "" });

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  useEffect(() => {
    fetchStats();
    fetchStaff();
    fetchComplaints();
    fetchFeedbacks();
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await api.get("/feedback-complaints/admin/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await api.get("/feedback-complaints/admin/staff-list");
      setStaffList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch staff list", err);
    }
  };

  const fetchComplaints = async () => {
    setLoadingComplaints(true);
    try {
      const query = new URLSearchParams();
      if (complaintSearch) query.append("search", complaintSearch);
      if (statusFilter !== "ALL") query.append("status", statusFilter);
      if (categoryFilter !== "ALL") query.append("category", categoryFilter);

      const res = await api.get(`/feedback-complaints/admin/complaints?${query.toString()}`);
      setComplaints(res.data || []);
    } catch (err) {
      console.error("Failed to fetch complaints", err);
      showToast("Failed to load complaints", "error");
    } finally {
      setLoadingComplaints(false);
    }
  };

  const fetchFeedbacks = async () => {
    setLoadingFeedbacks(true);
    try {
      const query = new URLSearchParams();
      if (feedbackRatingFilter !== "ALL") query.append("rating", feedbackRatingFilter);
      if (feedbackSearch) query.append("search", feedbackSearch);

      const res = await api.get(`/feedback-complaints/admin/feedbacks?${query.toString()}`);
      setFeedbacks(res.data || []);
    } catch (err) {
      console.error("Failed to fetch feedbacks", err);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const handleOpenComplaintDetail = async (complaintId) => {
    try {
      const res = await api.get(`/feedback-complaints/admin/complaints/${complaintId}`);
      setSelectedComplaint(res.data);
      setEditStatus(res.data.status);
      setEditStaffId(res.data.assignedStaffId || "");
      setEditAdminNotes(res.data.adminNotes || "");
      setEditResolutionNotes(res.data.resolutionNotes || "");
    } catch (err) {
      showToast("Failed to load complaint details", "error");
    }
  };

  const handleSaveComplaint = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setSavingComplaint(true);
    try {
      await api.patch(`/feedback-complaints/admin/complaints/${selectedComplaint.id}`, {
        status: editStatus,
        assignedStaffId: editStaffId || null,
        adminNotes: editAdminNotes,
        resolutionNotes: editResolutionNotes
      });

      showToast("Complaint updated and customer notified!");
      setSelectedComplaint(null);
      fetchStats();
      fetchComplaints();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update complaint", "error");
    } finally {
      setSavingComplaint(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <span style={{ color: "#f59e0b", letterSpacing: "1px", fontSize: "1.1rem" }}>
        {"★".repeat(rating || 0)}
        <span style={{ color: "#cbd5e1" }}>{"★".repeat(Math.max(0, 5 - (rating || 0)))}</span>
      </span>
    );
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Toast Notification */}
      {toast.text && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: "10px",
            fontSize: "0.9rem",
            fontWeight: "700",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            background: toast.type === "error" ? "#ef4444" : "#10b981",
            color: "white"
          }}
        >
          {toast.text}
        </div>
      )}

      {/* Header Banner */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 6px 0", fontSize: "1.8rem", fontWeight: "900", color: "#0f172a" }}>
          💬 Customer Feedback & Complaints Management
        </h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
          Monitor customer satisfaction, resolve delivery grievances, and track ratings in real-time.
        </p>
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "28px"
        }}
      >
        {/* Total Complaints */}
        <div style={{ background: "#ffffff", padding: "18px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Total Complaints</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#0f172a", marginTop: "4px" }}>
            {loadingStats ? "..." : stats?.totalComplaints || 0}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "4px" }}>All-time reported</div>
        </div>

        {/* Pending */}
        <div style={{ background: "#fffbeb", padding: "18px", borderRadius: "14px", border: "1px solid #fde68a" }}>
          <div style={{ fontSize: "0.8rem", color: "#92400e", fontWeight: "700", textTransform: "uppercase" }}>Pending Attention</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#b45309", marginTop: "4px" }}>
            {loadingStats ? "..." : stats?.pendingComplaints || 0}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#b45309", marginTop: "4px" }}>Needs initial review</div>
        </div>

        {/* In Progress */}
        <div style={{ background: "#eff6ff", padding: "18px", borderRadius: "14px", border: "1px solid #bfdbfe" }}>
          <div style={{ fontSize: "0.8rem", color: "#1e40af", fontWeight: "700", textTransform: "uppercase" }}>Under Investigation</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#2563eb", marginTop: "4px" }}>
            {loadingStats ? "..." : stats?.inProgressComplaints || 0}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#1e40af", marginTop: "4px" }}>Active staff follow-up</div>
        </div>

        {/* Resolved */}
        <div style={{ background: "#f0fdf4", padding: "18px", borderRadius: "14px", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: "0.8rem", color: "#166534", fontWeight: "700", textTransform: "uppercase" }}>Resolved</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#16a34a", marginTop: "4px" }}>
            {loadingStats ? "..." : stats?.resolvedComplaints || 0}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#166534", marginTop: "4px" }}>Successfully closed</div>
        </div>

        {/* Overall Rating KPI */}
        <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "white", padding: "18px", borderRadius: "14px" }}>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Avg Rating Score</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#f59e0b", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>★</span> {loadingStats ? "..." : `${stats?.feedbackStats?.avgRating || 0} / 5`}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#cbd5e1", marginTop: "4px" }}>
            From {stats?.feedbackStats?.totalFeedbacks || 0} reviews
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "2px solid #e2e8f0" }}>
        <button
          onClick={() => setActiveTab("complaints")}
          style={{
            padding: "12px 24px",
            border: "none",
            background: "none",
            borderBottom: activeTab === "complaints" ? "3px solid #ef4444" : "3px solid transparent",
            color: activeTab === "complaints" ? "#ef4444" : "#64748b",
            fontWeight: "800",
            fontSize: "1rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span>🛡️</span> Complaints Management
          {stats?.pendingComplaints > 0 && (
            <span style={{ background: "#ef4444", color: "white", padding: "2px 8px", borderRadius: "10px", fontSize: "0.75rem" }}>
              {stats.pendingComplaints}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("feedbacks")}
          style={{
            padding: "12px 24px",
            border: "none",
            background: "none",
            borderBottom: activeTab === "feedbacks" ? "3px solid #f59e0b" : "3px solid transparent",
            color: activeTab === "feedbacks" ? "#f59e0b" : "#64748b",
            fontWeight: "800",
            fontSize: "1rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span>⭐</span> Customer Feedbacks & Rating Analytics
        </button>
      </div>

      {/* TAB 1: COMPLAINTS MANAGEMENT */}
      {activeTab === "complaints" && (
        <div>
          {/* Filters Bar */}
          <div
            style={{
              background: "#ffffff",
              padding: "16px",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              marginBottom: "20px",
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            {/* Search Input */}
            <div style={{ flex: 1, minWidth: "240px" }}>
              <input
                type="text"
                placeholder="Search by Complaint ID, Customer Name, Delivery Boy..."
                value={complaintSearch}
                onChange={(e) => setComplaintSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchComplaints()}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.9rem",
                  boxSizing: "border-box",
                  outline: "none"
                }}
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
              }}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1.5px solid #cbd5e1",
                fontSize: "0.9rem",
                background: "white",
                fontWeight: "600",
                color: "#1e293b"
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REOPENED">Reopened</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
              }}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1.5px solid #cbd5e1",
                fontSize: "0.9rem",
                background: "white",
                fontWeight: "600",
                color: "#1e293b"
              }}
            >
              <option value="ALL">All Categories</option>
              <option value="Late or incomplete delivery">Late or incomplete delivery</option>
              <option value="Wrong milk quantity">Wrong milk quantity</option>
              <option value="Product quality">Product quality</option>
              <option value="Missing product">Missing product</option>
              <option value="Delivery boy behaviour">Delivery boy behaviour</option>
              <option value="Payment issue">Payment issue</option>
              <option value="Other">Other</option>
            </select>

            <button
              onClick={fetchComplaints}
              style={{
                padding: "10px 18px",
                background: "#0f172a",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "0.9rem"
              }}
            >
              Apply Filter
            </button>
          </div>

          {/* Complaints Table */}
          {loadingComplaints ? (
            <div style={{ textAlign: "center", padding: "60px" }}>
              <div style={{ width: "40px", height: "40px", border: "4px solid #e2e8f0", borderTopColor: "#ef4444", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }}></div>
              <p style={{ color: "#64748b" }}>Loading complaints...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : complaints.length === 0 ? (
            <div style={{ background: "#ffffff", padding: "40px", borderRadius: "14px", textAlign: "center", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>✅</div>
              <h3 style={{ margin: "0 0 4px 0", color: "#0f172a" }}>No Complaints Found</h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>No customer complaints matched the selected filters.</p>
            </div>
          ) : (
            <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#475569" }}>
                    <th style={{ padding: "14px 16px", fontWeight: "700" }}>Complaint ID</th>
                    <th style={{ padding: "14px 16px", fontWeight: "700" }}>Customer</th>
                    <th style={{ padding: "14px 16px", fontWeight: "700" }}>Order Item</th>
                    <th style={{ padding: "14px 16px", fontWeight: "700" }}>Delivery Boy</th>
                    <th style={{ padding: "14px 16px", fontWeight: "700" }}>Category</th>
                    <th style={{ padding: "14px 16px", fontWeight: "700" }}>Status</th>
                    <th style={{ padding: "14px 16px", fontWeight: "700" }}>Date</th>
                    <th style={{ padding: "14px 16px", fontWeight: "700", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((item) => {
                    const badge = STATUS_BADGES[item.status] || STATUS_BADGES.PENDING;

                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                        <td style={{ padding: "14px 16px", fontWeight: "800", color: "#0f172a" }}>
                          {item.complaintCode}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: "700", color: "#1e293b" }}>{item.customer?.name || "Customer"}</div>
                          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{item.customer?.email}</div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ fontWeight: "600", color: "#334155" }}>
                            {item.orderDetail?.milkType || item.orderType}
                          </span>
                          <span style={{ fontSize: "0.8rem", color: "#64748b", display: "block" }}>
                            #{item.orderId} ({item.orderType})
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          {item.deliveryBoy ? (
                            <span style={{ fontWeight: "600", color: "#1e293b" }}>{item.deliveryBoy.name}</span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>Unassigned</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", fontSize: "0.82rem", fontWeight: "600", color: "#334155" }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              background: badge.bg,
                              color: badge.color,
                              padding: "4px 10px",
                              borderRadius: "14px",
                              fontWeight: "800",
                              fontSize: "0.78rem"
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", color: "#64748b", fontSize: "0.82rem" }}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          <button
                            onClick={() => handleOpenComplaintDetail(item.id)}
                            style={{
                              padding: "6px 14px",
                              background: "#0284c7",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              fontWeight: "700",
                              cursor: "pointer",
                              fontSize: "0.85rem"
                            }}
                          >
                            Investigate ➔
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CUSTOMER FEEDBACKS & ANALYTICS */}
      {activeTab === "feedbacks" && (
        <div>
          {/* Analytics Overview Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "16px",
              marginBottom: "24px"
            }}
          >
            {/* Overall Rating Card */}
            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "700" }}>⭐ Overall Customer Satisfaction</div>
              <div style={{ fontSize: "2.2rem", fontWeight: "900", color: "#0f172a", marginTop: "6px" }}>
                {stats?.feedbackStats?.avgRating || 0} <span style={{ fontSize: "1.2rem", color: "#94a3b8" }}>/ 5</span>
              </div>
              <div style={{ marginTop: "4px" }}>{renderStars(Math.round(stats?.feedbackStats?.avgRating || 0))}</div>
            </div>

            {/* Delivery Boy Rating Card */}
            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "700" }}>🛵 Delivery Boy Politeness & Service</div>
              <div style={{ fontSize: "2.2rem", fontWeight: "900", color: "#0f172a", marginTop: "6px" }}>
                {stats?.feedbackStats?.avgBoyRating || 0} <span style={{ fontSize: "1.2rem", color: "#94a3b8" }}>/ 5</span>
              </div>
              <div style={{ marginTop: "4px" }}>{renderStars(Math.round(stats?.feedbackStats?.avgBoyRating || 0))}</div>
            </div>

            {/* Product Quality Card */}
            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "700" }}>🥛 Milk Quality & Freshness</div>
              <div style={{ fontSize: "2.2rem", fontWeight: "900", color: "#0f172a", marginTop: "6px" }}>
                {stats?.feedbackStats?.avgQualityRating || 0} <span style={{ fontSize: "1.2rem", color: "#94a3b8" }}>/ 5</span>
              </div>
              <div style={{ marginTop: "4px" }}>{renderStars(Math.round(stats?.feedbackStats?.avgQualityRating || 0))}</div>
            </div>
          </div>

          {/* Rating Distribution Breakdown */}
          {stats?.feedbackStats && (
            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
              <h3 style={{ margin: "0 0 14px 0", fontSize: "1rem", fontWeight: "800", color: "#0f172a" }}>
                Rating Distribution ({stats.feedbackStats.totalFeedbacks} Total Reviews)
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = stats.feedbackStats.ratingDistribution[stars] || 0;
                  const pct = stats.feedbackStats.totalFeedbacks > 0
                    ? Math.round((count / stats.feedbackStats.totalFeedbacks) * 100)
                    : 0;

                  return (
                    <div key={stars} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.85rem" }}>
                      <span style={{ width: "55px", fontWeight: "700", color: "#475569" }}>{stars} Stars</span>
                      <div style={{ flex: 1, height: "10px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: stars >= 4 ? "#10b981" : stars === 3 ? "#f59e0b" : "#ef4444" }}></div>
                      </div>
                      <span style={{ width: "70px", color: "#64748b", textAlign: "right" }}>{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Feedback Filter Bar */}
          <div style={{ background: "#ffffff", padding: "16px", borderRadius: "14px", border: "1px solid #e2e8f0", marginBottom: "20px", display: "flex", gap: "12px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search written reviews or customer name..."
              value={feedbackSearch}
              onChange={(e) => setFeedbackSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchFeedbacks()}
              style={{ flex: 1, padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem" }}
            />
            <select
              value={feedbackRatingFilter}
              onChange={(e) => setFeedbackRatingFilter(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem", background: "white", fontWeight: "600" }}
            >
              <option value="ALL">All Star Ratings</option>
              <option value="5">5 Stars Only</option>
              <option value="4">4 Stars Only</option>
              <option value="3">3 Stars Only</option>
              <option value="2">2 Stars Only</option>
              <option value="1">1 Star Only</option>
            </select>
            <button
              onClick={fetchFeedbacks}
              style={{ padding: "10px 18px", background: "#0f172a", color: "white", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}
            >
              Filter
            </button>
          </div>

          {/* Feedback List Cards */}
          {loadingFeedbacks ? (
            <div style={{ textAlign: "center", padding: "60px" }}>
              <div style={{ width: "40px", height: "40px", border: "4px solid #e2e8f0", borderTopColor: "#f59e0b", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }}></div>
              <p style={{ color: "#64748b" }}>Loading reviews...</p>
            </div>
          ) : feedbacks.length === 0 ? (
            <div style={{ background: "#ffffff", padding: "40px", borderRadius: "14px", textAlign: "center", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>💬</div>
              <h3 style={{ margin: "0 0 4px 0", color: "#0f172a" }}>No Reviews Recorded Yet</h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>Feedback submitted by customers on delivered orders will appear here.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
              {feedbacks.map((f) => (
                <div key={f.id} style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "0.95rem" }}>
                        {f.customer?.name || "Customer"}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                        {new Date(f.createdAt).toLocaleDateString()} · #{f.orderId} ({f.orderType})
                      </div>
                    </div>
                    <div>{renderStars(f.rating)}</div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px", fontSize: "0.8rem" }}>
                    {f.deliveryBoyRating && (
                      <span style={{ background: "#eff6ff", color: "#1e40af", padding: "2px 8px", borderRadius: "12px", fontWeight: "700" }}>
                        🛵 Delivery: {f.deliveryBoyRating}★
                      </span>
                    )}
                    {f.productQualityRating && (
                      <span style={{ background: "#f0fdf4", color: "#166534", padding: "2px 8px", borderRadius: "12px", fontWeight: "700" }}>
                        🥛 Quality: {f.productQualityRating}★
                      </span>
                    )}
                  </div>

                  {f.review ? (
                    <p style={{ margin: 0, fontSize: "0.88rem", color: "#334155", fontStyle: "italic", background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                      "{f.review}"
                    </p>
                  ) : (
                    <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic" }}>No written comment provided.</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Complaint Investigation Modal / Drawer */}
      {selectedComplaint && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              maxWidth: "680px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
              border: "1px solid #e2e8f0"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "#ffffff",
                borderTopLeftRadius: "20px",
                borderTopRightRadius: "20px"
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: "900" }}>
                  Complaint Investigation: {selectedComplaint.complaintCode}
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
                  Reported on {new Date(selectedComplaint.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#ffffff",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "1rem"
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveComplaint} style={{ padding: "24px" }}>
              {/* Customer & Delivery Boy Info Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "18px" }}>
                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Customer Details</div>
                  <div style={{ fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>{selectedComplaint.customer?.name}</div>
                  <div style={{ fontSize: "0.82rem", color: "#475569" }}>{selectedComplaint.customer?.email}</div>
                  <div style={{ fontSize: "0.82rem", color: "#475569" }}>{selectedComplaint.orderDetail?.address}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Delivery Boy Details</div>
                  {selectedComplaint.deliveryBoy ? (
                    <>
                      <div style={{ fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>{selectedComplaint.deliveryBoy.name}</div>
                      <div style={{ fontSize: "0.82rem", color: "#475569" }}>{selectedComplaint.deliveryBoy.deliveryProfile?.mobile || selectedComplaint.deliveryBoy.email}</div>
                    </>
                  ) : (
                    <div style={{ color: "#94a3b8", marginTop: "4px", fontSize: "0.85rem" }}>No delivery partner was assigned</div>
                  )}
                </div>
              </div>

              {/* Order Info */}
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px 16px", borderRadius: "10px", marginBottom: "18px", fontSize: "0.88rem", display: "flex", justifyContent: "space-between" }}>
                <span><strong>Order:</strong> #{selectedComplaint.orderId} ({selectedComplaint.orderType}) · {selectedComplaint.orderDetail?.milkType}</span>
                <span><strong>Qty:</strong> {selectedComplaint.orderDetail?.dailyQuantity}L</span>
              </div>

              {/* Category & Description */}
              <div style={{ marginBottom: "18px" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#475569", marginBottom: "4px" }}>
                  Category: <span style={{ color: "#dc2626" }}>{selectedComplaint.category}</span>
                </div>
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "14px", borderRadius: "10px", color: "#991b1b", fontSize: "0.92rem" }}>
                  "{selectedComplaint.description}"
                </div>
              </div>

              {/* Photo Evidence if uploaded */}
              {selectedComplaint.attachment && (
                <div style={{ marginBottom: "18px" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>Photo Evidence:</div>
                  <a href={selectedComplaint.attachment} target="_blank" rel="noreferrer">
                    <img
                      src={selectedComplaint.attachment}
                      alt="Complaint Evidence"
                      style={{ maxHeight: "160px", borderRadius: "10px", border: "1px solid #cbd5e1", display: "block" }}
                    />
                  </a>
                </div>
              )}

              {/* Status Update & Staff Assignment */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
                    Update Status *
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem", fontWeight: "700" }}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="REOPENED">REOPENED</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
                    Assign Responsible Staff
                  </label>
                  <select
                    value={editStaffId}
                    onChange={(e) => setEditStaffId(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem" }}
                  >
                    <option value="">-- Unassigned --</option>
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.customRole?.name || st.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resolution Notes */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
                  Resolution Notes (Visible to Customer when Resolved)
                </label>
                <textarea
                  rows="3"
                  value={editResolutionNotes}
                  onChange={(e) => setEditResolutionNotes(e.target.value)}
                  placeholder="e.g. Apologized to customer, dispatched replacement 1L bottle with morning delivery, issued Rs. 60 wallet credit..."
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem", fontFamily: "inherit" }}
                />
              </div>

              {/* Admin Internal Notes */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
                  Internal Admin Investigation Notes (Staff Only)
                </label>
                <textarea
                  rows="2"
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  placeholder="e.g. Delivery boy Ramesh had bike puncture, warned about timely dispatch..."
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem", fontFamily: "inherit" }}
                />
              </div>

              {/* Status History Timeline */}
              {selectedComplaint.history?.length > 0 && (
                <div style={{ marginBottom: "20px", background: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
                    Status History & Audit Trail
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedComplaint.history.map((h) => (
                      <div key={h.id} style={{ fontSize: "0.82rem", color: "#334155" }}>
                        <span style={{ fontWeight: "700", color: "#0f172a" }}>[{h.status}]</span>{" "}
                        <span>{new Date(h.createdAt).toLocaleString()}</span> —{" "}
                        <span style={{ fontStyle: "italic" }}>{h.notes || "Status change"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit / Cancel Actions */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  style={{ flex: 1, padding: "12px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingComplaint}
                  style={{ flex: 2, padding: "12px", background: "#0284c7", color: "white", border: "none", borderRadius: "10px", fontWeight: "800", cursor: savingComplaint ? "not-allowed" : "pointer" }}
                >
                  {savingComplaint ? "Saving & Notifying..." : "Save Status & Notify Customer ➔"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeedbackComplaints;
