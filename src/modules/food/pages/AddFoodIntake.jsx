import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../services/api";

const uiIcons = { cow: "🐄" };

const AddFoodIntake = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [cows, setCows] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  
  const editGroup = location.state?.editGroup;
  const [selectedDate, setSelectedDate] = useState(editGroup?.dateStr || new Date().toISOString().split("T")[0]);

  const [selectedFeeds, setSelectedFeeds] = useState({}); // { cowId: [itemId1, itemId2] }
  const [entries, setEntries] = useState({}); // { cowId: { itemId: { morning, afternoon, evening, remark, recordId } } }

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ text: "", type: "" });

  // To track which cow's dropdown is open
  const [openDropdownCowId, setOpenDropdownCowId] = useState(null);
  const dropdownRef = useRef(null);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [cowsRes, itemsRes, intakeRes] = await Promise.all([
          api.get("/api/admin/cows"),
          api.get("/api/admin/items"),
          api.get("/api/admin/food-intake")
        ]);

        const activeCows = cowsRes.data.filter(c => c.status === "Active" || !c.status);
        setCows(activeCows);

        const invItems = Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data?.items || [];
        setFeedItems(invItems);

        // Filter intake records for selectedDate
        const recordsForDate = intakeRes.data.filter(r => {
          if (!r.recordedAt) return false;
          return r.recordedAt.startsWith(selectedDate) || new Date(r.recordedAt).toISOString().startsWith(selectedDate);
        });

        // Initialize state
        const initialSelectedFeeds = {};
        const initialEntries = {};
        
        activeCows.forEach(cow => {
          initialSelectedFeeds[cow.id] = [];
          initialEntries[cow.id] = {};
        });

        // Populate existing data
        recordsForDate.forEach(r => {
          if (initialSelectedFeeds[r.cowId]) {
            // Find itemId from foodItem name or if r has itemId
            let iId = r.itemId;
            if (!iId) {
              const fItem = invItems.find(i => (i.name || "").trim().toLowerCase() === (r.foodItem || "").trim().toLowerCase());
              if (fItem) {
                 iId = fItem.id;
              } else {
                 iId = "temp_" + r.id;
                 invItems.push({ id: iId, name: r.foodItem || "Unknown Item" });
              }
            }
            if (iId) {
              if (!initialSelectedFeeds[r.cowId].includes(iId)) {
                initialSelectedFeeds[r.cowId].push(iId);
              }
              initialEntries[r.cowId][iId] = {
                morning: r.morningIntake || "",
                afternoon: r.afternoonIntake || "",
                evening: r.eveningIntake || "",
                remark: r.notes || "",
                recordId: r.id
              };
            }
          }
        });

        setFeedItems([...invItems]);
        setSelectedFeeds(initialSelectedFeeds);
        setEntries(initialEntries);
      } catch (err) {
        showToast("Failed to load animals or feed items.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedDate]); // Re-fetch/populate when date changes

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownCowId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleFeedItem = (cowId, itemId) => {
    setSelectedFeeds(prev => {
      const current = prev[cowId] || [];
      const updated = current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId];
      return { ...prev, [cowId]: updated };
    });

    setEntries(prev => {
      const cowEntries = { ...prev[cowId] };
      if (!cowEntries[itemId]) {
        cowEntries[itemId] = { morning: "", afternoon: "", evening: "", remark: "" };
      }
      return { ...prev, [cowId]: cowEntries };
    });
  };

  const handleInputChange = (cowId, itemId, field, value) => {
    setEntries(prev => ({
      ...prev,
      [cowId]: {
        ...prev[cowId],
        [itemId]: {
          ...prev[cowId][itemId],
          [field]: value
        }
      }
    }));
  };

  const getRowTotal = (cowId, itemId) => {
    const rec = entries[cowId]?.[itemId];
    if (!rec) return 0;
    const m = parseFloat(rec.morning) || 0;
    const a = parseFloat(rec.afternoon) || 0;
    const e = parseFloat(rec.evening) || 0;
    return m + a + e;
  };

  const clearAll = () => {
    const clearedFeeds = {};
    const clearedEntries = {};
    cows.forEach(cow => {
      clearedFeeds[cow.id] = [];
      clearedEntries[cow.id] = {};
    });
    setSelectedFeeds(clearedFeeds);
    setEntries(clearedEntries);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const promises = [];

    cows.forEach(cow => {
      const feeds = selectedFeeds[cow.id] || [];
      feeds.forEach(itemId => {
        const intake = entries[cow.id]?.[itemId];
        if (intake && (intake.morning || intake.afternoon || intake.evening || intake.recordId)) {
          const selectedItem = feedItems.find(i => String(i.id) === String(itemId));
          const total = getRowTotal(cow.id, itemId);
          const hasIntake = total > 0 || (intake.remark && intake.remark.trim() !== "");

          if (intake.recordId) {
             if (hasIntake) {
                // Update
                promises.push(api.put(`/api/admin/food-intake/${intake.recordId}`, {
                  cowId: cow.id,
                  recordedAt: selectedDate,
                  itemId: itemId,
                  foodItem: selectedItem ? selectedItem.name : "",
                  foodType: "Green Fodder",
                  morningIntake: parseFloat(intake.morning) || 0,
                  afternoonIntake: parseFloat(intake.afternoon) || 0,
                  eveningIntake: parseFloat(intake.evening) || 0,
                  notes: intake.remark || "",
                  totalIntake: total
                }));
             } else {
                // Delete if cleared
                promises.push(api.delete(`/api/admin/food-intake/${intake.recordId}`));
             }
          } else if (hasIntake) {
            // Create
            promises.push(api.post("/api/admin/food-intake", {
              cowId: cow.id,
              recordedAt: selectedDate,
              itemId: itemId,
              foodItem: selectedItem ? selectedItem.name : "",
              foodType: "Green Fodder", 
              morningIntake: parseFloat(intake.morning) || 0,
              afternoonIntake: parseFloat(intake.afternoon) || 0,
              eveningIntake: parseFloat(intake.evening) || 0,
              notes: intake.remark || "",
              totalIntake: total
            }));
          }
        }
      });
    });

    if (promises.length === 0) {
      showToast("No changes to save.", "error");
      setSaving(false);
      return;
    }

    try {
      await Promise.all(promises);
      showToast("✅ Feed Intake entries saved successfully!");
      setTimeout(() => navigate("/admin/food-intake"), 1000);
    } catch {
      showToast("Failed to save entries. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Grand totals
  let totalMorning = 0;
  let totalAfternoon = 0;
  let totalEvening = 0;
  let grandTotal = 0;

  Object.keys(entries).forEach(cowId => {
    const feeds = selectedFeeds[cowId] || [];
    feeds.forEach(itemId => {
      const rec = entries[cowId]?.[itemId];
      if (rec) {
        totalMorning += parseFloat(rec.morning) || 0;
        totalAfternoon += parseFloat(rec.afternoon) || 0;
        totalEvening += parseFloat(rec.evening) || 0;
      }
    });
  });
  grandTotal = totalMorning + totalAfternoon + totalEvening;

  return (
    <section className="cattle-page" style={{ paddingBottom: "100px" }}>
      {toast.text && (
        <div style={{
          position: "fixed", top: 18, right: 18, zIndex: 9999,
          background: toast.type === "error" ? "#fef2f2" : "#e8f5ee",
          border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#b7e0c8"}`,
          color: toast.type === "error" ? "#dc2626" : "#146C43",
          borderRadius: 8, padding: "10px 16px",
          fontWeight: 600, fontSize: 14,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}>
          {toast.text}
        </div>
      )}

      {/* Toolbar */}
      <section className="cattle-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px", background: "#fff", padding: "16px 20px", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <button type="button" onClick={() => navigate("/admin/food-intake")} style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#1e293b"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#475569"; }} title="Go Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            <span style={{ fontWeight: 600, fontSize: "14px" }}>Back</span>
          </button>
          <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.25rem" }}>Feed Intake Register</h3>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "500" }}>Date</span>
            <input
              type="date"
              max={new Date().toISOString().split("T")[0]}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", fontSize: "14px", color: "#0f172a", fontWeight: "600" }}
            />
          </div>
          <button type="button" onClick={clearAll} style={{ background: "#fff", color: "#d97706", border: "1px solid #fcd34d", padding: "8px 16px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#fef3c7"} onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>
            <span style={{ marginRight: "6px" }}>🧹</span>Clear All
          </button>
          <button type="button" onClick={handleSaveAll} disabled={saving || cows.length === 0} style={{ background: "#1f6b3a", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", fontSize: "14px", cursor: (saving || cows.length === 0) ? "not-allowed" : "pointer", boxShadow: "0 4px 6px -1px rgb(31 107 58 / 0.3)", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "💾 Save All Entries"}
          </button>
        </div>
      </section>

      {/* Table */}
      <section style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)", border: "1px solid #f1f5f9", overflowX: "auto", padding: "4px" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0", minWidth: "1000px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ padding: "16px 20px", textAlign: "left", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", width: "50px", borderTopLeftRadius: "12px", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>#</th>
              <th style={{ padding: "16px 20px", textAlign: "left", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", width: "220px", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Animal Details</th>
              <th style={{ padding: "16px 20px", textAlign: "left", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", width: "120px", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Reg No</th>
              <th style={{ padding: "16px 20px", textAlign: "left", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", width: "200px", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Feed Item</th>
              <th style={{ padding: "16px 20px", textAlign: "center", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Morning</th>
              <th style={{ padding: "16px 20px", textAlign: "center", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Afternoon</th>
              <th style={{ padding: "16px 20px", textAlign: "center", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Evening</th>
              <th style={{ padding: "16px 20px", textAlign: "center", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Remark</th>
              <th style={{ padding: "16px 20px", textAlign: "center", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", width: "120px", borderTopRightRadius: "12px", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Row Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ textAlign: "center", padding: "4rem", color: "#64748b", fontSize: "15px" }}>Loading animals and feed items...</td></tr>
            ) : cows.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: "center", padding: "4rem", color: "#64748b", fontSize: "15px" }}>No active animals found.</td></tr>
            ) : (
              cows.map((cow, idx) => {
                const feeds = selectedFeeds[cow.id] || [];
                const rowCount = feeds.length > 0 ? feeds.length + 1 : 2; 
                const isEven = idx % 2 === 0;
                const rowBg = isEven ? "#ffffff" : "#f8fafc";
                const borderBot = "1px solid #f1f5f9";
                
                const inputStyle = { width: "80px", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", textAlign: "right", outline: "none", fontSize: "14px", color: "#0f172a", backgroundColor: "#fff", transition: "all 0.2s ease", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)" };
                const remarkStyle = { width: "100%", minWidth: "120px", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", outline: "none", fontSize: "14px", color: "#0f172a", backgroundColor: "#fff", transition: "all 0.2s ease", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)" };

                return (
                  <React.Fragment key={cow.id}>
                    {feeds.length === 0 ? (
                      // NO FEEDS SELECTED
                      <>
                        <tr style={{ background: rowBg, transition: "background 0.2s" }} className="hover:bg-slate-50">
                          <td rowSpan={2} style={{ padding: "20px", fontWeight: "600", borderBottom: borderBot, verticalAlign: "top", color: "#94a3b8", fontSize: "14px" }}>
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td rowSpan={2} style={{ padding: "20px", borderBottom: borderBot, verticalAlign: "top" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: "#0284c7" }}>
                                {uiIcons.cow}
                              </div>
                              <div>
                                <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "15px", marginBottom: "2px" }}>{cow.name || "Unknown"}</div>
                                <span style={{ fontSize: "11px", color: "#475569", background: "#f1f5f9", padding: "3px 8px", borderRadius: "12px", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                                  {cow.animalType || "Cow"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td rowSpan={2} style={{ padding: "20px", borderBottom: borderBot, verticalAlign: "top" }}>
                            <span style={{ fontWeight: "600", color: "#64748b", fontSize: "14px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "4px 8px", borderRadius: "6px" }}>{cow.regNo || cow.tagNo || "-"}</span>
                          </td>
                          <td colSpan={6} style={{ padding: "16px 20px", color: "#94a3b8", fontStyle: "italic", borderBottom: "1px solid transparent", fontSize: "14px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#f1f5f9", padding: "6px 12px", borderRadius: "20px" }}>
                              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#cbd5e1" }}></span> No feed item selected
                            </span>
                          </td>
                        </tr>
                        {/* Control Row */}
                        <tr style={{ background: rowBg }}>
                          <td colSpan={6} style={{ padding: "0 20px 20px 20px", borderBottom: borderBot }}>
                            <div style={{ position: "relative" }} ref={openDropdownCowId === cow.id ? dropdownRef : null}>
                              <button
                                type="button"
                                onClick={() => setOpenDropdownCowId(openDropdownCowId === cow.id ? null : cow.id)}
                                style={{ background: openDropdownCowId === cow.id ? "#f0fdf4" : "#fff", border: `1px solid ${openDropdownCowId === cow.id ? "#86efac" : "#cbd5e1"}`, borderRadius: "24px", padding: "6px 16px", fontSize: "13px", fontWeight: "600", color: openDropdownCowId === cow.id ? "#16a34a" : "#475569", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", transition: "all 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                                onMouseEnter={(e) => { if (openDropdownCowId !== cow.id) { e.currentTarget.style.borderColor = "#94a3b8"; e.currentTarget.style.color = "#334155"; } }}
                                onMouseLeave={(e) => { if (openDropdownCowId !== cow.id) { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.color = "#475569"; } }}
                              >
                                <span style={{ fontSize: "16px", lineHeight: "1" }}>+</span> Add Feed Item
                              </button>
                              {openDropdownCowId === cow.id && (
                                <div style={{ position: "absolute", top: "100%", left: "0", marginTop: "8px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)", zIndex: 20, minWidth: "240px", maxHeight: "280px", overflowY: "auto", padding: "6px" }}>
                                  {feedItems.length === 0 ? (
                                    <div style={{ padding: "16px", color: "#64748b", fontSize: "14px", textAlign: "center" }}>No feed items available</div>
                                  ) : (
                                    feedItems.map(item => (
                                      <div key={item.id} onClick={() => toggleFeedItem(cow.id, item.id)} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", borderRadius: "8px", marginBottom: "2px", background: feeds.includes(item.id) ? "#f0fdf4" : "transparent", transition: "background 0.15s" }} onMouseEnter={(e) => { if (!feeds.includes(item.id)) e.currentTarget.style.background = "#f8fafc" }} onMouseLeave={(e) => { if (!feeds.includes(item.id)) e.currentTarget.style.background = "transparent" }}>
                                        <div style={{ width: "18px", height: "18px", borderRadius: "4px", border: `2px solid ${feeds.includes(item.id) ? "#16a34a" : "#cbd5e1"}`, background: feeds.includes(item.id) ? "#16a34a" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                                          {feeds.includes(item.id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                        </div>
                                        <span style={{ fontSize: "14px", color: feeds.includes(item.id) ? "#16a34a" : "#334155", fontWeight: feeds.includes(item.id) ? "600" : "500" }}>{item.name}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      </>
                    ) : (
                      // FEEDS SELECTED
                      <>
                        {feeds.map((itemId, fIdx) => {
                          const item = feedItems.find(i => i.id === itemId);
                          const intake = entries[cow.id]?.[itemId] || { morning: "", afternoon: "", evening: "", remark: "" };
                          const rowTotal = getRowTotal(cow.id, itemId);
                          const isLastFeed = fIdx === feeds.length - 1;

                          return (
                            <tr key={`${cow.id}-${itemId}`} style={{ background: rowBg }}>
                              {fIdx === 0 && (
                                <td rowSpan={rowCount} style={{ padding: "20px", fontWeight: "600", borderBottom: borderBot, verticalAlign: "top", color: "#94a3b8", fontSize: "14px" }}>
                                  {String(idx + 1).padStart(2, '0')}
                                </td>
                              )}
                              {fIdx === 0 && (
                                <td rowSpan={rowCount} style={{ padding: "20px", borderBottom: borderBot, verticalAlign: "top" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: "#0284c7" }}>
                                      {uiIcons.cow}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "15px", marginBottom: "2px" }}>{cow.name || "Unknown"}</div>
                                      <span style={{ fontSize: "11px", color: "#475569", background: "#f1f5f9", padding: "3px 8px", borderRadius: "12px", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                                        {cow.animalType || "Cow"}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              )}
                              {fIdx === 0 && (
                                <td rowSpan={rowCount} style={{ padding: "20px", borderBottom: borderBot, verticalAlign: "top" }}>
                                  <span style={{ fontWeight: "600", color: "#64748b", fontSize: "14px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "4px 8px", borderRadius: "6px" }}>{cow.regNo || cow.tagNo || "-"}</span>
                                </td>
                              )}

                              {/* Feed Row Inputs */}
                              <td style={{ padding: "12px 20px", borderBottom: isLastFeed ? "1px solid transparent" : "1px solid #f1f5f9" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "8px 12px", borderRadius: "8px" }}>
                                  <span style={{ fontWeight: "600", color: "#16a34a", fontSize: "14px" }}>{item?.name}</span>
                                  <button type="button" onClick={() => toggleFeedItem(cow.id, itemId)} style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: "50%", color: "#ef4444", cursor: "pointer", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2" }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fff" }} title="Remove item">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                  </button>
                                </div>
                              </td>

                              <td style={{ padding: "12px 20px", borderBottom: isLastFeed ? "1px solid transparent" : "1px solid #f1f5f9" }}>
                                <input type="number" step="0.1" min="0" value={intake.morning} onChange={(e) => handleInputChange(cow.id, itemId, "morning", e.target.value)} style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "#10b981"; e.target.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)"; }} onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.02)"; }} placeholder="0.0" />
                              </td>
                              <td style={{ padding: "12px 20px", borderBottom: isLastFeed ? "1px solid transparent" : "1px solid #f1f5f9" }}>
                                <input type="number" step="0.1" min="0" value={intake.afternoon} onChange={(e) => handleInputChange(cow.id, itemId, "afternoon", e.target.value)} style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "#10b981"; e.target.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)"; }} onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.02)"; }} placeholder="0.0" />
                              </td>
                              <td style={{ padding: "12px 20px", borderBottom: isLastFeed ? "1px solid transparent" : "1px solid #f1f5f9" }}>
                                <input type="number" step="0.1" min="0" value={intake.evening} onChange={(e) => handleInputChange(cow.id, itemId, "evening", e.target.value)} style={inputStyle} onFocus={(e) => { e.target.style.borderColor = "#10b981"; e.target.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)"; }} onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.02)"; }} placeholder="0.0" />
                              </td>
                              <td style={{ padding: "12px 20px", borderBottom: isLastFeed ? "1px solid transparent" : "1px solid #f1f5f9" }}>
                                <input type="text" value={intake.remark} onChange={(e) => handleInputChange(cow.id, itemId, "remark", e.target.value)} style={remarkStyle} onFocus={(e) => { e.target.style.borderColor = "#10b981"; e.target.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)"; }} onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.02)"; }} placeholder="Add note..." />
                              </td>
                              <td style={{ padding: "12px 20px", borderBottom: isLastFeed ? "1px solid transparent" : "1px solid #f1f5f9", textAlign: "center", fontWeight: "700", color: rowTotal > 0 ? "#0f172a" : "#94a3b8", fontSize: "16px" }}>
                                {rowTotal > 0 ? <span style={{ background: "#f8fafc", padding: "4px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>{rowTotal.toFixed(1)}</span> : "-"}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Control Row for when feeds exist */}
                        <tr style={{ background: rowBg }}>
                          <td colSpan={6} style={{ padding: "0 20px 20px 20px", borderBottom: borderBot }}>
                            <div style={{ position: "relative" }} ref={openDropdownCowId === cow.id ? dropdownRef : null}>
                              <button
                                type="button"
                                onClick={() => setOpenDropdownCowId(openDropdownCowId === cow.id ? null : cow.id)}
                                style={{ background: openDropdownCowId === cow.id ? "#f0fdf4" : "#fff", border: `1px solid ${openDropdownCowId === cow.id ? "#86efac" : "#cbd5e1"}`, borderRadius: "24px", padding: "6px 16px", fontSize: "13px", fontWeight: "600", color: openDropdownCowId === cow.id ? "#16a34a" : "#475569", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", transition: "all 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", marginTop: "8px" }}
                                onMouseEnter={(e) => { if (openDropdownCowId !== cow.id) { e.currentTarget.style.borderColor = "#94a3b8"; e.currentTarget.style.color = "#334155"; } }}
                                onMouseLeave={(e) => { if (openDropdownCowId !== cow.id) { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.color = "#475569"; } }}
                              >
                                <span style={{ fontSize: "16px", lineHeight: "1" }}>+</span> Add Feed Item
                              </button>
                              {openDropdownCowId === cow.id && (
                                <div style={{ position: "absolute", top: "100%", left: "0", marginTop: "8px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)", zIndex: 20, minWidth: "240px", maxHeight: "280px", overflowY: "auto", padding: "6px" }}>
                                  {feedItems.length === 0 ? (
                                    <div style={{ padding: "16px", color: "#64748b", fontSize: "14px", textAlign: "center" }}>No feed items available</div>
                                  ) : (
                                    feedItems.map(item => (
                                      <div key={item.id} onClick={() => toggleFeedItem(cow.id, item.id)} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", borderRadius: "8px", marginBottom: "2px", background: feeds.includes(item.id) ? "#f0fdf4" : "transparent", transition: "background 0.15s" }} onMouseEnter={(e) => { if (!feeds.includes(item.id)) e.currentTarget.style.background = "#f8fafc" }} onMouseLeave={(e) => { if (!feeds.includes(item.id)) e.currentTarget.style.background = "transparent" }}>
                                        <div style={{ width: "18px", height: "18px", borderRadius: "4px", border: `2px solid ${feeds.includes(item.id) ? "#16a34a" : "#cbd5e1"}`, background: feeds.includes(item.id) ? "#16a34a" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                                          {feeds.includes(item.id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                        </div>
                                        <span style={{ fontSize: "14px", color: feeds.includes(item.id) ? "#16a34a" : "#334155", fontWeight: feeds.includes(item.id) ? "600" : "500" }}>{item.name}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      </>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
          {!loading && cows.length > 0 && (
            <tfoot style={{ background: "#f8fafc" }}>
              <tr>
                <td colSpan={4} style={{ padding: "20px", textAlign: "right", fontWeight: "700", fontSize: "15px", color: "#1e293b", borderTop: "2px solid #e2e8f0", borderBottomLeftRadius: "12px" }}>Daily Totals (Herd)</td>
                <td style={{ padding: "20px", textAlign: "center", fontWeight: "700", fontSize: "16px", color: "#0ea5e9", borderTop: "2px solid #e2e8f0" }}>{totalMorning > 0 ? totalMorning.toFixed(1) : "-"}</td>
                <td style={{ padding: "20px", textAlign: "center", fontWeight: "700", fontSize: "16px", color: "#f59e0b", borderTop: "2px solid #e2e8f0" }}>{totalAfternoon > 0 ? totalAfternoon.toFixed(1) : "-"}</td>
                <td style={{ padding: "20px", textAlign: "center", fontWeight: "700", fontSize: "16px", color: "#8b5cf6", borderTop: "2px solid #e2e8f0" }}>{totalEvening > 0 ? totalEvening.toFixed(1) : "-"}</td>
                <td style={{ padding: "20px", borderTop: "2px solid #e2e8f0" }}></td>
                <td style={{ padding: "20px", textAlign: "center", fontWeight: "800", fontSize: "18px", color: "#16a34a", borderTop: "2px solid #e2e8f0", borderBottomRightRadius: "12px" }}>{grandTotal > 0 ? `${grandTotal.toFixed(1)} Kg` : "-"}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </section>
    </section>
  );
};

export default AddFoodIntake;
