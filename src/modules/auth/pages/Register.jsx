import api from "../../../services/api";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import girCowImg from "../../../assets/gir_cow.jpg";

/* ─── Inline SVG Icons ─────────────────────────────────────── */
const CowIcon = ({ size = 22, color = "white" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 11.6c0-4.5 3.6-8.1 8-8.1s8 3.6 8 8.1v1.7c0 3.9-2.7 7.3-6.5 8.1l-1.5.3-1.5-.3C6.7 20.6 4 17.2 4 13.3v-1.7Z" />
    <path d="M8.6 11.5h6.8M8.6 14.8h6.8M10.2 8.2h3.6" />
  </svg>
);
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);
const ArrowRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const GiftIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

/* ─── Feature icons ─────────────────────────────────────────── */
const CattleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#087443" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 11.6c0-4.5 3.6-8.1 8-8.1s8 3.6 8 8.1v1.7c0 3.9-2.7 7.3-6.5 8.1l-1.5.3-1.5-.3C6.7 20.6 4 17.2 4 13.3v-1.7Z" />
    <path d="M8.6 11.5h6.8M8.6 14.8h6.8M10.2 8.2h3.6" />
  </svg>
);
const OrderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#087443" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const ReportIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#087443" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);
const GrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#087443" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const FEATURES = [
  { icon: <CattleIcon />, title: "Cattle Management", desc: "Keep track of your cattle and milk production" },
  { icon: <OrderIcon />, title: "Order Tracking", desc: "Manage orders and deliveries efficiently" },
  { icon: <ReportIcon />, title: "Daily Reports", desc: "View production and delivery reports" },
  { icon: <GrowIcon />, title: "Grow Your Business", desc: "Connect with customers and expand" },
];

