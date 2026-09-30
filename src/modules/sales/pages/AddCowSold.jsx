import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useConfirm } from "../../../context/ConfirmContext";

const AddCowSold = ({ onChanged }) => {
  const navigate = useNavigate();
  const [cows, setCows] = useState([]);
  const [selectedCow, setSelectedCow] = useState(null);
  const [animalTypeFilter, setAnimalTypeFilter] = useState("Cow");
  const { confirm } = useConfirm();

  const [form, setForm] = useState({
    cowId: "",
    saleDate: new Date().toISOString().slice(0, 10),
    salePrice: "",
    buyerName: "",
    buyerPhone: "",
    buyerAddress: "",
    reason: "",
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadCows = async () => {
      try {
        const res = await api.get("/api/admin/cows");
        setCows(res.data.filter((c) => c.status === "Active"));
      } catch (e) {
        console.error("Failed to load cows", e);
      }
    };
    loadCows();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "animalTypeFilter") {
      setAnimalTypeFilter(value);
      setForm((prev) => ({ ...prev, cowId: "" })); // Reset selected cow
      setSelectedCow(null);
      return;
    }

    if (name === "cowId") {
      const cow = cows.find(c => c.id === parseInt(value));
      setSelectedCow(cow || null);
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const animalTypes = ["Cow", "Buffalo", "Calf"];
  const filteredCows = cows.filter(c => (c.animalType || "Cow") === animalTypeFilter);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cowId) return setMessage("Please select an animal.");
    if (!form.buyerName) return setMessage("Buyer name is required.");
    if (parseFloat(form.salePrice) <= 0) return setMessage("Sale price must be > 0.");

    const isConfirmed = await confirm(`Are you sure you want to sell ${selectedCow?.name}?`);
    if (!isConfirmed) {
      return;
    }

    try {
      const payload = {
        ...form,
        paymentMethod: "Cash",
        paymentStatus: "Paid",
        amountReceived: form.salePrice
      };

      await api.post(`/api/admin/cows/${form.cowId}/sell`, payload);
      if (onChanged) await onChanged();
      navigate("/admin/cow-sold");
    } catch (err) {
      setMessage(err.response?.data?.message || "Error logging cow sale.");
    }
  };

  return (
    <div className="cattle-page">
      <form onSubmit={handleSubmit} className="cattle-form-page">
        <div className="cattle-form-title">
          <h3>🛒 Sell Cow</h3>
          <button type="button" onClick={() => window.history.back()} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
</button>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded bg-status-error/10 text-status-error border border-status-error/20 font-semibold text-sm">
            {message}
          </div>
        )}

        <section className="cattle-form-section">
          <h4>Animal Details</h4>
          <div className="cattle-form-grid">
            <label>
              Animal Type
              <select
                name="animalTypeFilter"
                value={animalTypeFilter}
                onChange={handleChange}
              >
                {animalTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label>
              Animal Name *
              <select name="cowId" value={form.cowId} onChange={handleChange} required>
                <option value="">-- Select Animal --</option>
                {filteredCows.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Animal ID / Registration No.
              <input
                type="text"
                value={selectedCow?.tagNo || selectedCow?.regNo || ""}
                disabled
                placeholder="e.g. REG001"
              />
            </label>
          </div>
        </section>

        <section className="cattle-form-section">
          <h4>Sale Details</h4>
          <div className="cattle-form-grid">
            <label>
              Sold Date *
              <input
                type="date"
                name="saleDate"
                value={form.saleDate}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Sold Price (₹) *
              <input
                type="number"
                step="0.01"
                min="0"
                name="salePrice"
                placeholder="0"
                value={form.salePrice}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Buyer Name *
              <input
                type="text"
                name="buyerName"
                value={form.buyerName}
                onChange={handleChange}
                placeholder="Enter buyer name"
                required
              />
            </label>
            <label>
              Buyer Phone No.
              <input
                type="text"
                name="buyerPhone"
                value={form.buyerPhone}
                onChange={(e) => {
                  const onlyNums = e.target.value.replace(/\D/g, '');
                  if (onlyNums.length <= 10) {
                    handleChange({ target: { name: "buyerPhone", value: onlyNums } });
                  }
                }}
                placeholder="e.g. 9876543210"
              />
            </label>
            <label className="col-span-2">
              Buyer Address
              <input
                type="text"
                name="buyerAddress"
                value={form.buyerAddress}
                onChange={handleChange}
                placeholder="Enter complete address"
              />
            </label>
            <label className="col-span-2">
              Reason for Sale (Optional)
              <input
                type="text"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder="Why is this animal being sold?"
              />
            </label>
          </div>
        </section>

        <button type="submit" className="cattle-save">
          Confirm Sale
        </button>
        <div style={{ clear: "both" }}></div>
      </form>
    </div>
  );
};

export default AddCowSold;
