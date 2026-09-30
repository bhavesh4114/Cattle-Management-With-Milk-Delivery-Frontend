import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import { useConfirm } from "../../../context/ConfirmContext";
import { hasPermission } from "../../../utils/permissions";
import ExportButtons from "../../../components/ExportButtons";

const initialForm = {
  name: "",
  unit: "Kg",
  price: "",
  minimumLevel: "",
  currentStock: "",
  remarks: "",
};

const Items = ({ onChanged }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ text: "", type: "" });
  const { confirm, customAlert } = useConfirm();
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [tempQuantity, setTempQuantity] = useState("");
  const [selectedItemForQty, setSelectedItemForQty] = useState(null);
  const [showFormAddQtyModal, setShowFormAddQtyModal] = useState(false);
  const [formTempQuantity, setFormTempQuantity] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [units, setUnits] = useState(() => {
    const saved = localStorage.getItem("itemUnits");
    let parsedUnits = saved ? JSON.parse(saved) : ["Kg", "Ltr", "Pcs", "Bags"];

    // Clean up: remove duplicates and remove the mistakenly added '5'
    parsedUnits = [...new Set(parsedUnits)].filter(u => u !== '5');

    // Update local storage with cleaned up units
    localStorage.setItem("itemUnits", JSON.stringify(parsedUnits));

    return parsedUnits;
  });
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");

  const adminData = JSON.parse(localStorage.getItem("adminData") || "{}");
  const canAdd = hasPermission(adminData, "items", "add");
  const canEdit = hasPermission(adminData, "items", "edit");
  const canDelete = hasPermission(adminData, "items", "delete");

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  const handleAddUnit = () => {
    if (!newUnitName.trim()) return;
    const updated = [...units, newUnitName.trim()];
    setUnits(updated);
    localStorage.setItem("itemUnits", JSON.stringify(updated));
    setFormData({ ...formData, unit: newUnitName.trim() });
    setShowAddUnitModal(false);
    setNewUnitName("");
  };

  const submitAddQuantity = async () => {
    if (!tempQuantity || isNaN(tempQuantity) || Number(tempQuantity) <= 0) return;
    try {
      const newStock = Number(selectedItemForQty.currentStock) + Number(tempQuantity);
      await api.put(`/api/admin/items/${selectedItemForQty.id}`, {
        name: selectedItemForQty.name,
        unit: selectedItemForQty.unit,
        price: selectedItemForQty.price,
        minimumLevel: selectedItemForQty.minimumLevel,
        remarks: selectedItemForQty.remarks,
        currentStock: newStock
      });
      showToast(`✅ Added ${tempQuantity} ${selectedItemForQty.unit} to ${selectedItemForQty.name}`);
      setShowQuantityModal(false);
      setSelectedItemForQty(null);
      setTempQuantity("");
      loadItems();
      if (onChanged) await onChanged();
    } catch (e) {
      showToast("Failed to update quantity", "error");
    }
  };

  const handleFormAddQuantity = () => {
    if (!formTempQuantity || isNaN(formTempQuantity)) return;
    const current = Number(formData.currentStock) || 0;
    const added = Number(formTempQuantity);
    setFormData({ ...formData, currentStock: current + added });
    setShowFormAddQtyModal(false);
    setFormTempQuantity("");
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/items");
      setItems(res.data);
    } catch {
      showToast("Failed to load items.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/admin/items/${editingId}`, formData);
        showToast("✅ Item updated successfully.");
      } else {
        await api.post("/api/admin/items", formData);
        showToast("✅ Item added successfully.");
      }
      setFormData(initialForm);
      setShowForm(false);
      setEditingId(null);
      loadItems();
      if (onChanged) await onChanged();
    } catch {
      showToast("Failed to save item.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      unit: item.unit,
      price: item.price != null ? item.price : "",
      minimumLevel: item.minimumLevel != null ? item.minimumLevel : "",
      currentStock: item.currentStock != null ? item.currentStock : "",
      remarks: item.remarks || "",
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    const isConfirmed = await confirm(`Are you sure you want to delete "${name}"?`);
    if (!isConfirmed) return;
    try {
      await api.delete(`/api/admin/items/${id}`);
      showToast(`🗑️ Item "${name}" deleted.`);
      loadItems();
      if (onChanged) await onChanged();
    } catch {
      showToast("Failed to delete item.", "error");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-GB"); // DD-MM-YYYY
  };

  const handleViewHistory = async (item) => {
    setHistoryItem(item);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await api.get('/api/admin/stock-adjustments', { params: { itemId: item.id } });
      setHistoryData(res.data.adjustments || []);
    } catch (e) {
      showToast("Failed to load history.", "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <section className="cattle-page">
      {/* Toast Notification */}
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

      {/* Main List Card */}
      {!showForm ? (
        <section style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "20px", color: "#1a2e26", margin: 0, fontWeight: "bold" }}>Items List</h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <ExportButtons tableId="items-table" filename="Inventory_Items" title="Inventory Items List" />
              {canAdd && (
                <button type="button" onClick={() => { setFormData(initialForm); setEditingId(null); setShowForm(true); }} style={{ background: "#2e6f40", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                  + Add Item
                </button>
              )}
            </div>
          </div>

          <div className="table-responsive">
            <table id="items-table" className="cattle-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Unit</th>
                  <th>Current Stock</th>
                  <th>Min Level</th>
                  <th>Price</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>No items found.</td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.id}>
                      <td data-label="Item Name" style={{ fontWeight: 600 }}>{it.name}</td>
                      <td data-label="Unit">{it.unit}</td>
                      <td data-label="Current Stock" style={{ color: it.currentStock <= it.minimumLevel ? "#ef4444" : "#22c55e", fontWeight: "bold" }}>
                        {it.currentStock} {it.unit}
                      </td>
                      <td data-label="Min Level">{it.minimumLevel} {it.unit}</td>
                      <td data-label="Price">₹{it.price}</td>
                      <td data-label="Remarks">{it.remarks || "-"}</td>
                      <td data-label="Actions">
                        <div className="row-actions" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <button className="icon-action view" title="View History" onClick={() => handleViewHistory(it)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "6px", background: "#f0f9ff", color: "#0284c7", border: "1px solid #bae6fd", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#e0f2fe"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f9ff"; }}>
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="16" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          </button>
                          {canEdit && (
                            <button className="icon-action edit" title="Edit" onClick={() => handleEdit(it)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "6px", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#dcfce7"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#f0fdf4"; }}>
                              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="16" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                          )}
                          {canDelete && (
                            <button className="icon-action delete" title="Delete" onClick={() => handleDelete(it.id, it.name)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "6px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fef2f2"; }}>
                              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="16" width="16" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="cattle-form-section" style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", paddingBottom: "15px", borderBottom: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: 0, fontSize: "18px", color: "#1e293b" }}>{editingId ? "Edit Item" : "Add New Item"}</h3>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
          </div>

          <form onSubmit={handleSave}>
            <div style={gridStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Item Name *</label>
                <input type="text" name="name" required placeholder="E.g. Wheat Bran, Medicine X" value={formData.name} onChange={handleInputChange} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Unit *</label>
                <select name="unit" required value={formData.unit} onChange={handleInputChange} style={inputStyle}>
                  {units.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={gridStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Price (₹) *</label>
                <input type="number" step="0.01" name="price" placeholder="0.00" required value={formData.price} onChange={handleInputChange} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Current Stock *</label>
                </div>
                <input type="number" step="0.01" name="currentStock" placeholder="Enter current quantity" required value={formData.currentStock} onChange={handleInputChange} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Min Level *</label>
                <input type="number" step="0.01" name="minimumLevel" placeholder="Alert threshold" required value={formData.minimumLevel} onChange={handleInputChange} style={inputStyle} />
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Remarks</label>
              <textarea name="remarks" placeholder="Any additional details..." value={formData.remarks} onChange={handleInputChange} rows="2" style={{ ...inputStyle, resize: "vertical" }}></textarea>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: "#fff", color: "#475569", border: "1px solid #cbd5e1", padding: "10px 20px", borderRadius: "10px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ background: saving ? "#86efac" : "linear-gradient(135deg, #2e6f40 0%, #1a4d2e 100%)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "10px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(46,111,64,0.2)" }}>
                {saving ? "Saving..." : (editingId ? "Update Item" : "Save Item")}
              </button>
            </div>
          </form>
        </section>
      )}

      {showAddUnitModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', color: '#1e293b' }}>Add New Unit</h3>
            <div className="form-group">
              <label style={labelStyle}>Unit Name</label>
              <input
                type="text"
                value={newUnitName}
                onChange={e => setNewUnitName(e.target.value)}
                placeholder="Enter unit (e.g., Box, Ton)"
                autoFocus
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button type="button" onClick={() => setShowAddUnitModal(false)} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={handleAddUnit} style={{ background: "#2e6f40", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Add Unit</button>
            </div>
          </div>
        </div>
      )}

      {showQuantityModal && selectedItemForQty && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', color: '#1e293b' }}>Add Quantity for {selectedItemForQty.name}</h3>
            <div className="form-group">
              <label style={labelStyle}>Quantity to Add ({selectedItemForQty.unit})</label>
              <input
                type="number"
                value={tempQuantity}
                onChange={e => setTempQuantity(e.target.value)}
                placeholder="e.g. 5"
                autoFocus
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button type="button" onClick={() => { setShowQuantityModal(false); setSelectedItemForQty(null); setTempQuantity(""); }} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={submitAddQuantity} style={{ background: "#2e6f40", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showFormAddQtyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', color: '#1e293b' }}>Add Quantity</h3>
            <div className="form-group">
              <label style={labelStyle}>Quantity to Add</label>
              <input
                type="number"
                value={formTempQuantity}
                onChange={e => setFormTempQuantity(e.target.value)}
                placeholder="e.g. 5"
                autoFocus
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button type="button" onClick={() => { setShowFormAddQtyModal(false); setFormTempQuantity(""); }} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={handleFormAddQuantity} style={{ background: "#2e6f40", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Add to Stock</button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && historyItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '700px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#1e293b" }}>Stock History: {historyItem.name}</h3>
              <button type="button" onClick={() => setShowHistoryModal(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="20" width="20" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {loadingHistory ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Loading history...</div>
              ) : historyData.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>No stock history found.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#475569" }}>Date</th>
                      <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#475569" }}>Type</th>
                      <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #e2e8f0", color: "#475569" }}>Prev Stock</th>
                      <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #e2e8f0", color: "#475569" }}>Adjustment</th>
                      <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #e2e8f0", color: "#475569" }}>New Stock</th>
                      <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#475569" }}>Reason / Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((record) => (
                      <tr key={record.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "12px" }}>{new Date(record.createdAt).toLocaleString("en-GB")}</td>
                        <td style={{ padding: "12px" }}>
                          <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", background: record.type === "Add" ? "#dcfce7" : "#fee2e2", color: record.type === "Add" ? "#16a34a" : "#dc2626" }}>
                            {record.type}
                          </span>
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>{record.previousStock}</td>
                        <td style={{ padding: "12px", textAlign: "center", fontWeight: "bold", color: record.type === "Add" ? "#16a34a" : "#dc2626" }}>
                          {record.type === "Add" ? "+" : "-"}{record.adjustment}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center", fontWeight: "bold" }}>{record.newStock}</td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ fontWeight: "600", color: "#334155" }}>{record.reason}</div>
                          {record.remarks && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{record.remarks}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" onClick={() => setShowHistoryModal(false)} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};

// ── Inline style helpers ─────────────────────────────────────────────────────

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "0 24px",
};

const fieldStyle = {
  marginBottom: "18px",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  border: "1.5px solid #e2e8f0",
  borderRadius: "10px",
  padding: "11px 14px",
  fontSize: "14px",
  color: "#1e293b",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

export default Items;
