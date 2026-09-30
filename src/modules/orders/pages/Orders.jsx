import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import { useConfirm } from "../../../context/ConfirmContext";
import { hasPermission } from "../../../utils/permissions";
import ExportButtons from "../../../components/ExportButtons";

const PAYMENT_STATUS = ["Pending", "Paid", "Partial"];
const UNITS = ["Kg", "Litre", "Piece", "Bag", "Bundle"];

const emptyItem = () => ({ itemName: "", quantity: "", unit: "Kg", price: "" });

const emptyForm = {
  vendorName: "",
  location: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  paymentStatus: "Pending",
  remarks: "",
  items: [emptyItem()],
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "form" | "detail"
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ text: "", type: "" });
  const { confirm } = useConfirm();

  const adminData = JSON.parse(localStorage.getItem("adminData") || "{}");
  const canAdd = hasPermission(adminData, "orders", "add");
  const canEdit = hasPermission(adminData, "orders", "edit");
  const canDelete = hasPermission(adminData, "orders", "delete");

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, itemsRes] = await Promise.all([
        api.get("/api/admin/orders"),
        api.get("/api/admin/items")
      ]);
      setOrders(ordersRes.data);
      setInventoryItems(itemsRes.data);
    } catch {
      showToast("Failed to load data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await api.get("/api/admin/orders");
      setOrders(res.data);
    } catch {
      showToast("Failed to load orders.", "error");
    }
  };

  useEffect(() => { loadData(); }, []);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "-";
  const formatCurrency = (n) => `₹${Number(n || 0).toFixed(2)}`;

  const statusBadge = (status) => {
    const colors = {
      Paid: { bg: "#dcfce7", color: "#15803d" },
      Pending: { bg: "#fef9c3", color: "#a16207" },
      Partial: { bg: "#dbeafe", color: "#1d4ed8" },
    };
    const c = colors[status] || colors.Pending;
    return (
      <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "700" }}>
        {status}
      </span>
    );
  };

  // ─── Form helpers ──────────────────────────────────────────────────────────

  const handleFormChange = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleItemChange = (idx, field, value) =>
    setForm(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === "itemName") {
        const matchedItem = inventoryItems.find(i => i.name === value);
        if (matchedItem) {
          items[idx].unit = matchedItem.unit || items[idx].unit;
          items[idx].price = matchedItem.price ? String(matchedItem.price) : items[idx].price;
        }
      }
      return { ...prev, items };
    });

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, emptyItem()] }));

  const removeItem = (idx) =>
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const orderTotal = form.items.reduce(
    (sum, it) => sum + (parseFloat(it.quantity) || 0) * (parseFloat(it.price) || 0), 0
  );

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setView("form");
  };

  const openEdit = (order) => {
    setForm({
      vendorName: order.vendorName,
      location: order.location || "",
      purchaseDate: order.purchaseDate?.split("T")[0] || new Date().toISOString().split("T")[0],
      paymentStatus: order.paymentStatus,
      remarks: order.remarks || "",
      items: order.items.length > 0
        ? order.items.map(it => ({ itemName: it.itemName, quantity: String(it.quantity), unit: it.unit, price: String(it.price) }))
        : [emptyItem()],
    });
    setEditingId(order.id);
    setView("form");
  };

  const openDetail = (order) => {
    setSelectedOrder(order);
    setView("detail");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const validItems = form.items.filter(it => it.itemName.trim());
    if (!form.vendorName.trim() || validItems.length === 0) {
      showToast("Vendor name and at least one item are required.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, items: validItems };
      if (editingId) {
        await api.put(`/api/admin/orders/${editingId}`, payload);
        showToast("✅ Order updated successfully.");
      } else {
        await api.post("/api/admin/orders", payload);
        showToast("✅ Order created successfully.");
      }
      await loadOrders();
      setView("list");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to save order.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm("Are you sure you want to delete this order?");
    if (!isConfirmed) return;
    try {
      await api.delete(`/api/admin/orders/${id}`);
      showToast("🗑️ Order deleted.");
      loadOrders();
    } catch {
      showToast("Failed to delete order.", "error");
    }
  };

  // ─── Render: Detail Modal ─────────────────────────────────────────────────

  if (view === "detail" && selectedOrder) {
    const o = selectedOrder;
    const total = o.items.reduce((s, it) => s + it.quantity * it.price, 0);
    return (
      <section className="cattle-page">
        {/* Header */}
        <section className="cattle-toolbar">
          <div>
            <h3 style={{ margin: 0 }}>Order Detail</h3>
            <span style={{ fontSize: "13px", color: "#64748b" }}>{o.orderNumber}</span>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setView("list")} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
          </div>
        </section>

        <section className="cattle-list-section" style={{ padding: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div>
              <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#64748b" }}>Vendor Info</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{o.vendorName}</p>
              <p style={{ margin: "4px 0 0", fontSize: "14px" }}>{o.location || "No Location"}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#64748b" }}>Order Details</p>
              <p style={{ margin: 0, fontWeight: 600 }}>Payment: <span style={{ color: o.paymentStatus === "Paid" ? "#16a34a" : "#ca8a04" }}>{o.paymentStatus}</span></p>
              <p style={{ margin: "4px 0 0", fontSize: "14px" }}>Date: {new Date(o.orderDate || o.purchaseDate).toLocaleDateString()}</p>
            </div>
          </div>

          <h4 style={{ margin: "20px 0 10px", paddingBottom: "10px", borderBottom: "1px solid #e2e8f0" }}>Items</h4>
          <div className="table-responsive">
            <table className="cattle-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((it, idx) => (
                  <tr key={idx}>
                    <td data-label="Item">{it.item?.name || "Unknown"}</td>
                    <td data-label="Price">₹{Number(it.price).toFixed(2)}</td>
                    <td data-label="Quantity">{it.quantity}</td>
                    <td data-label="Subtotal">₹{(it.quantity * it.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" style={{ textAlign: "right", fontWeight: 700 }}>Total</td>
                  <td style={{ fontWeight: 700 }}>₹{total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </section>
    );
  }

  // ─── Render: Form (Create/Edit) ───────────────────────────────────────────
  if (view === "form") {
    const currentTotal = form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
    return (
      <div className="cattle-page">
        <form onSubmit={handleSave} className="cattle-form-page">
          <div className="cattle-form-title">
            <div>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                🛒 {editingId ? "Edit Order" : "New Order"}
              </h3>
              <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "normal", marginTop: "4px", display: "block" }}>Fill in the details</span>
            </div>
            <button type="button" onClick={() => setView("list")} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
          </div>

          <section className="cattle-form-section">
            <h4>Order Information</h4>
            <div className="cattle-form-grid">
              <label>
                Vendor Name *
                <input type="text" required value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} placeholder="Vendor Name" />
              </label>
              <label>
                Location
                <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" />
              </label>
              <label>
                Purchase Date
                <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
              </label>
              <label>
                Payment Status
                <select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                </select>
              </label>
            </div>
          </section>

          <section className="cattle-form-section">
            <h4>Remarks</h4>
            <div className="cattle-form-grid" style={{ gridTemplateColumns: "1fr" }}>
              <label>
                Order Remarks
                <input type="text" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Optional remarks" />
              </label>
            </div>
          </section>

          <section className="cattle-form-section">
            <div className="section-action-title">
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>Order Items</div>
              <button type="button" onClick={addItem} style={{ background: "#fff", color: "#0f172a", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>
                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="12" width="12" xmlns="http://www.w3.org/2000/svg"><path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z"></path></svg>
                Add Item
              </button>
            </div>
            <div style={{ padding: "20px" }}>
              {form.items.map((it, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "3fr 2fr 2fr 100px 42px", gap: "15px", alignItems: "end", marginBottom: "15px", background: "#f8fafc", padding: "15px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                    Item *
                    <select required value={it.itemName} onChange={(e) => handleItemChange(idx, "itemName", e.target.value)} style={{ height: "42px", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "0 10px", background: "#fff", outline: "none", color: "#0f172a", fontSize: "14px" }}>
                      <option value="">-- Select --</option>
                      {inventoryItems.map((ai) => (
                        <option key={ai.id} value={ai.name}>
                          {ai.name} (Stock: {ai.currentStock}) - ₹{ai.price}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                    Price (₹) *
                    <input type="number" step="0.01" required value={it.price} onChange={(e) => handleItemChange(idx, "price", e.target.value)} style={{ height: "42px", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "0 10px", outline: "none", color: "#0f172a", fontSize: "14px" }} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                    Quantity *
                    <input type="number" min="1" step="0.01" required value={it.quantity} onChange={(e) => handleItemChange(idx, "quantity", e.target.value)} style={{ height: "42px", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "0 10px", outline: "none", color: "#0f172a", fontSize: "14px" }} />
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>Subtotal</span>
                    <div style={{ height: "42px", display: "flex", alignItems: "center", fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                      ₹{((Number(it.quantity) || 0) * (Number(it.price) || 0)).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ height: "42px", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => removeItem(idx)} style={{ display: "flex", alignItems: "center", justifyItems: "center", background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", height: "42px", width: "42px", padding: "0", justifyContent: "center", borderRadius: "8px", cursor: "pointer", fontWeight: 600, transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#fee2e2"} onMouseLeave={(e) => e.currentTarget.style.background = "#fef2f2"}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: "20px", paddingTop: "20px", borderTop: "1px dashed #cbd5e1" }}>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", background: "#f8fafc", padding: "10px 20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  Total: ₹{currentTotal.toFixed(2)}
                </div>
              </div>
            </div>
          </section>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "10px" }}>
            <button type="button" onClick={() => setView("list")} style={{ background: "#fff", color: "#475569", border: "1px solid #cbd5e1", padding: "12px 24px", borderRadius: "8px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ background: "#16a34a", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "8px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", transition: "all 0.2s" }} onMouseEnter={(e) => !saving && (e.currentTarget.style.background = "#15803d")} onMouseLeave={(e) => !saving && (e.currentTarget.style.background = "#16a34a")}>
              {saving ? "Saving..." : (editingId ? "Update Order" : "Create Order")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ─── Render: List ─────────────────────────────────────────────────────────
  return (
    <section className="cattle-page">
      <section className="cattle-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>Orders</h2>
          <span style={{ fontSize: "14px", color: "#64748b" }}>Manage customer orders</span>
        </div>
        <div className="cattle-toolbar-actions">
          <ExportButtons tableId="orders-table" filename="Orders" title="Customer Orders" />
          {canAdd && (
            <button className="primary" onClick={() => openCreate()}>
              + New Order
            </button>
          )}
        </div>
      </section>

      <section className="cattle-list-section">
        <div className="table-responsive">
          <table id="orders-table" className="cattle-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Vendor</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const total = o.items.reduce((s, it) => s + it.quantity * it.price, 0);
                return (
                  <tr key={o.id}>
                    <td data-label="Order #">{o.orderNumber}</td>
                    <td data-label="Date">{new Date(o.purchaseDate || o.orderDate).toLocaleDateString()}</td>
                    <td data-label="Vendor">{o.vendorName}</td>
                    <td data-label="Payment">
                      <span className={`status-badge ${(o.paymentStatus || 'pending').toLowerCase()}`}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td data-label="Total" style={{ fontWeight: 600 }}>₹{total.toFixed(2)}</td>
                    <td data-label="Actions">
                      <div className="row-actions">
                        <button className="icon-action view" title="View Detail" onClick={() => { setSelectedOrder(o); setView("detail"); }} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>
                        {canEdit && (
                          <button className="icon-action edit" title="Edit" onClick={() => openEdit(o)} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                        )}
                        {canDelete && (
                          <button className="icon-action delete" title="Delete" onClick={() => handleDelete(o.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};

export default Orders;
