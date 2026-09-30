import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useConfirm } from "../../../context/ConfirmContext";
import { hasPermission } from "../../../utils/permissions";
import ExportButtons from "../../../components/ExportButtons";
import "../../../css/managecow.css";

const cattleInitial = {
  tagNo: "",
  regNo: "",
  name: "",
  animalType: "Cow",
  breed: "Cow",
  age: "",
  gender: "Female",
  dob: "",
  purchaseDate: "",
  purchaseFrom: "",
  purchaseAddress: "",
  mobileNo: "",
  purchasePrice: "",
  governmentTagNo: "",
  fatherName: "",
  motherName: "",
  fatherFatherName: "",
  fatherMotherName: "",
  motherFatherName: "",
  motherMotherName: "",
  image: "",
  image2: "",
  isActiveForMilk: false,
  status: "Active",
};

const reproductionInitial = {
  heatDate: "",
  aiDate: "",
  aiBullName: "",
  bullName: "",
  doctorName: "",
  doctorArrivingAt: "",
  pregnancyCheckDate: "",
  pregnancyStatus: "",
  deliveryDate: "",
  calfName: "",
  remark: "",
  breedingStatus: "Available",
  lastBreedingDate: "",
  serviceCount: "",
  aiType: "Natural",
  expectedNextHeatDate: "",
  pregnancyMonth: "",
  veterinaryRemarks: "",
};

const cowIcon = "\u265E";

const animalTypes = [
  "Cow",
  "Buffalo",
  "Calf"
];

const getLocalDateTime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const addDays = (dateValue, days) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

