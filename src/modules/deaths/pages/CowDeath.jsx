import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../../css/cowdeath.css";
import api from "../../../services/api";
import { useConfirm } from "../../../context/ConfirmContext";
import { hasPermission } from "../../../utils/permissions";
import ExportButtons from "../../../components/ExportButtons";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

const CowDeath = ({ onChanged }) => {
  const [view, setView] = useState("list"); // list, record
  const [deaths, setDeaths] = useState([]);
  const [cows, setCows] = useState([]);
  const [selectedCowId, setSelectedCowId] = useState("");
  const [animalFilter, setAnimalFilter] = useState("All Animals");
  const [selectedHistoryDeath, setSelectedHistoryDeath] = useState(null);
  
  const [form, setForm] = useState({
    deathAt: new Date().toISOString().slice(0, 10),
    reason: "",
    notes: "",
    disposalMethod: "",
    disposalDate: "",
    disposalCost: ""
  });
  
  const [message, setMessage] = useState("");
  const { confirm, customAlert } = useConfirm();
  
  const [disposalMethods, setDisposalMethods] = useState(() => {
    const saved = localStorage.getItem("disposalMethods");
    return saved ? JSON.parse(saved) : ["Buried", "Burned", "Municipal"];
  });
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [newMethodName, setNewMethodName] = useState("");

  const adminData = JSON.parse(localStorage.getItem("adminData") || "{}");
  const canAdd = hasPermission(adminData, "deaths", "add");
  const canDelete = hasPermission(adminData, "deaths", "delete");

  const loadDeaths = async () => {
    try {
      const res = await api.get("/admin/deaths");
      setDeaths(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCows = async () => {
    try {
      const res = await api.get("/admin/cows");
      setCows(res.data.filter(c => c.status === "Active"));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDeaths();
    loadCows();
  }, []);

  const handleAddMethod = () => {
    if (!newMethodName.trim()) return;
    const updated = [...disposalMethods, newMethodName.trim()];
    setDisposalMethods(updated);
    localStorage.setItem("disposalMethods", JSON.stringify(updated));
    setForm({ ...form, disposalMethod: newMethodName.trim() });
    setShowAddMethodModal(false);
    setNewMethodName("");
  };

  const handleStartRecord = () => {
    loadCows();
    setSelectedCowId("");
    setForm({
      deathAt: new Date().toISOString().slice(0, 10),
      reason: "",
      notes: "",
      disposalMethod: "",
      disposalDate: "",
      disposalCost: ""
    });
    setMessage("");
    setView("record");
  };

  const handleAnimalSelect = async (e) => {
    const cowId = e.target.value;
    const previousId = selectedCowId; // Capture before async
    if (!cowId) {
       setSelectedCowId("");
       return;
    }
    
    const cow = cows.find(c => String(c.id) === String(cowId));
    if (cow) {
      const isConfirmed = await confirm(`Are you sure you want to record death for "${cow.name || cow.regNo || cow.tagNo}"?`);
      if (isConfirmed) {
        setSelectedCowId(cowId);
      } else {
        setSelectedCowId(previousId); // revert state
      }
    }
  };

  const selectedCow = cows.find(c => String(c.id) === String(selectedCowId));

  const handleRecordDeath = async (e) => {
    e.preventDefault();
    setMessage("");
    
    if (!selectedCowId) {
      setMessage("Please select an animal first.");
      return;
    }

    const cow = cows.find(c => c.id === Number(selectedCowId));
    if (!cow) {
      setMessage("Invalid animal selected.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (form.deathAt > today) {
      setMessage("Death date cannot be in the future.");
      return;
    }

    if (cow.dob && form.deathAt < cow.dob.slice(0, 10)) {
      setMessage("Death date cannot be before the animal's Date of Birth.");
      return;
    }

    if (cow.purchaseDate && form.deathAt < cow.purchaseDate.slice(0, 10)) {
      setMessage("Death date cannot be before the animal's Purchase Date.");
      return;
    }

    if (form.disposalDate && form.disposalDate < form.deathAt) {
      setMessage("Disposal date cannot be before the death date.");
      return;
    }

    if (form.disposalCost && Number(form.disposalCost) < 0) {
      setMessage("Disposal cost cannot be negative.");
      return;
    }

    const isConfirmed = await confirm("Are you sure you want to confirm this death record? Once confirmed, this animal will be marked as 'Dead' and removed from active management.");
    if (!isConfirmed) {
      return;
    }

    try {
      await api.post("/admin/deaths", {
        cowId: selectedCowId,
        reason: form.reason,
        deathAt: form.deathAt,
        notes: form.notes,
        disposalMethod: form.disposalMethod,
        disposalDate: form.disposalDate,
        disposalCost: form.disposalCost
      });
      
      const cow = cows.find(c => c.id === Number(selectedCowId));
      if (cow) {
        await api.put(`/admin/cows/${cow.id}`, {
          ...cow,
          status: "Dead"
        });
      }

      await loadDeaths();
      await loadCows();
      if (onChanged) await onChanged();
      
      setView("list");
    } catch (e) {
      setMessage("Failed to record death");
    }
  };

  const handleDeleteDeath = async (d) => {
    const isConfirmed = await confirm("Are you sure you want to delete this death record?");
    if(!isConfirmed) return;
    try {
      await api.delete(`/admin/deaths/${d.id}`);
      await loadDeaths();
      await fetchCows();
      showToast("Death record deleted successfully");
    } catch(e) {
      console.error(e);
      setMessage("Failed to delete death record");
    }
  };

  const animalTypes = ["Cow", "Buffalo", "Calf"];
  const filteredDeaths = animalFilter === "All Animals" ? deaths : deaths.filter(d => (d.cow?.animalType || "Cow") === animalFilter);

  return (
    <div className="cattle-page">
      {view === "list" && (
        <>
          <div className="cattle-toolbar">
            <div>
              <h3>Mortality Records</h3>
            </div>
            
            <div className="cattle-toolbar-actions">
               <select value={animalFilter} onChange={e => setAnimalFilter(e.target.value)}>
                  <option value="All Animals">All Animals</option>
                  {animalTypes.map(type => (
                     <option key={type} value={type}>{type}</option>
                  ))}
               </select>
               <button className="soft" onClick={() => setAnimalFilter("All Animals")}>
                  Reset
               </button>
               <ExportButtons tableId="mortality-records-table" filename="Mortality_Records" title="Mortality Records" />
               {canAdd && (
                 <button className="primary" onClick={handleStartRecord}>
                   + Record New Death
                 </button>
               )}
            </div>
          </div>

          <div className="cattle-table-card">
             <div className="table-wrap">
               <table id="mortality-records-table">
                 <thead>
                   <tr>
                     <th>#</th>
                     <th>Animal</th>
                     <th>Type</th>
                     <th>Death Date</th>
                     <th>Reason</th>
                     <th>Disposal</th>
                     <th>Actions</th>
                   </tr>
                 </thead>
                  <tbody>
                    {filteredDeaths.map((d, index) => (
                      <tr key={d.id}>
                        <td data-label="#">{index + 1}</td>
                        <td data-label="Animal">
                          <strong>{d.cow?.name}</strong>
                         <div className="subtext">Reg: {d.cow?.regNo || d.cow?.tagNo}</div>
                       </td>
                       <td data-label="Type">
                         <span className="type-badge">{d.cow?.animalType || "Cow"}</span>
                       </td>
                       <td data-label="Death Date">{formatDate(d.deathAt)}</td>
                       <td data-label="Reason">{d.reason || "-"}</td>
                       <td data-label="Disposal">
                          {d.disposalMethod ? (
                            <>
                              <span className="font-semibold text-slate-700">{d.disposalMethod}</span>
                              <div className="subtext">{formatDate(d.disposalDate)}</div>
                            </>
                          ) : "-"}
                       </td>
                       <td data-label="Actions">
                         <div className="row-actions">
                            <button className="icon-action view" title="View History" onClick={() => {
                               setSelectedHistoryDeath(d);
                               setView("history");
                            }}>
                               <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>
                            </button>
                            {canDelete && (
                              <button className="icon-action delete" title="Delete" onClick={() => handleDeleteDeath(d)}>
                                 <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                              </button>
                            )}
                         </div>
                       </td>
                     </tr>
                    ))}
                    {filteredDeaths.length === 0 && (
                      <tr>
                        <td colSpan="7" className="empty-state">No death records found.</td>
                      </tr>
                    )}
                  </tbody>
               </table>
             </div>
          </div>
        </>
      )}

      {view === "record" && (
        <div className="record-death-panel">
          <div className="panel-header red">
             <h2>Record Death</h2>
          </div>
          
          <form onSubmit={handleRecordDeath}>
             <div className="panel-body">
               
               {!selectedCowId ? (
                 <div className="form-group">
                    <label>Select Animal *</label>
                    <select 
                      value={selectedCowId} 
                      onChange={handleAnimalSelect} 
                      required
                    >
                      <option value="">-- Search or Select Active Animal --</option>
                      {cows.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.regNo || c.tagNo} - {c.name} ({c.animalType})
                        </option>
                      ))}
                    </select>
                 </div>
               ) : (
                 <div className="selected-animal-summary" style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
                   <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#1e293b' }}>{selectedCow?.name || selectedCow?.regNo || selectedCow?.tagNo}</h3>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px', color: '#475569' }}>
                     <div><strong>Registration:</strong> {selectedCow?.regNo || selectedCow?.tagNo}</div>
                     <div><strong>DOB:</strong> {formatDate(selectedCow?.dob)}</div>
                     <div><strong>Type:</strong> {selectedCow?.animalType}</div>
                     <div><strong>Purchase Date:</strong> {formatDate(selectedCow?.purchaseDate)}</div>
                   </div>
                 </div>
               )}

               {selectedCowId && (
                 <>
                   <div className="form-row-2">
                      <div className="form-group">
                        <label>Death Date *</label>
                        <input 
                          type="date" 
                          value={form.deathAt} 
                          onChange={e => {
                            const newDeathDate = e.target.value;
                            let maxDispDate = "";
                            if (newDeathDate) {
                               const d = new Date(newDeathDate);
                               d.setDate(d.getDate() + 2);
                               maxDispDate = d.toISOString().slice(0, 10);
                            }

                            setForm(prev => {
                              let newDisposalDate = prev.disposalDate;
                              if (prev.disposalDate) {
                                  if (newDeathDate > prev.disposalDate || prev.disposalDate > maxDispDate) {
                                      newDisposalDate = "";
                                  }
                              }
                              return {
                                ...prev, 
                                deathAt: newDeathDate,
                                disposalDate: newDisposalDate
                              };
                            });
                          }} 
                          required 
                        />
                      </div>
                      <div className="form-group">
                        <label>Death Reason *</label>
                        <input type="text" placeholder="Enter death reason (e.g., illness, accident, old age)" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} required />
                      </div>
                   </div>
                   
                   <div className="form-group">
                     <label>Additional Notes</label>
                     <textarea rows="2" placeholder="Additional notes about the death..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}></textarea>
                   </div>
                 </>
               )}

               {selectedCowId && (
                 <div className="disposal-box">
                   <h4>Disposal Information (Optional)</h4>
                   <div className="form-row-2">
                      <div className="form-group">
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ marginBottom: 0 }}>Method</label>
                            <button type="button" onClick={() => setShowAddMethodModal(true)} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", padding: 0 }}>
                              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="12" width="12" xmlns="http://www.w3.org/2000/svg"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                              Add Method
                            </button>
                         </div>
                         <select value={form.disposalMethod} onChange={e => setForm({...form, disposalMethod: e.target.value})}>
                           <option value="">-- Select --</option>
                           {disposalMethods.map(m => (
                             <option key={m} value={m}>{m}</option>
                           ))}
                         </select>
                      </div>
                      <div className="form-group">
                         <label>Date</label>
                         <input 
                           type="date" 
                           value={form.disposalDate} 
                           min={form.deathAt}
                           onChange={e => setForm({...form, disposalDate: e.target.value})} 
                         />
                      </div>
                   </div>
                   <div className="form-group half" style={{marginTop: '10px'}}>
                      <label>Cost</label>
                      <input type="number" step="0.01" value={form.disposalCost} onChange={e => setForm({...form, disposalCost: e.target.value})} />
                   </div>
                 </div>
               )}
            </div>
            
            {selectedCowId && (
               <div className="panel-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '20px' }}>
                  <button type="button"   onClick={() => window.history.back()} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
</button>
                  <button type="submit" className="btn-danger" style={{ background: '#e11d48', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>☠</span> Record Death
                  </button>
               </div>
            )}
            {message && <div className="form-message" style={{ margin: '0 20px 20px', color: '#e11d48' }}>{message}</div>}
          </form>
        </div>
      )}

      {view === "history" && selectedHistoryDeath && (
        <div className="history-layout">
          <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2.5 rounded-lg text-slate-700">
                   <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>
                </div>
                <div>
                   <h2 className="text-xl font-bold text-slate-900 m-0 leading-tight">Animal History</h2>
                   <p className="text-sm text-slate-500 m-0 font-medium">Detailed records for {selectedHistoryDeath.cow?.name}</p>
                </div>
             </div>
             <button onClick={() => window.history.back()} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
</button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-5">
               <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="20" width="20" className="text-blue-500" xmlns="http://www.w3.org/2000/svg"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <h3 className="text-[16px] font-bold text-slate-800 m-0">Animal Details</h3>
               </div>
               <div className="grid grid-cols-2 gap-4 text-[14px]">
                  <div>
                     <span className="block text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">Registration</span>
                     <span className="font-bold text-slate-800">{selectedHistoryDeath.cow?.regNo || selectedHistoryDeath.cow?.tagNo || "-"}</span>
                  </div>
                  <div>
                     <span className="block text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">Animal Type</span>
                     <span className="type-badge">{selectedHistoryDeath.cow?.animalType || "Cow"}</span>
                  </div>
                  <div>
                     <span className="block text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">Date of Birth</span>
                     <span className="font-semibold text-slate-700">{formatDate(selectedHistoryDeath.cow?.dob)}</span>
                  </div>
                  <div>
                     <span className="block text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">Purchase Date</span>
                     <span className="font-semibold text-slate-700">{formatDate(selectedHistoryDeath.cow?.purchaseDate) || "Unknown"}</span>
                  </div>
               </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-rose-200 shadow-sm flex flex-col gap-5 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-10 -mt-10 pointer-events-none"></div>
               <div className="flex items-center gap-2 border-b border-slate-100 pb-3 relative z-10">
                  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="20" width="20" className="text-rose-500" xmlns="http://www.w3.org/2000/svg"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                  <h3 className="text-[16px] font-bold text-slate-800 m-0">Mortality Record</h3>
               </div>
               <div className="grid grid-cols-2 gap-4 text-[14px] relative z-10">
                  <div>
                     <span className="block text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">Death Date</span>
                     <span className="font-bold text-rose-600">{formatDate(selectedHistoryDeath.deathAt)}</span>
                  </div>
                  <div>
                     <span className="block text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">Reason</span>
                     <span className="font-semibold text-slate-700">{selectedHistoryDeath.reason || "-"}</span>
                  </div>
                  <div>
                     <span className="block text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">Disposal Method</span>
                     <span className="font-semibold text-slate-700">{selectedHistoryDeath.disposalMethod || "-"}</span>
                  </div>
                  <div>
                     <span className="block text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">Disposal Date</span>
                     <span className="font-semibold text-slate-700">{formatDate(selectedHistoryDeath.disposalDate)}</span>
                  </div>
                  <div className="col-span-2">
                     <span className="block text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">Disposal Cost</span>
                     <span className="font-semibold text-slate-700">{selectedHistoryDeath.disposalCost ? `₹${Number(selectedHistoryDeath.disposalCost).toFixed(2)}` : "-"}</span>
                  </div>
               </div>
            </div>
          </div>

          <div className="history-section-card">
             <div className="history-table-header bg-slate-900">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>
                Reproduction Records <span className="bg-slate-700 text-white px-2 py-0.5 rounded-full text-xs ml-2">{selectedHistoryDeath.cow?.reproductionRecords?.length || 0}</span>
             </div>
             <div className="table-wrapper">
               <table>
                 <thead>
                   <tr>
                     <th>#</th>
                     {selectedHistoryDeath.cow?.gender === "Male" ? (
                        <>
                          <th>Breeding Status</th>
                          <th>Last Breeding</th>
                          <th>Services</th>
                          <th>Doctor</th>
                          <th>Vet Remarks</th>
                          <th>Remarks</th>
                        </>
                      ) : (
                        <>
                          <th>Heat</th>
                          <th>AI</th>
                          <th>AI Type</th>
                          <th>AI Bull</th>
                          <th>Preg. Check</th>
                          <th>Status</th>
                          <th>Delivery</th>
                          <th>Calf</th>
                          <th>Remark</th>
                        </>
                      )}
                   </tr>
                 </thead>
                 <tbody>
                   {(!selectedHistoryDeath.cow?.reproductionRecords || selectedHistoryDeath.cow.reproductionRecords.length === 0) && (
                     <tr>
                        <td colSpan={selectedHistoryDeath.cow?.gender === "Male" ? "7" : "10"} style={{textAlign: "center", padding: "30px", color: "#64748b"}}>
                           No reproduction records found for this animal.
                        </td>
                     </tr>
                   )}
                   {(selectedHistoryDeath.cow?.reproductionRecords || []).map((r, idx) => (
                     <tr key={r.id}>
                        <td data-label="#" className="font-medium text-slate-500">{idx + 1}</td>
                        {selectedHistoryDeath.cow?.gender === "Male" ? (
                          <>
                            <td data-label="Status" className="font-semibold">{r.breedingStatus || "-"}</td>
                            <td data-label="Date">{formatDate(r.lastBreedingDate)}</td>
                            <td data-label="Services">{r.serviceCount || "-"}</td>
                            <td data-label="Doctor">{r.doctorName || "-"}</td>
                            <td data-label="Vet Remarks">{r.veterinaryRemarks || "-"}</td>
                            <td data-label="Remarks">{r.remark || "-"}</td>
                          </>
                        ) : (
                          <>
                            <td data-label="Heat">{formatDate(r.heatDate)}</td>
                            <td data-label="AI">{formatDate(r.aiDate)}</td>
                            <td data-label="AI Type">{r.aiType || "-"}</td>
                            <td data-label="Bull" className="font-semibold">{r.aiBullName || "-"}</td>
                            <td data-label="Preg Check">{formatDate(r.pregnancyCheckDate)}</td>
                            <td data-label="Status">
                               {r.pregnancyStatus ? (
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${r.pregnancyStatus === 'Positive' ? 'bg-emerald-100 text-emerald-700' : r.pregnancyStatus === 'Negative' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                                     {r.pregnancyStatus}
                                  </span>
                               ) : "-"}
                            </td>
                            <td data-label="Delivery" className="font-semibold text-slate-800">{formatDate(r.deliveryDate)}</td>
                            <td data-label="Calf">{r.calfName || "-"}</td>
                            <td data-label="Remark">{r.remark || "-"}</td>
                          </>
                        )}
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>

          <div className="history-section-card">
             <div className="history-table-header bg-slate-900">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                Treatment Records <span className="bg-slate-700 text-white px-2 py-0.5 rounded-full text-xs ml-2">{selectedHistoryDeath.cow?.treatments?.length || 0}</span>
             </div>
             <div className="table-wrapper">
               <table>
                 <thead>
                   <tr>
                     <th>#</th>
                     <th>Date</th>
                     <th>Diagnosis / Complaint</th>
                     <th>Medicine / Treatment</th>
                     <th>Cost (₹)</th>
                   </tr>
                 </thead>
                 <tbody>
                   {(!selectedHistoryDeath.cow?.treatments || selectedHistoryDeath.cow.treatments.length === 0) && (
                     <tr>
                        <td colSpan="5" style={{textAlign: "center", padding: "30px", color: "#64748b"}}>
                           No medical treatment records found for this animal.
                        </td>
                     </tr>
                   )}
                   {(selectedHistoryDeath.cow?.treatments || []).map((t, idx) => (
                     <tr key={t.id}>
                        <td data-label="#" className="font-medium text-slate-500">{idx + 1}</td>
                        <td data-label="Date" className="font-semibold text-slate-700">{formatDate(t.treatedAt)}</td>
                        <td data-label="Diagnosis">{t.diagnosis || "-"}</td>
                        <td data-label="Treatment">{t.medicine || "-"}</td>
                        <td data-label="Cost" className="font-bold text-slate-800">{t.cost ? `₹${Number(t.cost).toFixed(2)}` : "-"}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {showAddMethodModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', width: '90%' }}>
            <h3>Add New Disposal Method</h3>
            <div className="form-group" style={{ marginTop: '15px' }}>
              <label>Method Name</label>
              <input 
                type="text" 
                value={newMethodName} 
                onChange={e => setNewMethodName(e.target.value)} 
                placeholder="Enter method name" 
                autoFocus 
              />
            </div>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowAddMethodModal(false)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleAddMethod}>Add Method</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CowDeath;
