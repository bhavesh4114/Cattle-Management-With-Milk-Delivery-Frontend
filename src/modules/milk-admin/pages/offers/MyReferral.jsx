import React, { useState, useEffect } from "react";
import api from "../../../../services/api";

const MyReferral = () => {
  const [data, setData] = useState(null);
  const [allReferrals, setAllReferrals] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const adminData = (() => {
    try {
      return JSON.parse(localStorage.getItem("adminData")) || {};
    } catch {
      return {};
    }
  })();
  const isAdmin = adminData?.role === "ADMIN";

  useEffect(() => {
    const loadReferralData = async () => {
      try {
        const statsPromise = api.get("/referral/my-stats");
        const listPromise = api.get("/referral/list").catch(() => ({ data: { referrals: [] } }));
        const [statsRes, listRes] = await Promise.all([statsPromise, listPromise]);
        setData(statsRes.data);
        if (listRes?.data?.referrals) {
          setAllReferrals(listRes.data.referrals);
        }
      } catch (err) {
        console.error("Failed to load referral stats", err);
      } finally {
        setLoading(false);
      }
    };
    loadReferralData();
  }, []);

  const handleCopy = async () => {
    if (!data?.referralCode) return;
    try {
      await navigator.clipboard.writeText(data.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = data.referralCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⏳</div>
          <p style={{ fontWeight: "600" }}>Loading your referral info...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⚠️</div>
          <p style={{ fontWeight: "600" }}>Unable to load referral information.</p>
        </div>
      </div>
    );
  }

  const activeCoupons = (data.assignedCoupons || []).filter((uc) => uc.status === "ACTIVE");
  const usedCoupons = (data.assignedCoupons || []).filter((uc) => uc.status === "USED");

  // Filter referrals for the table
  const referralList = isAdmin ? allReferrals : (data.referrals || allReferrals || []);
  const filteredReferrals = referralList.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const referrerName = (r.referrer?.name || "").toLowerCase();
    const referrerEmail = (r.referrer?.email || "").toLowerCase();
    const referrerCode = (r.referrer?.referralCode || "").toLowerCase();
    const refereeName = (r.referee?.name || "").toLowerCase();
    const refereeEmail = (r.referee?.email || "").toLowerCase();
    return (
      referrerName.includes(term) ||
      referrerEmail.includes(term) ||
      referrerCode.includes(term) ||
      refereeName.includes(term) ||
      refereeEmail.includes(term)
    );
  });

  return (
    <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.7rem", fontWeight: "800", color: "#0f172a", margin: "0 0 6px 0" }}>
          🎁 My Referral & Coupons
        </h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
          Share your unique code with friends. Both of you can earn free coupon rewards!
        </p>
      </div>

      {/* Referral Code Card */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 40%, #2563eb 100%)",
        borderRadius: "18px", padding: "28px 28px 24px",
        color: "white", marginBottom: "24px",
        position: "relative", overflow: "hidden",
        boxShadow: "0 6px 24px rgba(30,58,138,0.35)",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "600", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
            Your Referral Code
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <div style={{
              background: "rgba(255,255,255,0.15)", padding: "12px 24px",
              borderRadius: "12px", border: "1.5px dashed rgba(255,255,255,0.4)",
              fontSize: "1.6rem", fontWeight: "900", letterSpacing: "0.1em",
              fontFamily: "'Courier New', monospace",
            }}>
              {data.referralCode || "—"}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!data.referralCode}
              style={{
                background: copied ? "#22c55e" : "rgba(255,255,255,0.2)",
                color: "white", border: "1px solid rgba(255,255,255,0.3)",
                padding: "10px 20px", borderRadius: "10px",
                fontWeight: "700", fontSize: "0.9rem",
                cursor: data.referralCode ? "pointer" : "not-allowed",
                transition: "all 0.25s ease",
                display: "flex", alignItems: "center", gap: "6px",
              }}
            >
              {copied ? "✅ Copied!" : "📋 Copy Code"}
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: "32px", marginTop: "20px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "1.6rem", fontWeight: "900" }}>{isAdmin ? allReferrals.length : (data.totalReferrals || 0)}</div>
              <div style={{ fontSize: "0.82rem", opacity: 0.75 }}>Friends Referred</div>
            </div>
            <div>
              <div style={{ fontSize: "1.6rem", fontWeight: "900" }}>{activeCoupons.length}</div>
              <div style={{ fontSize: "0.82rem", opacity: 0.75 }}>Active Coupons</div>
            </div>
            <div>
              <div style={{ fontSize: "1.6rem", fontWeight: "900" }}>{usedCoupons.length}</div>
              <div style={{ fontSize: "0.82rem", opacity: 0.75 }}>Coupons Used</div>
            </div>
          </div>
        </div>
      </div>

      {/* Who Referred Whom - Referral Activity Table */}
      <div style={{
        background: "#ffffff",
        borderRadius: "18px",
        border: "1px solid #e2e8f0",
        padding: "24px",
        marginBottom: "24px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>👥</span>
              {isAdmin ? "કોના રેફરલથી કોણ જોડાયું (Referral Tracking List)" : "મારા રેફરલથી જોડાયેલ મિત્રો (My Referred Friends)"}
            </h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>
              {isAdmin
                ? "કયા યુઝરના રેફરલ કોડથી કયા ગ્રાહકે નોંધણી કરી તેની વિગતવાર યાદી"
                : "તમારા રેફરલ કોડથી નોંધાયેલા મિત્રો અને મળેલ કૂપન"}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="text"
              placeholder="શોધો (નામ, ઈમેલ, કોડ)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                border: "1.5px solid #cbd5e1",
                fontSize: "0.88rem",
                outline: "none",
                width: "220px",
                background: "#f8fafc"
              }}
            />
            <span style={{
              background: "#eff6ff",
              color: "#1e40af",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "0.82rem",
              fontWeight: "700",
              border: "1px solid #bfdbfe",
              whiteSpace: "nowrap"
            }}>
              કુલ રેફરલ્સ: {filteredReferrals.length}
            </span>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "12px 16px", fontWeight: "700" }}>👤 કોના રેફરલથી (Referrer)</th>
                <th style={{ padding: "12px 16px", fontWeight: "700" }}>🎯 કોણ રેફર થયું (Referred User)</th>
                <th style={{ padding: "12px 16px", fontWeight: "700" }}>📅 જોડાયા તારીખ</th>
                <th style={{ padding: "12px 16px", fontWeight: "700" }}>⚡ સ્થિતિ (Status)</th>
                <th style={{ padding: "12px 16px", fontWeight: "700" }}>🎁 મળેલ કૂપન રિવોર્ડ</th>
              </tr>
            </thead>
            <tbody>
              {filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: "36px 16px", textAlign: "center", color: "#64748b" }}>
                    <div style={{ fontSize: "1.8rem", marginBottom: "6px" }}>📭</div>
                    <p style={{ fontWeight: "700", margin: "0 0 4px", color: "#334155" }}>
                      {searchTerm ? "કોઈ પરિણામ મળ્યું નથી" : "હજી સુધી કોઈ રેફરલ નોંધાયેલ નથી"}
                    </p>
                    <p style={{ fontSize: "0.82rem", margin: 0, color: "#94a3b8" }}>
                      જ્યારે કોઈ વ્યક્તિ રેફરલ કોડનો ઉપયોગ કરીને એકાઉન્ટ બનાવશે, ત્યારે અહીં દેખાશે.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredReferrals.map((r) => (
                  <tr
                    key={r.id}
                    style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "34px", height: "34px", borderRadius: "50%",
                          background: "#dbeafe", color: "#1e40af",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: "800", fontSize: "0.9rem", flexShrink: 0
                        }}>
                          {(r.referrer?.name || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: "800", color: "#0f172a" }}>{r.referrer?.name || "—"}</div>
                          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{r.referrer?.email || ""}</div>
                          {r.referrer?.referralCode && (
                            <span style={{
                              display: "inline-block", background: "#eff6ff", color: "#1e40af",
                              padding: "1px 6px", borderRadius: "4px", fontSize: "0.72rem",
                              fontWeight: "700", fontFamily: "monospace", marginTop: "2px",
                              border: "1px solid #bfdbfe"
                            }}>
                              કોડ: {r.referrer.referralCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "34px", height: "34px", borderRadius: "50%",
                          background: "#dcfce7", color: "#166534",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: "800", fontSize: "0.9rem", flexShrink: 0
                        }}>
                          {(r.referee?.name || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: "700", color: "#15803d" }}>{r.referee?.name || "—"}</div>
                          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{r.referee?.email || ""}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#475569", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                      {r.referee?.createdAt
                        ? new Date(r.referee.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        background: r.status === "COMPLETED" ? "#dcfce7" : "#fef3c7",
                        color: r.status === "COMPLETED" ? "#166534" : "#92400e",
                        padding: "4px 10px",
                        borderRadius: "14px",
                        fontSize: "0.75rem",
                        fontWeight: "800",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}>
                        {r.status === "COMPLETED" ? "✅ Completed" : r.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {r.referrerCouponCode && (
                          <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700", display: "inline-block", width: "fit-content" }}>
                            👤 Referrer: {r.referrerCouponCode}
                          </span>
                        )}
                        {r.refereeCouponCode && (
                          <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700", display: "inline-block", width: "fit-content" }}>
                            🎯 Friend: {r.refereeCouponCode}
                          </span>
                        )}
                        {!r.referrerCouponCode && !r.refereeCouponCode && (
                          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* How It Works */}
      <div style={{
        background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
        borderRadius: "16px", border: "1px solid #bfdbfe",
        padding: "20px 24px", marginBottom: "24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span style={{ fontSize: "1.2rem" }}>💡</span>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "800", color: "#1e3a8a" }}>
            How Referrals Work
          </h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: "10px", border: "1px solid #dbeafe" }}>
            <div style={{ fontSize: "1.1rem", marginBottom: "4px" }}>1️⃣</div>
            <strong style={{ color: "#1e40af", fontSize: "0.88rem" }}>Share Your Code</strong>
            <p style={{ margin: "4px 0 0", color: "#475569", fontSize: "0.82rem" }}>
              Copy and share your unique referral code with friends and family.
            </p>
          </div>
          <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: "10px", border: "1px solid #dbeafe" }}>
            <div style={{ fontSize: "1.1rem", marginBottom: "4px" }}>2️⃣</div>
            <strong style={{ color: "#1e40af", fontSize: "0.88rem" }}>Friend Registers</strong>
            <p style={{ margin: "4px 0 0", color: "#475569", fontSize: "0.82rem" }}>
              Your friend enters your code when creating their account.
            </p>
          </div>
          <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: "10px", border: "1px solid #dbeafe" }}>
            <div style={{ fontSize: "1.1rem", marginBottom: "4px" }}>3️⃣</div>
            <strong style={{ color: "#1e40af", fontSize: "0.88rem" }}>Both Get Rewards</strong>
            <p style={{ margin: "4px 0 0", color: "#475569", fontSize: "0.82rem" }}>
              You and your friend both receive free coupon rewards!
            </p>
          </div>
        </div>
      </div>

      {/* My Coupons */}
      <div style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#0f172a", margin: "0 0 16px 0" }}>
          🎟️ My Coupons
        </h3>

        {(data.assignedCoupons || []).length === 0 ? (
          <div style={{
            background: "#f8fafc", borderRadius: "14px", border: "1px dashed #cbd5e1",
            padding: "40px 20px", textAlign: "center", color: "#64748b",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🎫</div>
            <p style={{ fontWeight: "600", margin: "0 0 4px" }}>No coupons yet</p>
            <p style={{ fontSize: "0.85rem", margin: 0 }}>Refer a friend to earn your first coupon reward!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
            {(data.assignedCoupons || []).map((uc, idx) => {
              const coupon = uc.coupon;
              const isActive = uc.status === "ACTIVE";
              return (
                <div key={uc.id || idx} style={{
                  background: "white", borderRadius: "14px",
                  border: `1.5px solid ${isActive ? "#bbf7d0" : "#e2e8f0"}`,
                  padding: "18px 20px",
                  boxShadow: isActive ? "0 2px 10px rgba(22,163,74,0.08)" : "none",
                  opacity: isActive ? 1 : 0.7,
                  position: "relative", overflow: "hidden",
                }}>
                  {/* Status badge */}
                  <span style={{
                    position: "absolute", top: 12, right: 12,
                    background: isActive ? "#dcfce7" : "#f1f5f9",
                    color: isActive ? "#166534" : "#64748b",
                    padding: "3px 10px", borderRadius: "12px",
                    fontSize: "0.72rem", fontWeight: "800", textTransform: "uppercase",
                  }}>
                    {uc.status}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "1.4rem" }}>🎫</span>
                    <div>
                      <div style={{ fontWeight: "900", fontSize: "1.1rem", color: "#0f172a", fontFamily: "'Courier New', monospace" }}>
                        {coupon?.code || "—"}
                      </div>
                    </div>
                  </div>

                  <p style={{ margin: "0 0 8px", fontSize: "0.85rem", color: "#475569" }}>
                    {coupon?.description || "Referral reward coupon"}
                  </p>

                  <div style={{ display: "flex", gap: "16px", fontSize: "0.82rem", color: "#64748b" }}>
                    <span>
                      <strong style={{ color: "#16a34a" }}>
                        {coupon?.discountType === "FLAT" ? `₹${coupon.value}` : `${coupon?.value}%`}
                      </strong> off
                    </span>
                    {coupon?.minOrderAmount > 0 && (
                      <span>Min: ₹{coupon.minOrderAmount}</span>
                    )}
                  </div>

                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "8px" }}>
                    Source: {uc.source || "REFERRAL"} • Assigned: {new Date(uc.assignedAt).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReferral;