const ManageCows = ({ onChanged }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { confirm, customAlert } = useConfirm();
  const adminData = JSON.parse(localStorage.getItem("adminData") || "{}");
  const [cows, setCows] = useState([]);
  const [animalFilter, setAnimalFilter] = useState("All Animals");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [cattleForm, setCattleForm] = useState(cattleInitial);
  const [selectedCow, setSelectedCow] = useState(null);
  const [viewCow, setViewCow] = useState(null);
  const [editingCowId, setEditingCowId] = useState(null);
  const [showReproductionModal, setShowReproductionModal] = useState(false);
  const [reproductionCowId, setReproductionCowId] = useState("");
  const [reproductionForm, setReproductionForm] = useState(reproductionInitial);
  const [pendingReproductionForms, setPendingReproductionForms] = useState([]);
  const [pendingEditIndex, setPendingEditIndex] = useState(null);
  const [message, setMessage] = useState("");
  const viewMatch = location.pathname.match(/\/view\/(\d+)/);
  const view = viewMatch ? "view" : location.pathname.endsWith("/add") ? "create" : "list";
  const viewId = viewMatch ? parseInt(viewMatch[1], 10) : null;

  const loadCows = async () => {
    const res = await api.get("/api/admin/cows");
    let nextCows = Array.isArray(res.data)
      ? res.data
      : res.data?.cows || res.data?.animals || res.data?.data || [];

    // Dead animals are now loaded and handled by the status filter

    setCows((currentCows) =>
      nextCows.length || !currentCows.length ? nextCows : currentCows,
    );
    return nextCows;
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCows().catch(() => setMessage("Unable to load cattle records"));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (location.state?.action === 'logHeat' && location.state?.cowId && cows.length > 0) {
      const targetCow = cows.find(c => c.id === location.state.cowId);
      if (targetCow) {
        openReproductionModal(targetCow);
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, cows, navigate, location.pathname]);

  useEffect(() => {
    if (showReproductionModal || viewCow) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showReproductionModal, viewCow]);

  const fetchNextRegNo = async () => {
    try {
      const res = await api.get("/api/admin/cows/next-reg-no");
      if (res.data?.nextRegNo) {
        setCattleForm((prev) => ({ ...prev, regNo: res.data.nextRegNo }));
      }
    } catch (e) {
      console.error("Failed to fetch next reg no", e);
    }
  };

  useEffect(() => {
    if (view === "create" && !editingCowId && !cattleForm.regNo) {
      fetchNextRegNo();
    }
  }, [view, editingCowId, cattleForm.regNo]);

  const filteredCows = cows.filter((cow) => {
    const matchAnimal = animalFilter === "All Animals" || cow.animalType === animalFilter;
    const cowStatus = cow.status || "Active";
    const matchStatus = statusFilter === "All" || cowStatus.toLowerCase() === statusFilter.toLowerCase();
    return matchAnimal && matchStatus;
  });

  const currentViewCow = view === "view" ? cows.find(c => c.id === viewId) : null;
  const [showImageModal, setShowImageModal] = useState(false);

  const updateCattleForm = (name, value) => {
    const updates = { [name]: value };

    if (name === "animalType") {
      updates.breed = value;
    }

    if (name === "regNo") {
      updates.tagNo = value;
    }

    if (name === "dob" && value) {
      if (cattleForm.purchaseDate && cattleForm.purchaseDate < value) {
        updates.purchaseDate = "";
      }
    }

    setCattleForm({ ...cattleForm, ...updates });
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        customAlert("Image 1 must be less than 2MB in size.");
        event.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        updateCattleForm("image", e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload2 = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        updateCattleForm("image2", e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCattleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const cowRes = editingCowId
        ? await api.put(`/api/admin/cows/${editingCowId}`, cattleForm)
        : await api.post("/api/admin/cows", cattleForm);

      if (!editingCowId && pendingReproductionForms.length > 0) {
        const newCowId = cowRes.data.id;
        for (const pendingForm of pendingReproductionForms) {
          await api.post(`/api/admin/cows/${newCowId}/reproduction`, {
            ...pendingForm,
            cowId: newCowId,
          });
        }
      }

      setCattleForm(cattleInitial);
      setEditingCowId(null);
      setPendingReproductionForms([]);
      await loadCows();
      await onChanged?.();
      setMessage(
        editingCowId
          ? "Cattle record updated"
          : pendingReproductionForms.length > 0
            ? "Cattle and reproduction record saved"
            : "Cattle record saved",
      );
      navigate("/admin/manage-cows");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to save cattle record");
    }
  };

  const formatDateInput = (value) => {
    if (!value) return "";
    return new Date(value).toISOString().slice(0, 10);
  };

  const handleViewCow = (cow) => {
    navigate(`/admin/manage-cows/view/${cow.id}`);
  };

  const handleEditCow = (cow) => {
    setEditingCowId(cow.id);
    setPendingReproductionForms([]);
    setCattleForm({
      ...cattleInitial,
      ...cow,
      tagNo: cow.tagNo || cow.regNo || "",
      regNo: cow.regNo || cow.tagNo || "",
      age: cow.age ?? "",
      dob: formatDateInput(cow.dob),
      purchaseDate: formatDateInput(cow.purchaseDate),
      purchasePrice: cow.purchasePrice ?? "",
      image: cow.image || "",
      isActiveForMilk: Boolean(cow.isActiveForMilk),
    });
    navigate("/admin/manage-cows/add");
  };

  const handleDeleteCow = async (cow) => {
    const isConfirmed = await confirm(`Delete ${cow.name}?`);
    if (!isConfirmed) return;
    setMessage("");

    try {
      await api.delete(`/api/admin/cows/${cow.id}`);
      await loadCows();
      await onChanged?.();
      setMessage("Cattle record deleted");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to delete cattle record");
    }
  };

  const handleReproductionChange = (name, value) => {
    const next = { ...reproductionForm, [name]: value };

    // Clear chronologically invalid dates when parents change
    if (name === "heatDate" && value) {
      if (next.aiDate && next.aiDate < value) next.aiDate = "";
      if (next.pregnancyCheckDate && next.pregnancyCheckDate < value) next.pregnancyCheckDate = "";
      if (next.expectedNextHeatDate && next.expectedNextHeatDate < value) next.expectedNextHeatDate = "";
      if (next.deliveryDate && next.deliveryDate < value) next.deliveryDate = "";
    }
    if (name === "aiDate" && value) {
      if (next.pregnancyCheckDate && next.pregnancyCheckDate < value) next.pregnancyCheckDate = "";
      if (next.expectedNextHeatDate && next.expectedNextHeatDate < value) next.expectedNextHeatDate = "";
      if (next.deliveryDate && next.deliveryDate < value) next.deliveryDate = "";
    }
    if (name === "pregnancyCheckDate" && value) {
      if (next.expectedNextHeatDate && next.expectedNextHeatDate < value) next.expectedNextHeatDate = "";
      if (next.deliveryDate && next.deliveryDate < value) next.deliveryDate = "";
      next.doctorArrivingAt = value;
    }
    if (name === "doctorArrivingAt" && value) {
      next.pregnancyCheckDate = value;
    }

    const baseDate = next.aiDate || next.heatDate;
    
    // Auto calculate preg check if base date changes
    if (["heatDate", "aiDate"].includes(name) && baseDate) {
      next.pregnancyCheckDate = addDays(baseDate, 75);
      next.doctorArrivingAt = next.pregnancyCheckDate;
    }

    // Auto calculate delivery date if positive and base date exists
    if (
      ["pregnancyStatus", "heatDate", "aiDate"].includes(name) &&
      next.pregnancyStatus === "Positive" &&
      baseDate
    ) {
      next.deliveryDate = addDays(baseDate, 280);
    }

    setReproductionForm(next);
  };

  const openReproductionModal = async (cow = null) => {
    setMessage("");

    try {
      const latestCows = await loadCows();
      setSelectedCow(cow);
      setReproductionCowId(cow?.id ? String(cow.id) : "");
      setReproductionForm(reproductionInitial);
      setShowReproductionModal(true);

      if (!cow && !latestCows.length && !cows.length) {
        // Removed message as per user request
      }
    } catch {
      setMessage("Unable to load animals");
    }
  };

  const handleEditReproduction = (record, cowId) => {
    setMessage("");
    setReproductionCowId(cowId ? String(cowId) : "");
    setSelectedCow(cowId ? cows.find((c) => c.id === cowId) : null);

    const formattedRecord = { ...record };
    ["heatDate", "aiDate", "pregnancyCheckDate", "deliveryDate", "expectedNextHeatDate"].forEach(dateField => {
      if (formattedRecord[dateField]) {
        formattedRecord[dateField] = new Date(formattedRecord[dateField]).toISOString().slice(0, 10);
      }
    });
    if (formattedRecord.doctorArrivingAt) {
      formattedRecord.doctorArrivingAt = new Date(formattedRecord.doctorArrivingAt).toISOString().slice(0, 10);
    }

    setReproductionForm(formattedRecord);
    setPendingEditIndex(record._pendingIndex);
    setShowReproductionModal(true);
  };

  const handleDeleteReproduction = async (recordId, cowId) => {
    const isConfirmed = await confirm("Are you sure you want to delete this reproduction record?");
    if (!isConfirmed) return;
    try {
      await api.delete(`/api/admin/cows/${cowId}/reproduction/${recordId}`);
      await loadCows();
      await onChanged?.();
      setMessage("Reproduction record deleted");
    } catch (error) {
      setMessage("Unable to delete reproduction record");
    }
  };

  const handleReproductionSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    let cowId = selectedCow?.id || reproductionCowId;
    if (cowId === "null" || cowId === "undefined") cowId = "";
    
    console.log("Submitting reproduction for cowId:", cowId, "selectedCow:", selectedCow, "reproductionCowId:", reproductionCowId);

    if (!cowId && view === "create") {
      if (pendingEditIndex !== undefined && pendingEditIndex !== null) {
        const updated = [...pendingReproductionForms];
        updated[pendingEditIndex] = reproductionForm;
        setPendingReproductionForms(updated);
        setPendingEditIndex(null);
      } else {
        setPendingReproductionForms([...pendingReproductionForms, reproductionForm]);
      }
      setShowReproductionModal(false);
      setReproductionCowId("");
      setReproductionForm(reproductionInitial);
      return;
    }

    if (!cowId) {
      setMessage("Please select an animal first");
      return;
    }

    try {
      if (reproductionForm.id) {
        await api.put(`/api/admin/cows/${cowId}/reproduction/${reproductionForm.id}`, reproductionForm);
      } else {
        await api.post(`/api/admin/cows/${cowId}/reproduction`, reproductionForm);
      }
      setSelectedCow(null);
      setShowReproductionModal(false);
      setReproductionCowId("");
      setReproductionForm(reproductionInitial);
      await loadCows();
      await onChanged?.();
      setMessage("Reproduction record saved");
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Unable to save reproduction record",
      );
    }
  };

  return (
    <section className="cattle-page">
      {view === "list" ? (
        <>
          <section className="cattle-toolbar">
            <h3>Cattle</h3>
            <div className="cattle-toolbar-actions">
              <select
                value={animalFilter}
                onChange={(e) => setAnimalFilter(e.target.value)}
              >
                <option value="All Animals">All Animals</option>
                {animalTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Sold">Sold</option>
                <option value="Dead">Dead</option>
              </select>
              <ExportButtons tableId="manage-cows-table" filename="Cattle_List" title="Cattle List" />
              {hasPermission(adminData, "cows", "add") && (
                <button
                  type="button"
                  className="primary"
                  onClick={() => navigate("/admin/manage-cows/add")}
                >
                  + Add Cattle
                </button>
              )}
            </div>
          </section>

          <section className="cattle-table-card">
            <div className="table-wrap">
              <table id="manage-cows-table">
                <thead>
                  <tr>
                    <th>Id</th>
                    <th>Reg. No</th>
                    <th>Name</th>
                    <th>Animal</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCows.map((cow) => (
                    <tr key={cow.id}>
                      <td data-label="Id">{cow.id}</td>
                      <td data-label="Reg. No">{cow.regNo || cow.tagNo}</td>
                      <td data-label="Name">{cow.name}</td>
                      <td data-label="Animal">{cow.animalType}</td>
                      <td data-label="Status">{cow.status || "Active"}</td>
                      <td data-label="Created">{formatDate(cow.createdAt)}</td>
                      <td data-label="Action">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-action view"
                            title="View"
                            aria-label="View"
                            onClick={() => handleViewCow(cow)}
                          >
                            &#128065;
                          </button>
                          {hasPermission(adminData, "cows", "edit") && (
                            <button
                              type="button"
                              className="icon-action edit"
                              title="Edit"
                              aria-label="Edit"
                              onClick={() => handleEditCow(cow)}
                            >
                              &#9998;
                            </button>
                          )}
                          {hasPermission(adminData, "cows", "delete") && (
                            <button
                              type="button"
                              className="icon-action delete"
                              title="Delete"
                              aria-label="Delete"
                              onClick={() => handleDeleteCow(cow)}
                            >
                              &#128465;
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filteredCows.length && (
              <p className="empty-state">No animal records added yet.</p>
            )}
          </section>
        </>
      ) : view === "create" ? (
        <form className="cattle-form-page" onSubmit={handleCattleSubmit}>
          <div className="cattle-form-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>
              {cowIcon} {editingCowId ? "Edit Animal" : "Create Animal"}
            </h3>
            <button type="button"
              onClick={() => window.history.back()} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
</button>
          </div>

          <section className="cattle-form-section">
            <h4>Animal Master</h4>
            <div className="cattle-form-grid">
              <label>
                Animal Id
                <input value="(new)" disabled />
              </label>
              <label>
                Name
                <input
                  placeholder="Cattle Name"
                  value={cattleForm.name}
                  onChange={(event) => updateCattleForm("name", event.target.value)}
                  required
                />
              </label>
              <label>
                Animal Type
                <select
                  value={cattleForm.animalType}
                  onChange={(event) =>
                    updateCattleForm("animalType", event.target.value)
                  }
                  required
                >
                  {animalTypes.map((animalType) => (
                    <option key={animalType}>{animalType}</option>
                  ))}
                </select>
              </label>
              <label>
                Reg No
                <input
                  value={cattleForm.regNo}
                  onChange={(event) => updateCattleForm("regNo", event.target.value)}
                  placeholder="Auto-generated (e.g. reg001)"
                  disabled
                />
              </label>
              <label>
                Gender
                <select
                  value={cattleForm.gender}
                  onChange={(event) => updateCattleForm("gender", event.target.value)}
                  required
                >
                  <option value="">Select Gender</option>
                  <option>Female</option>
                  <option>Male</option>
                </select>
              </label>
              <label>
                Image 1
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ paddingTop: '4px' }}
                  className="file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#e8f7ff] file:text-[#22577a] hover:file:bg-[#d7e4ff] cursor-pointer"
                />
                {cattleForm.image && <img src={cattleForm.image} alt="preview" style={{ width: "50px", height: "50px", objectFit: "cover", marginTop: "5px", borderRadius: "4px", border: "1px solid #ccc" }} />}
              </label>
              <label>
                Image 2
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload2}
                  style={{ paddingTop: '4px' }}
                  className="file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#e8f7ff] file:text-[#22577a] hover:file:bg-[#d7e4ff] cursor-pointer"
                />
                {cattleForm.image2 && <img src={cattleForm.image2} alt="preview" style={{ width: "50px", height: "50px", objectFit: "cover", marginTop: "5px", borderRadius: "4px", border: "1px solid #ccc" }} />}
              </label>
            </div>
          </section>

          <section className="cattle-form-section">
            <h4>Animal Info / Purchase / Genealogy</h4>
            <div className="cattle-form-grid">
              <label>DOB<input type="date" value={cattleForm.dob} onChange={(event) => updateCattleForm("dob", event.target.value)} /></label>
              <label>Purchase Date<input type="date" min={cattleForm.dob || undefined} value={cattleForm.purchaseDate} onChange={(event) => updateCattleForm("purchaseDate", event.target.value)} /></label>
              <label>Purchase From<input placeholder="Enter name" value={cattleForm.purchaseFrom} onChange={(event) => updateCattleForm("purchaseFrom", event.target.value)} /></label>
              <label>Purchase Address<input placeholder="Enter address" value={cattleForm.purchaseAddress} onChange={(event) => updateCattleForm("purchaseAddress", event.target.value)} /></label>
              <label>
                Mobile No
                <input
                  placeholder="10-digit Mobile No"
                  type="tel"
                  pattern="\d{10}"
                  title="Enter a valid 10-digit mobile number"
                  value={cattleForm.mobileNo}
                  onChange={(event) => {
                    const onlyNums = event.target.value.replace(/\D/g, '');
                    if (onlyNums.length <= 10) {
                      updateCattleForm("mobileNo", onlyNums);
                    }
                  }}
                />
              </label>
              <label>
                Purchase Price
                <input
                  type="number"
                  min="0"
                  placeholder="Enter Price"
                  value={cattleForm.purchasePrice}
                  onChange={(event) => updateCattleForm("purchasePrice", event.target.value)}
                />
              </label>
              <label>Government Tag No<input placeholder="e.g. TAG12345" value={cattleForm.governmentTagNo} onChange={(event) => updateCattleForm("governmentTagNo", event.target.value)} /></label>
              <label>Father Name<input placeholder="Enter Father's Name" value={cattleForm.fatherName} onChange={(event) => updateCattleForm("fatherName", event.target.value)} /></label>
              <label>Mother Name<input placeholder="Enter Mother's Name" value={cattleForm.motherName} onChange={(event) => updateCattleForm("motherName", event.target.value)} /></label>
              <label>Father Father Name<input placeholder="Enter Father's Father" value={cattleForm.fatherFatherName} onChange={(event) => updateCattleForm("fatherFatherName", event.target.value)} /></label>
              <label>Father Mother Name<input placeholder="Enter Father's Mother" value={cattleForm.fatherMotherName} onChange={(event) => updateCattleForm("fatherMotherName", event.target.value)} /></label>
              <label>Mother Father Name<input placeholder="Enter Mother's Father" value={cattleForm.motherFatherName} onChange={(event) => updateCattleForm("motherFatherName", event.target.value)} /></label>
              <label>Mother Mother Name<input placeholder="Enter Mother's Mother" value={cattleForm.motherMotherName} onChange={(event) => updateCattleForm("motherMotherName", event.target.value)} /></label>
              <label className="checkbox-line" style={{ marginTop: "1rem" }}>
                <input
                  type="checkbox"
                  checked={cattleForm.isActiveForMilk}
                  onChange={(event) =>
                    updateCattleForm("isActiveForMilk", event.target.checked)
                  }
                />
                Is Active for Milk
              </label>
            </div>
          </section>

          <section className="cattle-form-section">
            <div className="section-action-title bg-brand-light text-text-main" style={{ padding: "12px 20px" }}>
              <h4 style={{ backgroundColor: "transparent", border: "none", color: "inherit", padding: 0 }}>Reproduction / AI / Delivery</h4>
              <button
                type="button"
                className="btn btn-add btn-sm"
                onClick={() => {
                  const currentCow = editingCowId ? cows.find(c => c.id === editingCowId) : null;
                  openReproductionModal(currentCow);
                }}
              >
                + Add Record
              </button>
            </div>

            {(() => {
              const currentCow = editingCowId ? cows.find(c => c.id === editingCowId) : null;
              const repRecords = currentCow ? (currentCow.reproductionRecords || []) : pendingReproductionForms.map((f, i) => ({ ...f, _pendingIndex: i }));
              const gender = currentCow ? currentCow.gender : cattleForm.gender;

              if (false) {
                // Removed early return
              }

              return (
                <div className="table-wrap" style={{ marginTop: '1rem' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        {gender === "Male" ? (
                          <>
                            <th>Breeding Status</th>
                            <th>Last Breeding</th>
                            <th>Services</th>
                            <th>Doctor</th>
                            <th>Vet Remarks</th>
                            <th>Remarks</th>
                            <th>Action</th>
                          </>
                        ) : (
                          <>
                            <th>Heat</th>
                            <th>AI</th>
                            <th>AI Type</th>
                            <th>AI Bull</th>
                            <th>Bull</th>
                            <th>Doctor</th>
                            <th>Preg. Check</th>
                            <th>Status</th>
                            <th>Delivery</th>
                            <th>Calf</th>
                            <th>Remark</th>
                            <th>Action</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {repRecords.length === 0 && (
                        <tr>
                          <td colSpan={gender === "Male" ? "8" : "13"} style={{ textAlign: "center", padding: "20px" }}>No reproduction records found.</td>
                        </tr>
                      )}
                      {repRecords.map((r, idx) => (
                        <tr key={r.id || 'pending'}>
                          <td data-label="#">{idx + 1}</td>
                          {gender === "Male" ? (
                            <>
                              <td data-label="Status">{r.breedingStatus || "-"}</td>
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
                              <td data-label="AI Bull">{r.aiBullName || "-"}</td>
                              <td data-label="Bull">{r.bullName || "-"}</td>
                              <td data-label="Doctor">{r.doctorName || "-"}</td>
                              <td data-label="Preg. Check">{formatDate(r.pregnancyCheckDate)}</td>
                              <td data-label="Status">{r.pregnancyStatus || "-"}</td>
                              <td data-label="Delivery">{formatDate(r.deliveryDate)}</td>
                              <td data-label="Calf">{r.calfName || "-"}</td>
                              <td data-label="Remark">{r.remark || "-"}</td>
                            </>
                          )}
                          <td>
                              <div className="table-actions" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className="icon-action edit"
                                  title="Edit"
                                  onClick={() => handleEditReproduction(r, editingCowId)}
                                >
                                  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button
                                  type="button"
                                  className="icon-action delete"
                                  title="Delete"
                                  onClick={() => {
                                    if (!r.id) {
                                      const updated = [...pendingReproductionForms];
                                      updated.splice(r._pendingIndex, 1);
                                      setPendingReproductionForms(updated);
                                    } else {
                                      handleDeleteReproduction(r.id, editingCowId);
                                    }
                                  }}
                                >
                                  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                              </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </section>

          <button className="cattle-save" type="submit">
            {editingCowId ? "Update Animal" : "Save Animal"}
          </button>
          {message && <p className="form-message">{message}</p>}
        </form>
      ) : view === "view" && currentViewCow ? (
        <div className="cattle-form-page">
          <div className="cattle-form-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>
              {cowIcon} Animal Details: {currentViewCow.name || currentViewCow.regNo}
            </h3>
            <button type="button"
              onClick={() => window.history.back()} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
</button>
          </div>

          {showImageModal && (
            <div className="modal-backdrop" onClick={() => setShowImageModal(false)} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
              <div style={{ position: 'relative', background: 'white', padding: '10px', borderRadius: '8px', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>

                <img src={typeof showImageModal === 'string' ? showImageModal : currentViewCow?.image} alt="Cow" style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 20px)', borderRadius: '4px' }} />
              </div>
            </div>
          )}

          <div className="animal-view-layout">
            <section className="cattle-form-section">
              <h4>Master Info</h4>
              <div className="animal-detail-grid">
                {(currentViewCow.image || currentViewCow.image2) && (
                  <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "1rem" }}>
                    {currentViewCow.image && (
                      <img 
                        src={currentViewCow.image} 
                        alt={currentViewCow.name} 
                        onClick={() => setShowImageModal(currentViewCow.image)}
                        style={{ width: "140px", height: "140px", objectFit: "cover", borderRadius: "50%", border: "4px solid white", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", cursor: "pointer", transition: "transform 0.2s" }} 
                        onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                        onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                        title="Click to view full image"
                      />
                    )}
                    {currentViewCow.image2 && (
                      <img 
                        src={currentViewCow.image2} 
                        alt={`${currentViewCow.name || 'animal'} 2`} 
                        onClick={() => setShowImageModal(currentViewCow.image2)}
                        style={{ width: "140px", height: "140px", objectFit: "cover", borderRadius: "50%", border: "4px solid white", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", cursor: "pointer", transition: "transform 0.2s" }} 
                        onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                        onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                        title="Click to view full image"
                      />
                    )}
                  </div>
                )}
                <p><strong>Reg. No</strong><span>{currentViewCow.regNo || currentViewCow.tagNo || "-"}</span></p>
                <p><strong>Name</strong><span>{currentViewCow.name || "-"}</span></p>
                <p><strong>Animal Type</strong><span>{currentViewCow.animalType || "-"}</span></p>
                <p><strong>Breed</strong><span>{currentViewCow.breed || "-"}</span></p>
                <p><strong>Gender</strong><span>{currentViewCow.gender || "-"}</span></p>
                <p><strong>DOB</strong><span>{formatDate(currentViewCow.dob)}</span></p>
                <p><strong>Age</strong><span>{currentViewCow.age ? `${currentViewCow.age} Years` : "-"}</span></p>
                <p><strong>Status</strong><span>{currentViewCow.status || "Active"}</span></p>
              </div>
            </section>

            <section className="cattle-form-section">
              <h4>Purchase & Genealogy</h4>
              <div className="animal-detail-grid">
                <p><strong>Purchase Date</strong><span>{formatDate(currentViewCow.purchaseDate)}</span></p>
                <p><strong>Purchase From</strong><span>{currentViewCow.purchaseFrom || "-"}</span></p>
                <p><strong>Purchase Price</strong><span>{currentViewCow.purchasePrice ?? "-"}</span></p>
                <p><strong>Mobile No</strong><span>{currentViewCow.mobileNo || "-"}</span></p>
                <p style={{ gridColumn: "1 / -1" }}><strong>Purchase Address</strong><span>{currentViewCow.purchaseAddress || "-"}</span></p>
                <p><strong>Govt Tag No</strong><span>{currentViewCow.governmentTagNo || "-"}</span></p>
                <p><strong>Father Name</strong><span>{currentViewCow.fatherName || "-"}</span></p>
                <p><strong>Mother Name</strong><span>{currentViewCow.motherName || "-"}</span></p>
                <p><strong>Father's Father</strong><span>{currentViewCow.fatherFatherName || "-"}</span></p>
                <p><strong>Father's Mother</strong><span>{currentViewCow.fatherMotherName || "-"}</span></p>
                <p><strong>Mother's Father</strong><span>{currentViewCow.motherFatherName || "-"}</span></p>
                <p><strong>Mother's Mother</strong><span>{currentViewCow.motherMotherName || "-"}</span></p>
              </div>
            </section>

            <section className="cattle-form-section" style={{ gridColumn: "1 / -1" }}>
              <h4>Reproduction & Health</h4>
              {true ? (
                <div className="table-wrap p-4">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        {currentViewCow.gender === "Male" ? (
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
                      {(!currentViewCow.reproductionRecords || currentViewCow.reproductionRecords.length === 0) && (
                        <tr>
                          <td colSpan={currentViewCow.gender === "Male" ? "7" : "10"} style={{ textAlign: "center", padding: "20px" }}>No reproduction or health records found.</td>
                        </tr>
                      )}
                      {(currentViewCow.reproductionRecords || []).map((r, idx) => (
                        <tr key={r.id}>
                          <td>{idx + 1}</td>
                          {currentViewCow.gender === "Male" ? (
                            <>
                              <td>{r.breedingStatus || "-"}</td>
                              <td>{formatDate(r.lastBreedingDate)}</td>
                              <td>{r.serviceCount || "-"}</td>
                              <td>{r.doctorName || "-"}</td>
                              <td>{r.veterinaryRemarks || "-"}</td>
                              <td>{r.remark || "-"}</td>
                            </>
                          ) : (
                            <>
                              <td data-label="Heat">{formatDate(r.heatDate)}</td>
                              <td data-label="AI">{formatDate(r.aiDate)}</td>
                              <td data-label="AI Type">{r.aiType || "-"}</td>
                              <td data-label="Bull">{r.aiBullName || "-"}</td>
                              <td data-label="Preg Check">{formatDate(r.pregnancyCheckDate)}</td>
                              <td data-label="Status">
                                {r.pregnancyStatus ? (
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${r.pregnancyStatus === 'Positive' ? 'bg-emerald-100 text-emerald-700' : r.pregnancyStatus === 'Negative' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                                    {r.pregnancyStatus}
                                  </span>
                                ) : "-"}
                              </td>
                              <td data-label="Delivery">{formatDate(r.deliveryDate)}</td>
                              <td data-label="Calf">{r.calfName || "-"}</td>
                              <td data-label="Remark">{r.remark || "-"}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      ) : view === "view" ? (
        <p className="empty-state">Loading animal details...</p>
      ) : null}

      {showReproductionModal && (
        <div className="modal-backdrop">
          <form className="reproduction-modal" onSubmit={handleReproductionSubmit}>
            <div className="modal-heading">
              <h3>Add Reproduction Record</h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedCow(null);
                  setShowReproductionModal(false);
                  setReproductionCowId("");
                }}
              >
                x
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {selectedCow ? (
                <p className="modal-subtitle">
                  {selectedCow.name} - {selectedCow.regNo || selectedCow.tagNo}
                </p>
              ) : view === "create" ? (
                <p className="modal-subtitle">
                  This record will be saved after you save the animal.
                </p>
              ) : (
                <label className="modal-cow-select">
                  Saved Animal
                  <select
                    value={reproductionCowId}
                    onChange={(event) => setReproductionCowId(event.target.value)}
                    required
                  >
                    <option value="">
                      {cows.length ? "Select saved animal" : "Save animal first"}
                    </option>
                    {cows.map((cow) => (
                      <option key={cow.id} value={String(cow.id)}>
                        {cow.regNo || cow.tagNo} - {cow.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {(() => {
                const status = reproductionForm.pregnancyStatus;
                const dobLimit = selectedCow ? (selectedCow.dob ? new Date(selectedCow.dob).toISOString().slice(0, 10) : "") : cattleForm.dob;
                const modalGender = selectedCow ? selectedCow.gender : cattleForm.gender;

                if (modalGender === "Male") {
                  return (
                    <div className="reproduction-grid">
                      <label>Breeding Status<select value={reproductionForm.breedingStatus || ""} onChange={(event) => handleReproductionChange("breedingStatus", event.target.value)}><option value="">Select</option><option>Active</option><option>Resting</option><option>Retired</option></select></label>
                      <label>Last Breeding Date<input type="date" min={dobLimit || undefined} value={reproductionForm.lastBreedingDate || ""} onChange={(event) => handleReproductionChange("lastBreedingDate", event.target.value)} /></label>
                      <label>Service Count<input type="number" min="0" value={reproductionForm.serviceCount || ""} onChange={(event) => handleReproductionChange("serviceCount", event.target.value)} /></label>
                      <label>Doctor Name<input placeholder="Enter Doctor Name" value={reproductionForm.doctorName || ""} onChange={(event) => handleReproductionChange("doctorName", event.target.value)} /></label>
                      <label>Veterinary Remarks<input placeholder="Enter Vet Remarks" value={reproductionForm.veterinaryRemarks || ""} onChange={(event) => handleReproductionChange("veterinaryRemarks", event.target.value)} /></label>
                      <label className="full">Remarks<input placeholder="Enter Remarks" value={reproductionForm.remark || ""} onChange={(event) => handleReproductionChange("remark", event.target.value)} /></label>
                    </div>
                  );
                }

                return (
                  <div className="reproduction-grid">
                    <label>Heat Coming Date<input type="date" min={dobLimit || undefined} value={reproductionForm.heatDate} onChange={(event) => handleReproductionChange("heatDate", event.target.value)} /></label>
                    <label>AI Date<input type="date" min={reproductionForm.heatDate || dobLimit || undefined} value={reproductionForm.aiDate} onChange={(event) => handleReproductionChange("aiDate", event.target.value)} /></label>
                    <label>AI Type<select value={reproductionForm.aiType} onChange={(event) => handleReproductionChange("aiType", event.target.value)}><option>Natural</option><option>Artificial Insemination</option></select></label>
                    <label>AI Bull Name<input placeholder="Enter AI Bull Name" value={reproductionForm.aiBullName} onChange={(event) => handleReproductionChange("aiBullName", event.target.value)} /></label>
                    <label>Bull Name<input placeholder="Enter Bull Name" value={reproductionForm.bullName} onChange={(event) => handleReproductionChange("bullName", event.target.value)} /></label>
                    <label>Doctor Name<input placeholder="Enter Doctor Name" value={reproductionForm.doctorName} onChange={(event) => handleReproductionChange("doctorName", event.target.value)} /></label>
                    <label>Doctor Arrival Date<input type="date" value={reproductionForm.doctorArrivingAt} onChange={(event) => handleReproductionChange("doctorArrivingAt", event.target.value)} /></label>
                    <label>Pregnancy Check Date<input type="date" min={reproductionForm.aiDate || reproductionForm.heatDate || dobLimit || undefined} value={reproductionForm.pregnancyCheckDate} onChange={(event) => handleReproductionChange("pregnancyCheckDate", event.target.value)} /></label>
                    <label>Pregnancy Status<select value={reproductionForm.pregnancyStatus} onChange={(event) => handleReproductionChange("pregnancyStatus", event.target.value)}><option value="">Select</option><option>Not Checked</option><option>Positive</option><option>Negative</option></select></label>

                    {status === "Negative" && (
                      <>
                        <label>Expected Next Heat Date<input type="date" min={reproductionForm.pregnancyCheckDate || undefined} value={reproductionForm.expectedNextHeatDate} onChange={(event) => handleReproductionChange("expectedNextHeatDate", event.target.value)} /></label>
                        <label className="full">Remarks<input placeholder="Enter Remarks" value={reproductionForm.remark} onChange={(event) => handleReproductionChange("remark", event.target.value)} /></label>
                      </>
                    )}

                    {status === "Positive" && (
                      <>
                        <label>Expected Delivery / Calving Date<input type="date" min={reproductionForm.pregnancyCheckDate || undefined} value={reproductionForm.deliveryDate} onChange={(event) => handleReproductionChange("deliveryDate", event.target.value)} /></label>
                        <label>Pregnancy Month / Stage<input placeholder="e.g. Month 2" value={reproductionForm.pregnancyMonth} onChange={(event) => handleReproductionChange("pregnancyMonth", event.target.value)} /></label>
                        <label>Calf Name<input placeholder="Enter Calf Name" value={reproductionForm.calfName} onChange={(event) => handleReproductionChange("calfName", event.target.value)} /></label>
                        <label>Veterinary Remarks<input placeholder="Enter Vet Remarks" value={reproductionForm.veterinaryRemarks} onChange={(event) => handleReproductionChange("veterinaryRemarks", event.target.value)} /></label>
                        <label className="full">Remarks<input placeholder="Enter Remarks" value={reproductionForm.remark} onChange={(event) => handleReproductionChange("remark", event.target.value)} /></label>
                      </>
                    )}

                    {status !== "Positive" && status !== "Negative" && (
                      <label className="full">Remarks<input placeholder="Enter Remarks" value={reproductionForm.remark} onChange={(event) => handleReproductionChange("remark", event.target.value)} /></label>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => {
                  setSelectedCow(null);
                  setShowReproductionModal(false);
                  setReproductionCowId("");
                }}
              >
                Cancel
              </button>
              <button type="submit">Add Record</button>
            </div>
            {message && <p className="form-message modal-message">{message}</p>}
          </form>
        </div>
      )}
    </section>
  );
};

export default ManageCows;
