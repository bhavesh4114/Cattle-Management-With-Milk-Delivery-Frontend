import React, { useState, useEffect, useCallback } from "react";
import api from "../../../../services/api";

const ReferralAdmin = () => {
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState({ totalReferrals: 0, successfulConversions: 0, rewardsDistributed: 0 });
  const [settings, setSettings] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [settingsForm, setSettingsForm] = useState({
    isEnabled: true,
    rewardTarget: "BOTH",
    referrerCouponId: "",
    refereeCouponId: "",
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [refRes, settRes, coupRes] = await Promise.all([
        api.get("/referral/list", { params: { search: searchTerm } }),
        api.get("/referral/settings"),
        api.get("/coupons"),
      ]);

      const refData = refRes.data;
      setReferrals(refData.referrals || []);
      setStats(refData.stats || { totalReferrals: 0, successfulConversions: 0, rewardsDistributed: 0 });

      if (settRes.data) {
        setSettings(settRes.data);
        setSettingsForm({
          isEnabled: settRes.data.isEnabled ?? true,
          rewardTarget: settRes.data.rewardTarget || "BOTH",
          referrerCouponId: settRes.data.referrerCouponId || "",
          refereeCouponId: settRes.data.refereeCouponId || "",
        });
      }

      setCoupons(coupRes.data || []);
    } catch (err) {
      console.error("Failed to load referral data", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await api.put("/referral/settings", settingsForm);
      setSettings(res.data.settings || res.data);
      showToast("✅ Referral policy settings saved successfully!");
    } catch (err) {
      showToast("❌ " + (err.response?.data?.message || "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  const referrerCoupon = coupons.find((c) => c.id === settings?.referrerCouponId);
  const refereeCoupon = coupons.find((c) => c.id === settings?.refereeCouponId);

  return (
    <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: toast.includes("❌") ? "#fef2f2" : "#f0fdf4",
          color: toast.includes("❌") ? "#991b1b" : "#166534",
          padding: "14px 22px", borderRadius: "12px",
          border: `1px solid ${toast.includes("❌") ? "#fecaca" : "#bbf7d0"}`,
          fontSize: "0.92rem", fontWeight: "700",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          animation: "slideIn 0.3s ease",
        }}>
          {toast}
        </div>
      )}

      {/* Header Banner */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.7rem", fontWeight: "800", color: "#0f172a", margin: "0 0 6px 0" }}>
          👥 Referral Program Management
        </h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
          Track customer referrals, reward distribution, and manage referral policy settings.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⏳</div>
          <p style={{ fontWeight: "600" }}>Loading referral data...</p>
        </div>
      ) : (
        <>
          {/* KPI Stats Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
            <div style={{ background: "#ffffff", padding: "18px 22px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Total Referrals</div>
              <div style={{ fontSize: "1.85rem", fontWeight: "900", color: "#2563eb", marginTop: "4px" }}>{stats.totalReferrals}</div>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "4px" }}>Invited customers</div>
            </div>
            <div style={{ background: "#ffffff", padding: "18px 22px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: "0.8rem", color: "#166534", fontWeight: "700", textTransform: "uppercase" }}>Successful Conversions</div>
              <div style={{ fontSize: "1.85rem", fontWeight: "900", color: "#16a34a", marginTop: "4px" }}>{stats.successfulConversions}</div>
              <div style={{ fontSize: "0.78rem", color: "#166534", marginTop: "4px" }}>Completed referrals</div>
            </div>
            <div style={{ background: "#ffffff", padding: "18px 22px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Coupons Awarded</div>
              <div style={{ fontSize: "1.85rem", fontWeight: "900", color: "#0f172a", marginTop: "4px" }}>{stats.rewardsDistributed}</div>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "4px" }}>Referral reward coupons given</div>
            </div>
          </div>

          {/* Referral Policy Settings */}
          <div style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
            borderRadius: "16px", border: "1px solid #bfdbfe",
            padding: "20px 24px", marginBottom: "24px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ fontSize: "1.4rem" }}>⚙️</span>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: "#1e3a8a" }}>
                Referral Reward Policy Settings
              </h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "16px" }}>
              {/* Enable / Disable */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                  Program Status
                </label>
                <select
                  value={settingsForm.isEnabled ? "true" : "false"}
                  onChange={(e) => setSettingsForm({ ...settingsForm, isEnabled: e.target.value === "true" })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
                >
                  <option value="true">✅ Enabled — Rewards are active</option>
                  <option value="false">❌ Disabled — No rewards given</option>
                </select>
              </div>

              {/* Reward Target */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                  Who Gets Rewarded?
                </label>
                <select
                  value={settingsForm.rewardTarget}
                  onChange={(e) => setSettingsForm({ ...settingsForm, rewardTarget: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
                >
                  <option value="BOTH">Both Referrer & New User</option>
                  <option value="REFERRER">Only Referrer (Existing User)</option>
                  <option value="REFEREE">Only Referee (New User)</option>
                </select>
              </div>

              {/* Referrer Coupon */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                  Referrer Reward Coupon
                </label>
                <select
                  value={settingsForm.referrerCouponId}
                  onChange={(e) => setSettingsForm({ ...settingsForm, referrerCouponId: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
                >
                  <option value="">— Select Coupon —</option>
                  {coupons.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.discountType === "FLAT" ? `₹${c.value}` : `${c.value}%`} ({c.description?.slice(0, 40)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Referee Coupon */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                  New User Reward Coupon
                </label>
                <select
                  value={settingsForm.refereeCouponId}
                  onChange={(e) => setSettingsForm({ ...settingsForm, refereeCouponId: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
                >
                  <option value="">— Select Coupon —</option>
                  {coupons.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.discountType === "FLAT" ? `₹${c.value}` : `${c.value}%`} ({c.description?.slice(0, 40)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Current Policy Summary */}
            {settings && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: "10px", border: "1px solid #dbeafe" }}>
                  <strong style={{ color: "#1e40af", fontSize: "0.92rem", display: "block" }}>Referrer (Existing Customer)</strong>
                  <span style={{ color: "#334155", fontSize: "0.85rem" }}>
                    {referrerCoupon
                      ? <>Receives <strong>{referrerCoupon.code}</strong> — {referrerCoupon.discountType === "FLAT" ? `₹${referrerCoupon.value}` : `${referrerCoupon.value}%`} off</>
                      : "No coupon assigned"}
                  </span>
                </div>
                <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: "10px", border: "1px solid #dcfce7" }}>
                  <strong style={{ color: "#15803d", fontSize: "0.92rem", display: "block" }}>Referee (New Customer)</strong>
                  <span style={{ color: "#334155", fontSize: "0.85rem" }}>
                    {refereeCoupon
                      ? <>Receives <strong>{refereeCoupon.code}</strong> — {refereeCoupon.discountType === "FLAT" ? `₹${refereeCoupon.value}` : `${refereeCoupon.value}%`} off</>
                      : "No coupon assigned"}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving}
              style={{
                background: saving ? "#94a3b8" : "#1e40af",
                color: "white", border: "none",
                padding: "10px 24px", borderRadius: "10px",
                fontWeight: "700", fontSize: "0.92rem",
                cursor: saving ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {saving ? "Saving..." : "💾 Save Policy Settings"}
            </button>
          </div>

          {/* Search Input */}
          <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Search by referrer or referee name, email, or coupon code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
            />
          </div>

          {/* Referrals Activity Table */}
          <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#475569" }}>
                    <th style={{ padding: "14px 18px", fontWeight: "700" }}>Referrer (Invited By)</th>
                    <th style={{ padding: "14px 18px", fontWeight: "700" }}>Referred User (Referee)</th>
                    <th style={{ padding: "14px 18px", fontWeight: "700" }}>Joined Date</th>
                    <th style={{ padding: "14px 18px", fontWeight: "700" }}>Status</th>
                    <th style={{ padding: "14px 18px", fontWeight: "700" }}>Referrer Reward</th>
                    <th style={{ padding: "14px 18px", fontWeight: "700" }}>Referee Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                        {searchTerm ? "No referral entries match your search." : "No referrals recorded yet."}
                      </td>
                    </tr>
                  ) : (
                    referrals.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ fontWeight: "800", color: "#0f172a" }}>{r.referrer?.name || "—"}</div>
                          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{r.referrer?.email || ""}</div>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ fontWeight: "700", color: "#1e293b" }}>{r.referee?.name || "—"}</div>
                          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{r.referee?.email || ""}</div>
                        </td>
                        <td style={{ padding: "14px 18px", color: "#64748b" }}>
                          {r.referee?.createdAt ? new Date(r.referee.createdAt).toLocaleDateString() : new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{
                            background: r.status === "COMPLETED" ? "#dcfce7" : r.status === "NO_REWARD" ? "#fef3c7" : "#e0e7ff",
                            color: r.status === "COMPLETED" ? "#166534" : r.status === "NO_REWARD" ? "#92400e" : "#3730a3",
                            padding: "4px 10px", borderRadius: "14px",
                            fontSize: "0.78rem", fontWeight: "800",
                          }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          {r.referrerCouponCode ? (
                            <span style={{ background: "#dbeafe", color: "#1e40af", padding: "3px 8px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: "700" }}>
                              🎟️ {r.referrerCouponCode}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          {r.refereeCouponCode ? (
                            <span style={{ background: "#dcfce7", color: "#166534", padding: "3px 8px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: "700" }}>
                              🎟️ {r.refereeCouponCode}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReferralAdmin;
