import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../../services/api";

const CowHistory = () => {
  const location = useLocation();
  const id = location.pathname.split("/").pop();
  const navigate = useNavigate();
  const [cow, setCow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/admin/cows/${id}/history`);
        setCow(res.data);
      } catch (err) {
        setError("Failed to load history data.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB"); // DD-MM-YYYY
  };

  if (loading) return <div className="p-8 text-center text-lg font-bold text-slate-600">Loading history...</div>;
  if (error) return <div className="p-8 text-center text-lg font-bold text-red-500">{error}</div>;
  if (!cow) return <div className="p-8 text-center text-lg font-bold text-slate-600">Animal not found.</div>;

  const getStatusColor = (status) => {
    if (status === "Active") return "bg-green-100 text-green-800 border-green-200";
    if (status === "Sold") return "bg-purple-100 text-purple-800 border-purple-200";
    if (status === "Dead") return "bg-red-100 text-red-800 border-red-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  return (
    <div className="bg-slate-50 min-h-full py-6 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {cow.image ? (
                <img src={cow.image} alt={cow.name} className="w-20 h-20 rounded-full object-cover border-4 border-slate-100 shadow-sm" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-100 border-4 border-white shadow-sm flex items-center justify-center text-3xl">
                  🐄
                </div>
              )}
              {cow.image2 && (
                <img src={cow.image2} alt={`${cow.name} secondary`} className="w-20 h-20 rounded-full object-cover border-4 border-slate-100 shadow-sm" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 m-0 flex items-center gap-3">
                {cow.name || "Unknown"} ({cow.regNo || cow.tagNo})
                <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${getStatusColor(cow.status)}`}>
                  {cow.status}
                </span>
              </h2>
              <p className="text-slate-500 font-medium mt-1">Cow ID: {cow.id} &bull; Type: {cow.animalType} &bull; Breed: {cow.breed}</p>
            </div>
          </div>
          <button onClick={() => window.history.back()} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
        </div>

        {/* Unified History Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 p-6 md:p-8">
          
          {/* Basic Information */}
          <div className="mb-10">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <svg className="text-slate-500" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z"></path></svg>
              Basic Information
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <tbody>
                  <tr className="border-b border-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-600 w-1/3">Date of Birth</td>
                    <td className="py-2.5 px-3 text-slate-800">{formatDate(cow.dob)} ({cow.age} years)</td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-600">Purchase Date</td>
                    <td className="py-2.5 px-3 text-slate-800">{formatDate(cow.purchaseDate)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-600">Purchase From</td>
                    <td className="py-2.5 px-3 text-slate-800">{cow.purchaseFrom || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Reproductive Records */}
          <div className="mb-10">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span className="text-xl leading-none text-slate-500">⚥</span>
              Reproductive Records
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">AI Date</th>
                    <th className="py-2.5 px-4 font-semibold">Heat Coming</th>
                    <th className="py-2.5 px-4 font-semibold">Delivery</th>
                    <th className="py-2.5 px-4 font-semibold">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cow.reproductionRecords?.length > 0 ? cow.reproductionRecords.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 text-slate-800">{formatDate(r.aiDate)}</td>
                      <td className="py-2.5 px-4 text-slate-800">{formatDate(r.heatDate)}</td>
                      <td className="py-2.5 px-4 text-slate-800">{formatDate(r.deliveryDate)}</td>
                      <td className="py-2.5 px-4 text-slate-500">{r.remark || "-"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" className="py-6 text-center text-slate-400 italic">No reproduction records available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Milk Records */}
          <div className="mb-10">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span className="text-xl leading-none">🥛</span>
              Milk Records
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Date</th>
                    <th className="py-2.5 px-4 font-semibold">Morning (L)</th>
                    <th className="py-2.5 px-4 font-semibold">Evening (L)</th>
                    <th className="py-2.5 px-4 font-semibold">Total (L)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cow.milk?.length > 0 ? cow.milk.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 text-slate-800">{formatDate(m.recordDate)}</td>
                      <td className="py-2.5 px-4 text-slate-800 font-medium">
                        {m.morningMilk != null ? `${m.morningMilk} L` : <span className="text-slate-400 italic">Not entered</span>}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 font-medium">
                        {m.eveningMilk != null ? `${m.eveningMilk} L` : <span className="text-slate-400 italic">Not entered</span>}
                      </td>
                      <td className="py-2.5 px-4 font-black text-slate-800">{m.totalMilk} L</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" className="py-6 text-center text-slate-400 italic">No milk records available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Food Intake Records */}
          <div className="mb-10">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span className="text-xl leading-none">🌾</span>
              Food Intake Records
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Date</th>
                    <th className="py-2.5 px-4 font-semibold">Food Item</th>
                    <th className="py-2.5 px-4 font-semibold">Type</th>
                    <th className="py-2.5 px-4 font-semibold">Total Intake</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cow.foodIntakes?.length > 0 ? cow.foodIntakes.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 text-slate-800">{formatDate(f.recordedAt)}</td>
                      <td className="py-2.5 px-4 text-slate-800 font-medium">{f.foodItem || "-"}</td>
                      <td className="py-2.5 px-4 text-slate-800">{f.foodType}</td>
                      <td className="py-2.5 px-4 text-slate-800 font-bold">{f.totalIntake} kg</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" className="py-6 text-center text-slate-400 italic">No food intake records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Treatment Records */}
          <div className="mb-10">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span className="text-xl leading-none">⚕️</span>
              Treatment Records
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Date</th>
                    <th className="py-2.5 px-4 font-semibold">Diagnosis</th>
                    <th className="py-2.5 px-4 font-semibold">Medicine</th>
                    <th className="py-2.5 px-4 font-semibold">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cow.treatments?.length > 0 ? cow.treatments.map((t, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 text-slate-800">{formatDate(t.treatedAt)}</td>
                      <td className="py-2.5 px-4 text-slate-800 font-medium">{t.diagnosis}</td>
                      <td className="py-2.5 px-4 text-slate-800">{t.medicine}</td>
                      <td className="py-2.5 px-4 text-slate-800 font-bold">₹{t.cost}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" className="py-6 text-center text-slate-400 italic">No treatment records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sale/Sold Records */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span className="text-xl leading-none">💰</span>
              Sale Records
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Sale Date</th>
                    <th className="py-2.5 px-4 font-semibold">Buyer</th>
                    <th className="py-2.5 px-4 font-semibold">Amount</th>
                    <th className="py-2.5 px-4 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cow.sales?.length > 0 ? cow.sales.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 text-slate-800">{formatDate(s.soldAt)}</td>
                      <td className="py-2.5 px-4 text-slate-800 font-medium">{s.buyer}</td>
                      <td className="py-2.5 px-4 text-slate-800 font-bold">₹{s.amount}</td>
                      <td className="py-2.5 px-4 text-slate-500">{s.reason} {s.otherReason ? `(${s.otherReason})` : ''}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" className="py-6 text-center text-slate-400 italic">No sale records available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CowHistory;
