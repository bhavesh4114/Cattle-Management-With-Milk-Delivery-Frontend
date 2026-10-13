import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const UserProfile = ({ adminData }) => {
  const [profile, setProfile] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [referralStats, setReferralStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState("");

  useEffect(() => {
    const fetchProfileAndCoupons = async () => {
      try {
        const [profRes, couponRes, statsRes] = await Promise.allSettled([
          api.get("/auth/profile"),
          api.get("/coupons/my-coupons"),
          api.get("/referral/my-stats"),
        ]);

        if (profRes.status === "fulfilled" && profRes.data?.admin) {
          setProfile(profRes.data.admin);
        } else if (adminData) {
          setProfile(adminData);
        }

        if (statsRes.status === "fulfilled" && statsRes.data) {
          setReferralStats(statsRes.data);
        }

        if (couponRes.status === "fulfilled" && couponRes.data) {
          const raw = Array.isArray(couponRes.data)
            ? couponRes.data
            : (couponRes.data.coupons || []);
          const list = raw.map((item) => {
            const c = item.coupon || item;
            return {
              id: item.id || c.id,
              code: c.code,
              type: c.discountType || c.type || "FLAT",
              value: c.value,
              description: c.description,
              minOrderValue: c.minOrderAmount || c.minOrderValue || 0,
              status: item.status || c.status || "ACTIVE",
              source: item.source || (c.isReferralReward ? "REFERRAL_REWARD" : "STORE"),
            };
          });
          setCoupons(list);
        }
      } catch (err) {
        console.error("Failed to load profile data", err);
        if (adminData) setProfile(adminData);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndCoupons();
  }, [adminData]);

  const handleCopyCode = async (code) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleCopyCoupon = async (code) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCoupon(code);
      setTimeout(() => setCopiedCoupon(""), 2500);
    } catch {
      setCopiedCoupon(code);
      setTimeout(() => setCopiedCoupon(""), 2500);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
        <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⏳</div>
        <p style={{ fontWeight: 600 }}>Loading profile...</p>
      </div>
    );
  }

  const user = profile || adminData || {};
  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Recently";

  const effectiveReferralCode = referralStats?.referralCode || user.referralCode || "—";
  const totalReferrals = referralStats?.totalReferrals || 0;
  const activeCouponsCount = (referralStats?.assignedCoupons || []).filter((uc) => uc.status === "ACTIVE").length || coupons.filter((c) => c.status === "ACTIVE").length;
  const usedCouponsCount = (referralStats?.assignedCoupons || []).filter((uc) => uc.status === "USED" || uc.status === "REDEEMED").length;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "10px 0" }}>
      {/* Profile Header Card */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "16px",
          padding: "32px",
          color: "#ffffff",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
          marginBottom: "24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-40px",
            right: "-40px",
            width: "180px",
            height: "180px",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            flexWrap: "wrap",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: "88px",
              height: "88px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.4rem",
              fontWeight: 700,
              color: "#ffffff",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
              border: "3px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            {user.name ? user.name.charAt(0).toUpperCase() : "👤"}
          </div>

          {/* User Details */}
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.5px" }}>
                {user.name || "User"}
              </h2>
              <span
                style={{
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "#34d399",
                  border: "1px solid rgba(52, 211, 153, 0.4)",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {user.role === "ADMIN" ? "Administrator" : (user.customRole?.name || "Customer / User")}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  background: "rgba(255, 255, 255, 0.1)",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#94a3b8",
                }}
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                {user.status || "Active"}
              </span>
            </div>

            <p style={{ margin: "6px 0 0 0", color: "#94a3b8", fontSize: "0.95rem" }}>
              ✉️ {user.email || "No email available"}
            </p>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.85rem" }}>
              🗓️ Member since: <strong style={{ color: "#cbd5e1" }}>{formattedDate}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Account Details Card */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "24px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <span style={{ fontSize: "1.4rem" }}>📋</span>
          <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#1e293b" }}>
            Account Information
          </h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            <span style={{ color: "#64748b", fontSize: "0.9rem" }}>User ID</span>
            <strong style={{ color: "#1e293b", fontFamily: "monospace" }}>#{user.id || "-"}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            <span style={{ color: "#64748b", fontSize: "0.9rem" }}>Full Name</span>
            <strong style={{ color: "#1e293b" }}>{user.name || "-"}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            <span style={{ color: "#64748b", fontSize: "0.9rem" }}>Email</span>
            <strong style={{ color: "#1e293b" }}>{user.email || "-"}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            <span style={{ color: "#64748b", fontSize: "0.9rem" }}>Account Type</span>
            <strong style={{ color: "#1e293b" }}>{user.role}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            <span style={{ color: "#64748b", fontSize: "0.9rem" }}>Account Status</span>
            <span style={{ color: "#16a34a", fontWeight: 700 }}>● {user.status || "Active"}</span>
          </div>
          {user.referredBy && (
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "2px" }}>
              <span style={{ color: "#64748b", fontSize: "0.9rem" }}>Referred By</span>
              <strong style={{ color: "#166534" }}>🤝 {user.referredBy.name} ({user.referredBy.email})</strong>
            </div>
          )}
        </div>
      </div>

      {/* Referral Code Card (Exact same design from Referral & Offers) */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 40%, #2563eb 100%)",
          borderRadius: "18px",
          padding: "28px 28px 24px",
          color: "white",
          marginBottom: "24px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 6px 24px rgba(30,58,138,0.35)",
        }}
      >
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "600", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
            YOUR REFERRAL CODE
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", marginBottom: "22px" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                padding: "12px 24px",
                borderRadius: "12px",
                border: "1.5px dashed rgba(255,255,255,0.4)",
                fontSize: "1.6rem",
                fontWeight: "900",
                letterSpacing: "0.1em",
                fontFamily: "'Courier New', monospace",
              }}
            >
              {effectiveReferralCode}
            </div>
            <button
              type="button"
              onClick={() => handleCopyCode(effectiveReferralCode)}
              disabled={!effectiveReferralCode || effectiveReferralCode === "—"}
              style={{
                background: copiedCode ? "#22c55e" : "rgba(255,255,255,0.2)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.3)",
                padding: "11px 22px",
                borderRadius: "10px",
                fontWeight: "700",
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.25s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {copiedCode ? "✅ Copied!" : "📋 Copy Code"}
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: "36px", flexWrap: "wrap", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
            <div>
              <div style={{ fontSize: "1.75rem", fontWeight: "900" }}>{totalReferrals}</div>
              <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>Friends Referred</div>
            </div>
            <div>
              <div style={{ fontSize: "1.75rem", fontWeight: "900" }}>{activeCouponsCount}</div>
              <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>Active Coupons</div>
            </div>
            <div>
              <div style={{ fontSize: "1.75rem", fontWeight: "900" }}>{usedCouponsCount}</div>
              <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>Coupons Used</div>
            </div>
          </div>
        </div>
      </div>

      {/* How Referrals Work */}
      <div
        style={{
          background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
          borderRadius: "16px",
          border: "1px solid #bfdbfe",
          padding: "20px 24px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <span style={{ fontSize: "1.3rem" }}>💡</span>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: "#1e3a8a" }}>
            How Referrals Work
          </h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1px solid #dbeafe", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "1.2rem", marginBottom: "6px" }}>1️⃣</div>
            <strong style={{ color: "#1e40af", fontSize: "0.92rem" }}>Share Your Code</strong>
            <p style={{ margin: "6px 0 0", color: "#475569", fontSize: "0.84rem", lineHeight: 1.4 }}>
              Copy and share your unique referral code with friends and family.
            </p>
          </div>
          <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1px solid #dbeafe", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "1.2rem", marginBottom: "6px" }}>2️⃣</div>
            <strong style={{ color: "#1e40af", fontSize: "0.92rem" }}>Friend Registers</strong>
            <p style={{ margin: "6px 0 0", color: "#475569", fontSize: "0.84rem", lineHeight: 1.4 }}>
              Your friend enters your code when creating their account.
            </p>
          </div>
          <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1px solid #dbeafe", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "1.2rem", marginBottom: "6px" }}>3️⃣</div>
            <strong style={{ color: "#1e40af", fontSize: "0.92rem" }}>Both Get Rewards</strong>
            <p style={{ margin: "6px 0 0", color: "#475569", fontSize: "0.84rem", lineHeight: 1.4 }}>
              You and your friend both receive free coupon rewards!
            </p>
          </div>
        </div>
      </div>

      {/* My Available Coupons & Rewards */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "24px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.4rem" }}>🎟️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#1e293b" }}>
                My Coupons & Rewards ({coupons.length})
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                Active discount coupons you can apply during checkout in the Products store
              </p>
            </div>
          </div>
        </div>

        {coupons.length === 0 ? (
          <div
            style={{
              padding: "36px 20px",
              textAlign: "center",
              background: "#f8fafc",
              borderRadius: "10px",
              color: "#64748b",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🎁</div>
            <p style={{ fontWeight: 600, margin: 0 }}>No active coupons right now.</p>
            <p style={{ fontSize: "0.85rem", margin: "4px 0 0 0" }}>
              Share your referral code with friends to unlock discount coupons!
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {coupons.map((c) => (
              <div
                key={c.id || c.code}
                style={{
                  background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                  border: "1px solid #a7f3d0",
                  borderRadius: "12px",
                  padding: "16px",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span
                      style={{
                        background: "#059669",
                        color: "#ffffff",
                        fontWeight: 800,
                        fontSize: "0.8rem",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        letterSpacing: "0.5px",
                        fontFamily: "monospace",
                      }}
                    >
                      {c.code}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#047857",
                        background: "rgba(16, 185, 129, 0.15)",
                        padding: "2px 8px",
                        borderRadius: "12px",
                      }}
                    >
                      {c.status || "ACTIVE"}
                    </span>
                  </div>

                  <h4 style={{ margin: "6px 0 4px 0", fontSize: "1rem", fontWeight: 700, color: "#065f46" }}>
                    {c.type === "FLAT" ? `₹${c.value} FLAT DISCOUNT` : `${c.value}% PERCENT DISCOUNT`}
                  </h4>

                  <p style={{ margin: 0, fontSize: "0.82rem", color: "#047857" }}>
                    {c.description || `Save ₹${c.value} on your next order`}
                  </p>

                  {c.minOrderValue > 0 && (
                    <div style={{ fontSize: "0.75rem", color: "#059669", marginTop: "6px" }}>
                      Min Order: ₹{c.minOrderValue}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: "16px",
                    paddingTop: "12px",
                    borderTop: "1px dashed #a7f3d0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    {c.source === "REFERRAL_REWARD" ? "🎁 Referral Reward" : "🏷️ Active Coupon"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCoupon(c.code)}
                    style={{
                      background: copiedCoupon === c.code ? "#10b981" : "#ffffff",
                      color: copiedCoupon === c.code ? "#ffffff" : "#047857",
                      border: "1px solid #059669",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {copiedCoupon === c.code ? "Copied! ✓" : "Copy Code"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