/* ─── Main Component ────────────────────────────────────────── */
const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });
  const [referralValidation, setReferralValidation] = useState({
    status: "idle", // "idle" | "checking" | "valid" | "invalid"
    message: "",
    referrerName: "",
  });
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Real-time validation for referral code
  useEffect(() => {
    const raw = formData.referralCode?.trim();
    if (!raw) {
      setReferralValidation({ status: "idle", message: "", referrerName: "" });
      return;
    }

    setReferralValidation(prev => ({
      ...prev,
      status: "checking",
      message: "Verifying...",
    }));

    const timer = setTimeout(async () => {
      try {
        const res = await api.post("/referral/validate", { code: raw });
        if (res.data?.valid) {
          setReferralValidation({
            status: "valid",
            message: `Valid referral code! (Referred by ${res.data.referrer?.name || "Friend"})`,
            referrerName: res.data.referrer?.name || "",
          });
        } else {
          setReferralValidation({
            status: "invalid",
            message: res.data?.message || "This referral code is not valid.",
            referrerName: "",
          });
        }
      } catch (err) {
        setReferralValidation({
          status: "invalid",
          message: err.response?.data?.message || "This referral code is not valid.",
          referrerName: "",
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.referralCode]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    setSuccessMessage("");
    if (formData.password !== formData.confirmPassword) return setMessage("Passwords do not match.");
    if (formData.password.length < 6) return setMessage("Password must be at least 6 characters long.");
    if (formData.referralCode?.trim() && referralValidation.status === "invalid") {
      return setMessage("Please enter a valid referral code or clear the field.");
    }
    setIsLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      };
      if (formData.referralCode?.trim()) {
        payload.referralCode = formData.referralCode.trim().toUpperCase();
      }
      const res = await api.post("/admin/auth/register", payload);
      localStorage.setItem("adminToken", res.data.token);
      localStorage.setItem("adminData", JSON.stringify(res.data.admin));
      setSuccessMessage("Account created successfully! Redirecting...");
      setTimeout(() => {
        const roleName = res.data.admin?.customRole?.name?.toLowerCase() || "";
        const isDeliveryOrMilk =
          roleName.includes("delivery") || roleName.includes("delever") || roleName.includes("milk") ||
          res.data.admin?.permissions?.some((p) => String(p).toLowerCase().includes("deliver"));
        navigate(isDeliveryOrMilk ? "/milk-admin/dashboard" : "/admin/dashboard");
      }, 1200);
    } catch (err) {
      setMessage(
        err.response?.data?.message || (!err.response ? "Unable to connect to server." : "Registration failed. Please try again.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .reg-root * { box-sizing: border-box; font-family: 'Inter', 'Segoe UI', sans-serif; }
        .reg-root { display: flex; height: 100vh; background: #f0faf4; overflow: hidden; }

        /* Left panel */
        .reg-left {
          flex: 1 1 0;
          min-width: 0;
          background: linear-gradient(160deg, #eaf6ff 0%, #f8fffe 40%, #f0faf4 100%);
          padding: 20px 38px 0 38px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* Curved right edge of left panel */
        .reg-left::after {
          content: '';
          position: absolute;
          top: 0; right: -40px; bottom: 0;
          width: 80px;
          background: #f0faf4;
          border-radius: 0 0 0 80px / 0 0 0 60px;
          z-index: 2;
        }

        /* Right panel */
        .reg-right {
          width: clamp(400px, 45%, 520px);
          flex-shrink: 0;
          background: #f0faf4;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px 24px;
          position: relative;
          z-index: 3;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .reg-right::-webkit-scrollbar { display: none; }

        /* Cow image at bottom */
        .reg-cow-img {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 42%;
          object-fit: cover;
          object-position: center 15%;
          width: 100%;
          mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 20%, black 55%);
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 20%, black 55%);
          z-index: 0;
        }

        /* Card */
        .reg-card {
          background: white;
          border-radius: 18px;
          padding: 18px 28px 16px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 4px 28px rgba(8,116,67,0.08), 0 1px 4px rgba(0,0,0,0.04);
          border: 1px solid rgba(8,116,67,0.08);
        }

        /* Register button */
        .reg-btn {
          width: 100%;
          height: 40px;
          border-radius: 8px;
          border: none;
          background: #087443;
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.18s ease, transform 0.12s ease, box-shadow 0.18s ease;
          box-shadow: 0 3px 10px rgba(8,116,67,0.28);
          margin-top: 2px;
        }
        .reg-btn:hover:not(:disabled) {
          background: #064E36;
          box-shadow: 0 5px 14px rgba(8,116,67,0.32);
          transform: translateY(-1px);
        }
        .reg-btn:active:not(:disabled) { transform: translateY(0); }
        .reg-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        /* Responsive */
        @media (max-width: 900px) {
          .reg-left { padding: 24px 24px 0; }
          .reg-right { width: clamp(360px, 48%, 460px); padding: 20px 16px; }
          .reg-card { padding: 20px 20px 18px; }
        }
        @media (max-width: 700px) {
          .reg-root { flex-direction: column; height: auto; overflow: auto; }
          .reg-left { flex: none; height: 260px; padding: 20px 20px 0; }
          .reg-left::after { display: none; }
          .reg-cow-img { height: 100%; }
          .reg-right { width: 100%; padding: 20px 16px 28px; }
          .reg-card { padding: 20px 18px; }
        @keyframes reg-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="reg-root">

        {/* ══ LEFT SECTION ══════════════════════════════════════ */}
        <div className="reg-left">

          {/* Branding */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, position: "relative", zIndex: 1 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 9,
              background: "#087443",
              display: "grid", placeItems: "center",
              boxShadow: "0 3px 8px rgba(8,116,67,0.3)",
              flexShrink: 0,
            }}>
              <CowIcon size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14.5, color: "#111827", lineHeight: 1.2 }}>Cattle Manager</div>
              <div style={{ fontSize: 11.5, color: "#52627A", marginTop: 1 }}>Livestock Management System</div>
            </div>
          </div>

          {/* Hero text */}
          <div style={{ position: "relative", zIndex: 1, maxWidth: 460 }}>
            <h2 style={{
              margin: "0 0 10px",
              fontSize: "clamp(26px, 3.4vw, 40px)",
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}>
              <span style={{ color: "#111827" }}>Manage Your<br /></span>
              <span style={{ color: "#087443" }}>Cattle Business</span>
            </h2>
            <p style={{ margin: "0 0 22px", fontSize: 13.5, color: "#52627A", lineHeight: 1.55, maxWidth: 380 }}>
              Join our platform to easily manage your livestock, track orders, deliveries, and grow your dairy business.
            </p>

            {/* Features */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: "#E6F4EE",
                    display: "grid", placeItems: "center",
                    border: "1px solid rgba(8,116,67,0.12)",
                  }}>
                    {f.icon}
                  </div>
                  <div style={{ paddingTop: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: "#111827", marginBottom: 1 }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: "#52627A" }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gir Cow Image */}
          <img
            src={girCowImg}
            alt="Gir Cow Farm"
            className="reg-cow-img"
          />

          {/* Decorative leaves */}
          <div style={{ position: "absolute", top: -8, right: 50, zIndex: 4, fontSize: 50, opacity: 0.45, transform: "rotate(-30deg)", pointerEvents: "none", userSelect: "none" }}>
            🌿
          </div>
          <div style={{ position: "absolute", top: 55, right: 10, zIndex: 4, fontSize: 38, opacity: 0.35, transform: "rotate(20deg)", pointerEvents: "none", userSelect: "none" }}>
            🍃
          </div>
          <div style={{ position: "absolute", bottom: 50, right: 26, zIndex: 4, fontSize: 42, opacity: 0.35, transform: "rotate(-15deg) scaleX(-1)", pointerEvents: "none", userSelect: "none" }}>
            🌿
          </div>
        </div>

        {/* ══ RIGHT SECTION ═════════════════════════════════════ */}
        <div className="reg-right">
          <div className="reg-card">

            {/* Card top branding */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "#087443",
                display: "grid", placeItems: "center",
                boxShadow: "0 3px 10px rgba(8,116,67,0.25)",
                marginBottom: 6,
              }}>
                <CowIcon size={19} color="white" />
              </div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#52627A", textTransform: "uppercase" }}>
                Cattle Management
              </p>
            </div>

            {/* Heading */}
            <div style={{ textAlign: "center", marginBottom: 10 }}>
              <h1 style={{ margin: "0 0 2px", fontSize: 21, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
                Create Account
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: "#52627A", lineHeight: 1.4 }}>
                Register to access the livestock management portal.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleRegister} autoComplete="off" style={{ display: "flex", flexDirection: "column", gap: 7 }}>

              {/* Full Name */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <label htmlFor="reg-name" style={{ fontSize: 12, fontWeight: 600, color: "#1a2e1a" }}>Full Name</label>
                <FieldShell>
                  <span style={{ color: "#9CA3AF", display: "flex", flexShrink: 0 }}><UserIcon /></span>
                  <input
                    id="reg-name" type="text" name="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                    autoComplete="off" required
                    style={inputStyle}
                  />
                </FieldShell>
              </div>

              {/* Email */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <label htmlFor="reg-email" style={{ fontSize: 12, fontWeight: 600, color: "#1a2e1a" }}>Email Address</label>
                <FieldShell>
                  <span style={{ color: "#9CA3AF", display: "flex", flexShrink: 0 }}><MailIcon /></span>
                  <input
                    id="reg-email" type="email" name="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="off" required
                    style={inputStyle}
                  />
                </FieldShell>
              </div>

              {/* Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <label htmlFor="reg-password" style={{ fontSize: 12, fontWeight: 600, color: "#1a2e1a" }}>Password</label>
                <FieldShell>
                  <span style={{ color: "#9CA3AF", display: "flex", flexShrink: 0 }}><LockIcon /></span>
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password" required
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} style={eyeBtnStyle} aria-label="Toggle password">
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </FieldShell>
                <p style={{ margin: "1px 0 0", fontSize: 11, color: "#9CA3AF" }}>Min 6 characters required</p>
              </div>

              {/* Confirm Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <label htmlFor="reg-confirm" style={{ fontSize: 12, fontWeight: 600, color: "#1a2e1a" }}>Confirm Password</label>
                <FieldShell>
                  <span style={{ color: "#9CA3AF", display: "flex", flexShrink: 0 }}><LockIcon /></span>
                  <input
                    id="reg-confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password" required
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(v => !v)} style={eyeBtnStyle} aria-label="Toggle confirm password">
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </FieldShell>
              </div>

              {/* Referral Code (Optional with Real-time Validation) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label htmlFor="reg-referral" style={{ fontSize: 12, fontWeight: 600, color: "#1a2e1a" }}>
                    Referral Code
                  </label>
                  {referralValidation.status === "valid" ? (
                    <span style={{ fontSize: 10.5, color: "#166534", fontWeight: 700, background: "#dcfce7", padding: "1px 7px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 3 }}>
                      ✓ Valid Code
                    </span>
                  ) : referralValidation.status === "invalid" ? (
                    <span style={{ fontSize: 10.5, color: "#991b1b", fontWeight: 700, background: "#fee2e2", padding: "1px 7px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 3 }}>
                      ✕ Invalid Code
                    </span>
                  ) : referralValidation.status === "checking" ? (
                    <span style={{ fontSize: 10.5, color: "#2563eb", fontWeight: 600, background: "#eff6ff", padding: "1px 7px", borderRadius: 4 }}>
                      Verifying...
                    </span>
                  ) : (
                    <span style={{ fontSize: 10.5, color: "#087443", fontWeight: 600, background: "#E6F4EE", padding: "1px 6px", borderRadius: 4 }}>
                      Optional
                    </span>
                  )}
                </div>
                <FieldShell
                  customBorder={
                    referralValidation.status === "valid"
                      ? "1.5px solid #16a34a"
                      : referralValidation.status === "invalid"
                      ? "1.5px solid #dc2626"
                      : referralValidation.status === "checking"
                      ? "1.5px solid #60a5fa"
                      : null
                  }
                  customBg={
                    referralValidation.status === "valid"
                      ? "#f0fdf4"
                      : referralValidation.status === "invalid"
                      ? "#fef2f2"
                      : null
                  }
                  customShadow={
                    referralValidation.status === "valid"
                      ? "0 0 0 3px rgba(22,163,74,0.15)"
                      : referralValidation.status === "invalid"
                      ? "0 0 0 3px rgba(220,38,38,0.15)"
                      : null
                  }
                >
                  <span style={{
                    color:
                      referralValidation.status === "valid"
                        ? "#16a34a"
                        : referralValidation.status === "invalid"
                        ? "#dc2626"
                        : "#9CA3AF",
                    display: "flex", flexShrink: 0
                  }}>
                    <GiftIcon />
                  </span>
                  <input
                    id="reg-referral"
                    type="text"
                    name="referralCode"
                    placeholder="Enter referral code (if any)"
                    value={formData.referralCode}
                    onChange={handleChange}
                    autoComplete="off"
                    style={{
                      ...inputStyle,
                      textTransform: "uppercase",
                      letterSpacing: formData.referralCode ? "0.05em" : "normal",
                      fontWeight: formData.referralCode ? "600" : "400",
                    }}
                  />
                  {referralValidation.status === "checking" && (
                    <span style={{
                      width: 14, height: 14,
                      border: "2px solid #93c5fd",
                      borderTopColor: "#2563eb",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "reg-spin 0.6s linear infinite",
                      flexShrink: 0,
                    }} />
                  )}
                  {referralValidation.status === "valid" && (
                    <span style={{
                      color: "#16a34a",
                      fontSize: 13,
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#dcfce7",
                      flexShrink: 0,
                    }} title="Referral code verified">
                      ✓
                    </span>
                  )}
                  {referralValidation.status === "invalid" && (
                    <span style={{
                      color: "#dc2626",
                      fontSize: 11,
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#fee2e2",
                      flexShrink: 0,
                    }} title="Invalid referral code">
                      ✕
                    </span>
                  )}
                </FieldShell>

                {/* Status helper text below input */}
                {referralValidation.status === "valid" && (
                  <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#16a34a", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <span>✓ Valid:</span> Referred by <strong>{referralValidation.referrerName || "Existing User"}</strong>
                  </p>
                )}
                {referralValidation.status === "invalid" && (
                  <p role="alert" style={{ margin: "2px 0 0", fontSize: 11.5, color: "#dc2626", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                    <span>✕</span> {referralValidation.message || "This referral code is not valid."}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button className="reg-btn" type="submit" disabled={isLoading}>
                {isLoading ? "Creating account..." : (<>Register <ArrowRight /></>)}
              </button>
            </form>

            {/* Messages */}
            {successMessage && (
              <p style={{ margin: "8px 0 0", textAlign: "center", fontSize: 12, fontWeight: 500, color: "#087443" }}>
                ✓ {successMessage}
              </p>
            )}
            {message && (
              <p role="alert" style={{ margin: "8px 0 0", textAlign: "center", fontSize: 12, color: "#dc2626", fontWeight: 500 }}>
                {message}
              </p>
            )}

            {/* OR divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 5px" }}>
              <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
              <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
            </div>

            {/* Sign in link */}
            <p style={{ margin: 0, textAlign: "center", fontSize: 12.5, color: "#52627A" }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "#087443", fontWeight: 700, textDecoration: "none" }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

/* ─── FieldShell: stateful focus wrapper ────────────────────── */
const FieldShell = ({ children, customBorder, customBg, customShadow }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      style={{
        display: "flex",
        alignItems: "center",
        height: 38,
        borderRadius: 8,
        border: customBorder || (focused ? "1.5px solid #087443" : "1.5px solid #DCE3EA"),
        background: customBg || "white",
        padding: "0 12px",
        gap: 8,
        boxShadow: customShadow || (focused ? "0 0 0 3px rgba(8,116,67,0.08)" : "none"),
        transition: "all 0.18s ease",
      }}
    >
      {children}
    </div>
  );
};

const inputStyle = {
  flex: 1,
  border: "none",
  outline: "none",
  fontSize: 13,
  color: "#111827",
  background: "transparent",
  fontFamily: "inherit",
  minWidth: 0,
};

const eyeBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
  display: "flex",
  alignItems: "center",
  color: "#9CA3AF",
  flexShrink: 0,
};

export default Register;
