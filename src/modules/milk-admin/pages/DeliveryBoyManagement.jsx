import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const statusColor = {
  Available: { bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
  "On Leave": { bg: "#fef3c7", color: "#b45309", dot: "#f59e0b" },
  Unavailable: { bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
};

const DeliveryBoyManagement = () => {
  const [boys, setBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ text: "", type: "" });
  const [profileModal, setProfileModal] = useState({ isOpen: false, boy: null });
  const [availModal, setAvailModal] = useState({ isOpen: false, boy: null });           
  const [assignModal, setAssignModal] = useState({ isOpen: false, boy: null, trials: [], subs: [], loading: false, activeTab: 'sub' });
  const [successPopup, setSuccessPopup] = useState({ show: false, customerName: '', boyName: '', type: '' });
  const [availList, setAvailList] = useState([]);
  const [profileForm, setProfileForm] = useState({ mobile: "", pincodes: "", latitude: "", longitude: "", deliveryRadius: "10", accountStatus: "Active", dailyStatus: "Available" });
  const [availForm, setAvailForm] = useState({ date: new Date().toISOString().split("T")[0], status: "Available" });

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  useEffect(() => { fetchBoys(); }, []);

  const fetchBoys = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/delivery/boys");
      setBoys(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openAssignModal = async (boy) => {
    setAssignModal({ isOpen: true, boy, trials: [], subs: [], loading: true, activeTab: 'sub' });
    try {
      const [subsRes, trialsRes] = await Promise.all([
        api.get('/api/milk-module/subscription/all-subscriptions'),
        api.get('/api/milk-module/trial/all-trials')
      ]);

      // Filter only orders whose pincode matches the delivery boy's assigned pincodes
      const boyPincodes = (boy.profile?.pincodes || []).map(p => String(p).trim());
      const filterByPincode = (orders, type) => {
        let filtered = orders;
        // For subscriptions: only show PAID + ACTIVE orders (payment gate)
        if (type === 'sub') {
          filtered = filtered.filter(o => {
            const isPaid = o.paymentStatus === 'PAID' || o.paymentStatus === 'CASH_PENDING';
            const isActive = o.status === 'ACTIVE';
            return isPaid && isActive;
          });
        }
        // Pincode filter
        if (boyPincodes.length > 0) {
          filtered = filtered.filter(o => boyPincodes.includes(String(o.pincode || '').trim()));
        }
        return filtered;
      };

      setAssignModal(prev => ({
        ...prev,
        loading: false,
        subs: filterByPincode(subsRes.data, 'sub'),
        trials: filterByPincode(trialsRes.data, 'trial')
      }));
    } catch (e) {
      console.error(e);
      setAssignModal(prev => ({ ...prev, loading: false }));
      showToast("Failed to fetch orders", "error");
    }
  };

  const handleAssignOrder = async (orderId, type) => {
    try {
      await api.post(`/api/delivery/assign/${type}/${orderId}`, { deliveryBoyId: assignModal.boy.id });
      // Find the order to get customer name
      const allOrders = type === 'sub' ? assignModal.subs : assignModal.trials;
      const order = allOrders.find(o => o.id === orderId);
      const customerName = order?.customerName || 'Customer';
      const boyName = assignModal.boy?.name || 'Delivery Boy';
      // Show success popup
      setSuccessPopup({ show: true, customerName, boyName, type });
      setTimeout(() => setSuccessPopup({ show: false, customerName: '', boyName: '', type: '' }), 3500);
      setAssignModal(prev => {
        if (type === 'sub') {
          return { ...prev, subs: prev.subs.map(s => s.id === orderId ? { ...s, deliveryBoyId: assignModal.boy.id } : s) };
        } else {
          return { ...prev, trials: prev.trials.map(t => t.id === orderId ? { ...t, deliveryBoyId: assignModal.boy.id } : t) };
        }
      });
    } catch (e) {
      console.error(e);
      showToast("Failed to assign order", "error");
    }
  };

  const openProfileModal = (boy) => {
    const p = boy.profile;
    setProfileForm({
      mobile: p?.mobile || "",
      pincodes: (p?.pincodes || []).join(", "),
      latitude: p?.latitude || "",
      longitude: p?.longitude || "",
      deliveryRadius: p?.deliveryRadius || "10",
      accountStatus: p?.accountStatus || "Active",
      dailyStatus: boy.todayAvailability || p?.dailyStatus || "Available",
    });
    setProfileModal({ isOpen: true, boy });
  };

  const saveProfile = async () => {
    try {
      const pincodes = profileForm.pincodes.split(",").map(p => p.trim()).filter(Boolean);
      await api.post(`/api/delivery/boys/${profileModal.boy.id}/profile`, {
        ...profileForm,
        pincodes,
        latitude: profileForm.latitude ? parseFloat(profileForm.latitude) : null,
        longitude: profileForm.longitude ? parseFloat(profileForm.longitude) : null,
        deliveryRadius: parseFloat(profileForm.deliveryRadius),
      });
      showToast(`Profile updated for ${profileModal.boy.name}`);
      setProfileModal({ isOpen: false, boy: null });
      fetchBoys();
    } catch (e) { showToast("Failed to save profile", "error"); }
  };

  const openAvailModal = async (boy) => {
    setAvailModal({ isOpen: true, boy });
    setAvailForm({ date: new Date().toISOString().split("T")[0], status: "Available" });
    try {
      const from = new Date(); from.setDate(from.getDate() - 7);
      const to = new Date(); to.setDate(to.getDate() + 14);
      const res = await api.get(`/api/delivery/boys/${boy.id}/availability?from=${from.toISOString()}&to=${to.toISOString()}`);
      setAvailList(res.data);
    } catch (e) { setAvailList([]); }
  };

  const saveAvailability = async () => {
    try {
      await api.post(`/api/delivery/boys/${availModal.boy.id}/availability`, availForm);
      showToast(`Availability set for ${availModal.boy.name}`);
      const from = new Date(); from.setDate(from.getDate() - 7);
      const to = new Date(); to.setDate(to.getDate() + 14);
      const res = await api.get(`/api/delivery/boys/${availModal.boy.id}/availability?from=${from.toISOString()}&to=${to.toISOString()}`);
      setAvailList(res.data);
      fetchBoys();
    } catch (e) { showToast("Failed to save availability", "error"); }
  };

  const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  if (loading) return <div style={{ padding: "24px", color: "#64748b" }}>Loading delivery boys...</div>;

  return (
    <div style={{ padding: "24px" }}>
      {toast.text && (
        <div style={{ position: "fixed", top: "20px", right: "20px", background: toast.type === "error" ? "#ef4444" : "#22c55e", color: "white", padding: "12px 24px", borderRadius: "8px", zIndex: 9999, fontWeight: "bold", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          {toast.text}
        </div>
      )}

      {/* ✅ Order Assigned Success Popup */}
      {successPopup.show && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "20px", padding: "40px 48px", maxWidth: "420px", width: "100%", textAlign: "center", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", animation: "popIn 0.3s ease" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px auto", fontSize: "34px", boxShadow: "0 8px 20px rgba(59,130,246,0.35)" }}>
              ✓
            </div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", marginBottom: "10px" }}>
              Order Assigned! 🎉
            </div>
            <div style={{ fontSize: "15px", color: "#475569", lineHeight: "1.6", marginBottom: "24px" }}>
              <span style={{ fontWeight: "700", color: "#1e293b" }}>{successPopup.customerName}</span>'s{" "}
              <span style={{ fontWeight: "600", color: "#3b82f6" }}>{successPopup.type === 'sub' ? 'Subscription' : 'Trial'}</span>{" "}
              has been successfully assigned to{" "}
              <span style={{ fontWeight: "700", color: "#1e293b" }}>{successPopup.boyName}</span>.
            </div>
            <button
              onClick={() => setSuccessPopup({ show: false, customerName: '', boyName: '', type: '' })}
              style={{ padding: "12px 36px", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", color: "white", border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "15px", cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}
            >
              Done
            </button>
          </div>
          <style>{`@keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
        </div>
      )}

      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b", margin: 0 }}>Delivery Boy Management</h2>
        <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>Set pincodes, areas, and daily availability for your delivery team.</p>
      </div>

      {boys.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", color: "#64748b" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>👥</div>
          <div style={{ fontWeight: "600", fontSize: "16px" }}>No delivery boys found.</div>
          <div style={{ fontSize: "14px", marginTop: "4px" }}>Create users with a custom role first, then set their delivery profile here.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {boys.map(boy => {
            const avail = boy.todayAvailability || "Available";
            const sc = statusColor[avail] || statusColor.Available;
            const hasProfile = !!boy.profile;
            return (
              <div key={boy.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                {/* Header */}
                <div style={{ background: "linear-gradient(135deg, #1e40af, #3b82f6)", padding: "16px 20px", color: "white" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "16px" }}>{boy.name}</div>
                      <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "2px" }}>{boy.roleName}</div>
                    </div>
                    <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", background: sc.bg, color: sc.color, display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: sc.dot }} />
                      {avail}
                    </span>
                  </div>
                </div>

                {/* Profile Info */}
                <div style={{ padding: "16px 20px", fontSize: "13px", color: "#475569", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {hasProfile ? (
                    <>
                      <div><strong>📞 Mobile:</strong> {boy.profile.mobile || <span style={{ color: "#94a3b8" }}>Not set</span>}</div>
                      <div><strong>📍 Pincodes:</strong> {boy.profile.pincodes?.length > 0 ? boy.profile.pincodes.join(", ") : <span style={{ color: "#94a3b8" }}>None assigned</span>}</div>
                      <div><strong>📏 Radius:</strong> {boy.profile.deliveryRadius} KM</div>
                      {boy.profile.latitude && <div><strong>🗺️ Location:</strong> {Number(boy.profile.latitude).toFixed(4)}, {Number(boy.profile.longitude).toFixed(4)}</div>}
                      <div><strong>🔘 Status:</strong> <span style={{ color: boy.profile.accountStatus === "Active" ? "#16a34a" : "#dc2626", fontWeight: "600" }}>{boy.profile.accountStatus}</span></div>
                    </>
                  ) : (
                    <div style={{ padding: "10px", background: "#fef3c7", borderRadius: "8px", color: "#b45309", fontSize: "13px", fontWeight: "600" }}>
                      ⚠️ Delivery profile not set up yet.
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9", display: "flex", gap: "8px", flexDirection: "column" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => openProfileModal(boy)} style={{ flex: 1, padding: "9px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                      ✏️ {hasProfile ? "Edit Profile" : "Setup Profile"}
                    </button>
                    <button onClick={() => openAvailModal(boy)} style={{ flex: 1, padding: "9px", background: "#f8fafc", color: "#334155", border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                      📅 Availability
                    </button>
                  </div>
                  {hasProfile && avail === "Available" && (
                    <button onClick={() => openAssignModal(boy)} style={{ width: "100%", padding: "9px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                      📦 Assign Orders
                    </button>
                  )}
                  {hasProfile && avail !== "Available" && (
                    <div style={{ width: "100%", padding: "9px", background: avail === "On Leave" ? "#fef3c7" : "#fee2e2", color: avail === "On Leave" ? "#b45309" : "#b91c1c", border: `1px solid ${avail === "On Leave" ? "#fde68a" : "#fca5a5"}`, borderRadius: "8px", fontWeight: "600", fontSize: "13px", textAlign: "center", boxSizing: "border-box" }}>
                      {avail === "On Leave" ? "🚫 On Leave — Cannot Assign Orders" : "🚫 Unavailable — Cannot Assign Orders"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Profile Edit Modal */}
      {profileModal.isOpen && profileModal.boy && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "500px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ background: "#f8fafc", padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#1e293b", fontWeight: "700" }}>Delivery Profile — {profileModal.boy.name}</h3>
              <button onClick={() => setProfileModal({ isOpen: false, boy: null })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", color: "#64748b" }}>✕</button>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "70vh", overflowY: "auto" }}>

              <div>
                <label style={{ display: "block", fontWeight: "600", color: "#475569", fontSize: "13px", marginBottom: "6px" }}>📞 Mobile Number</label>
                <input value={profileForm.mobile} onChange={e => setProfileForm({ ...profileForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="e.g. 9876543210" maxLength="10"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", fontWeight: "600", color: "#475569", fontSize: "13px", marginBottom: "6px" }}>📍 Assigned Pincodes (comma separated)</label>
                <input value={profileForm.pincodes} onChange={e => setProfileForm({ ...profileForm, pincodes: e.target.value })} placeholder="e.g. 382330, 382350, 380001"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Separate multiple pincodes with commas</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: "600", color: "#475569", fontSize: "13px", marginBottom: "6px" }}>🗺️ Latitude</label>
                  <input type="number" step="0.0001" value={profileForm.latitude} onChange={e => setProfileForm({ ...profileForm, latitude: e.target.value })} placeholder="23.0225"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: "600", color: "#475569", fontSize: "13px", marginBottom: "6px" }}>🗺️ Longitude</label>
                  <input type="number" step="0.0001" value={profileForm.longitude} onChange={e => setProfileForm({ ...profileForm, longitude: e.target.value })} placeholder="72.5714"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: "600", color: "#475569", fontSize: "13px", marginBottom: "6px" }}>📏 Delivery Radius (KM)</label>
                <input type="number" min="1" max="100" value={profileForm.deliveryRadius} onChange={e => setProfileForm({ ...profileForm, deliveryRadius: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", fontWeight: "600", color: "#475569", fontSize: "13px", marginBottom: "8px" }}>🔘 Account Status</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {["Active", "Inactive"].map(s => (
                    <button key={s} onClick={() => setProfileForm({ ...profileForm, accountStatus: s })}
                      style={{
                        flex: 1, padding: "10px", border: "1px solid", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px",
                        borderColor: profileForm.accountStatus === s ? (s === "Active" ? "#16a34a" : "#dc2626") : "#cbd5e1",
                        background: profileForm.accountStatus === s ? (s === "Active" ? "#dcfce7" : "#fee2e2") : "white",
                        color: profileForm.accountStatus === s ? (s === "Active" ? "#16a34a" : "#dc2626") : "#64748b"
                      }}>{s}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: "600", color: "#475569", fontSize: "13px", marginBottom: "8px" }}>📅 Default Daily Status</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {["Available", "On Leave", "Unavailable"].map(s => {
                    const sc = statusColor[s];
                    return (
                      <button key={s} onClick={() => setProfileForm({ ...profileForm, dailyStatus: s })}
                        style={{
                          flex: 1, padding: "8px 4px", border: "1px solid", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "12px",
                          borderColor: profileForm.dailyStatus === s ? sc.dot : "#cbd5e1",
                          background: profileForm.dailyStatus === s ? sc.bg : "white",
                          color: profileForm.dailyStatus === s ? sc.color : "#64748b"
                        }}>{s}</button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "12px" }}>
              <button onClick={() => setProfileModal({ isOpen: false, boy: null })} style={{ flex: 1, padding: "11px", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: "#475569" }}>Cancel</button>
              <button onClick={saveProfile} style={{ flex: 2, padding: "11px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "14px" }}>Save Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* Availability Modal */}
      {availModal.isOpen && availModal.boy && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "440px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ background: "#f8fafc", padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#1e293b", fontWeight: "700" }}>Availability — {availModal.boy.name}</h3>
              <button onClick={() => setAvailModal({ isOpen: false, boy: null })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", color: "#64748b" }}>✕</button>
            </div>
            <div style={{ padding: "24px" }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontWeight: "600", color: "#475569", fontSize: "13px", marginBottom: "6px" }}>Date</label>
                <input type="date" value={availForm.date} onChange={e => setAvailForm({ ...availForm, date: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontWeight: "600", color: "#475569", fontSize: "13px", marginBottom: "8px" }}>Status</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {["Available", "On Leave", "Unavailable"].map(s => {
                    const sc = statusColor[s];
                    return (
                      <button key={s} onClick={() => setAvailForm({ ...availForm, status: s })}
                        style={{
                          flex: 1, padding: "10px 4px", border: "1px solid", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "12px",
                          borderColor: availForm.status === s ? sc.dot : "#cbd5e1",
                          background: availForm.status === s ? sc.bg : "white",
                          color: availForm.status === s ? sc.color : "#64748b"
                        }}>{s}</button>
                    );
                  })}
                </div>
              </div>
              <button onClick={saveAvailability} style={{ width: "100%", padding: "12px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "14px", marginBottom: "20px" }}>Set Availability</button>

              {/* Upcoming availability list */}
              {availList.length > 0 && (
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Scheduled Availability</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
                    {availList.map(a => {
                      const sc = statusColor[a.status] || statusColor.Available;
                      return (
                        <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: sc.bg, borderRadius: "8px" }}>
                          <span style={{ fontWeight: "600", color: sc.color, fontSize: "13px" }}>{fmt(a.date)}</span>
                          <span style={{ fontSize: "12px", fontWeight: "700", color: sc.color }}>{a.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Assign Orders Modal */}
      {assignModal.isOpen && assignModal.boy && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "800px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
            <div style={{ background: "#f8fafc", padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#1e293b", fontWeight: "700" }}>📦 Assign Orders to {assignModal.boy.name}</h3>
              <button onClick={() => setAssignModal({ isOpen: false, boy: null, trials: [], subs: [], loading: false, activeTab: 'sub' })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", color: "#64748b" }}>✕</button>
            </div>

            <div style={{ display: "flex", background: "#f1f5f9", padding: "12px 24px 0", gap: "16px", borderBottom: "1px solid #e2e8f0" }}>
              <button onClick={() => setAssignModal({ ...assignModal, activeTab: 'sub' })} style={{ padding: "10px 16px", background: assignModal.activeTab === 'sub' ? "white" : "transparent", border: "none", borderTopLeftRadius: "8px", borderTopRightRadius: "8px", cursor: "pointer", fontWeight: "600", color: assignModal.activeTab === 'sub' ? "#0f172a" : "#64748b", borderBottom: assignModal.activeTab === 'sub' ? "2px solid #3b82f6" : "none" }}>Subscriptions</button>
              <button onClick={() => setAssignModal({ ...assignModal, activeTab: 'trial' })} style={{ padding: "10px 16px", background: assignModal.activeTab === 'trial' ? "white" : "transparent", border: "none", borderTopLeftRadius: "8px", borderTopRightRadius: "8px", cursor: "pointer", fontWeight: "600", color: assignModal.activeTab === 'trial' ? "#0f172a" : "#64748b", borderBottom: assignModal.activeTab === 'trial' ? "2px solid #3b82f6" : "none" }}>Trials</button>
            </div>

            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              {/* Filter Info Banner */}
              {!assignModal.loading && (
                <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {/* Pincode filter */}
                  <div style={{ padding: "10px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", fontSize: "13px", color: "#1d4ed8", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📍</span>
                    <span>
                      <strong>Location Filter:</strong> Showing orders from pincodes:{" "}
                      <strong>
                        {(assignModal.boy?.profile?.pincodes || []).length > 0
                          ? (assignModal.boy.profile.pincodes).join(", ")
                          : "None set (showing all)"}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
              {assignModal.loading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading orders...</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {(assignModal.activeTab === 'sub' ? assignModal.subs : assignModal.trials).filter(o => o.status !== "Cancelled" && o.status !== "Completed" && o.status !== "Rejected").map(order => {
                    const isAssignedToThis = order.deliveryBoyId === assignModal.boy.id;
                    const isAssignedToOther = order.deliveryBoyId && !isAssignedToThis;

                    return (
                      <div key={order.id} style={{ padding: "16px", border: "1px solid #e2e8f0", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: isAssignedToThis ? "#f0fdf4" : "white" }}>
                        <div>
                          <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "15px", marginBottom: "4px" }}>{order.customerName} - {order.milkType} ({order.quantity} L)</div>
                          <div style={{ color: "#64748b", fontSize: "13px" }}>
                            <span style={{ fontWeight: "600", color: "#475569" }}>Pincode:</span> {order.pincode} |
                            <span style={{ fontWeight: "600", color: "#475569", marginLeft: "6px" }}>Address:</span> {order.address}
                          </div>
                          {isAssignedToOther && (
                            <div style={{ fontSize: "12px", color: "#b45309", marginTop: "6px", background: "#fef3c7", padding: "2px 8px", borderRadius: "12px", display: "inline-block" }}>
                              Already assigned to another delivery boy
                            </div>
                          )}
                        </div>
                        <div>
                          {isAssignedToThis ? (
                            <button disabled style={{ padding: "8px 16px", background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: "8px", fontWeight: "600", fontSize: "13px", cursor: "not-allowed" }}>✓ Assigned</button>
                          ) : (
                            <button onClick={() => handleAssignOrder(order.id, assignModal.activeTab)} style={{ padding: "8px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>{isAssignedToOther ? "Reassign" : "Assign"}</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(assignModal.activeTab === 'sub' ? assignModal.subs : assignModal.trials).filter(o => o.status !== "Cancelled" && o.status !== "Completed" && o.status !== "Rejected").length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                      <div style={{ fontSize: "36px", marginBottom: "8px" }}>📍</div>
                      <div style={{ fontWeight: "600", fontSize: "15px", marginBottom: "4px" }}>No matching orders found</div>
                      <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                        Only showing orders from this delivery boy's assigned pincodes:
                        <strong style={{ color: "#3b82f6", marginLeft: "4px" }}>
                          {(assignModal.boy?.profile?.pincodes || []).length > 0
                            ? (assignModal.boy.profile.pincodes).join(", ")
                            : "None set — showing all"}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryBoyManagement;
