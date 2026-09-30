import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

const AddFeedPlan = ({ onChanged }) => {
  const navigate = useNavigate();
  const [cows, setCows] = useState([]);
  
  const [form, setForm] = useState({
    cowId: "",
    planName: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10),
    feedName: "",
    feedType: "Green Fodder",
    quantity: "",
    unit: "kg",
    feedingTime: "Morning",
    frequency: "Once daily",
    instructions: "",
    remarks: "",
    status: "Active",
    prevDayMilkProd: "",
    recommendedFeedQty: ""
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
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cowId) {
      setMessage("Please select an animal.");
      return;
    }
    if (!form.planName || !form.feedName || !form.quantity) {
      setMessage("Please fill out all required fields.");
      return;
    }

    try {
      await api.post("/api/admin/feeding-plans", form);
      if (onChanged) await onChanged();
      navigate("/admin/feed-plan");
    } catch (err) {
      setMessage(err.response?.data?.message || "Error adding feed plan. Please try again.");
    }
  };

  const renderSectionHeader = (title) => (
    <div className="border-b border-slate-200 pb-1.5 mb-3 mt-6 first:mt-0">
      <h3 className="text-base font-bold text-slate-800 m-0">{title}</h3>
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-full">
      <div className="w-full max-w-5xl mx-auto">
        <div className="bg-white border-y sm:border sm:rounded-md border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🐄</span>
              <h2 className="text-lg font-bold text-white m-0">Animal Feeding Plan Form</h2>
            </div>
            <button
              onClick={() => navigate("/admin/feed-plan")}
              className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-5">
            
            {/* Basic Section */}
            {renderSectionHeader("Basic Details")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Animal *</label>
                <select name="cowId" className="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 bg-white" value={form.cowId} onChange={handleChange} required>
                  <option value="">-- Select Animal --</option>
                  {cows.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.regNo || c.tagNo})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Feed Plan Name *</label>
                <input type="text" name="planName" placeholder="e.g., Winter Diet Plan" className="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 bg-white" value={form.planName} onChange={handleChange} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Start Date *</label>
                <input type="date" name="startDate" className="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 bg-white" value={form.startDate} onChange={handleChange} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">End Date *</label>
                <input type="date" name="endDate" className="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 bg-white" value={form.endDate} min={form.startDate} onChange={handleChange} required />
              </div>
            </div>

            {/* Feeding Details Section */}
            {renderSectionHeader("Feeding Details")}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Feed Name *</label>
                <input type="text" name="feedName" placeholder="e.g., Alfalfa Hay" className="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 bg-white" value={form.feedName} onChange={handleChange} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Feed Type *</label>
                <select name="feedType" className="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 bg-white" value={form.feedType} onChange={handleChange} required>
                  <option value="Green Fodder">Green Fodder</option>
                  <option value="Dry Fodder">Dry Fodder</option>
                  <option value="Concentrate">Concentrate</option>
                  <option value="Mineral">Mineral</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Quantity *</label>
                <input type="number" step="0.01" name="quantity" placeholder="Quantity" className="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 bg-white" value={form.quantity} onChange={handleChange} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Unit *</label>
                <select name="unit" className="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 bg-white" value={form.unit} onChange={handleChange} required>
                  <option value="kg">kg</option>
                  <option value="gram">gram</option>
                  <option value="litre">litre</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Feeding Time *</label>
                <select name="feedingTime" className="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 bg-white" value={form.feedingTime} onChange={handleChange} required>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Frequency *</label>
                <select name="frequency" className="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 bg-white" value={form.frequency} onChange={handleChange} required>
                  <option value="Once daily">Once daily</option>
                  <option value="Twice daily">Twice daily</option>
                  <option value="Thrice daily">Thrice daily</option>
                </select>
              </div>
            </div>

            {/* Additional Section */}
            {renderSectionHeader("Additional Information")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[13px] font-semibold text-slate-700">Special Feeding Instructions</label>
                <textarea name="instructions" rows="2" placeholder="Any specific mixing or preparation instructions..." className="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 bg-white" value={form.instructions} onChange={handleChange}></textarea>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Remarks</label>
                <input type="text" name="remarks" placeholder="Optional remarks" className="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 bg-white" value={form.remarks} onChange={handleChange} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Status *</label>
                <select name="status" className="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 bg-white" value={form.status} onChange={handleChange} required>
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Completed">Completed</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Previous Day Milk Prod (L)</label>
                <input type="number" step="0.01" name="prevDayMilkProd" placeholder="e.g., 12.5" className="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 bg-white" value={form.prevDayMilkProd} onChange={handleChange} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Recommended Feed Qty (Kg)</label>
                <input type="number" step="0.01" name="recommendedFeedQty" placeholder="e.g., 6" className="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 bg-white" value={form.recommendedFeedQty} onChange={handleChange} />
              </div>
            </div>

            {message && (
              <div className="mb-4 p-3 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-sm">
                {message}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
              <button
                type="button"
                onClick={() => navigate("/admin/feed-plan")}
                className="px-5 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors shadow-sm"
              >
                Save Feeding Plan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddFeedPlan;
