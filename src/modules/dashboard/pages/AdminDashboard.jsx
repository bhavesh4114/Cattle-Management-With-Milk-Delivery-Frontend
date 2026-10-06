import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import ManageCows from "../../cows/pages/ManageCows";
import CowDeath from "../../deaths/pages/CowDeath";
import FeedPlan from "../../feed/pages/FeedPlan";
import AddFeedPlan from "../../feed/pages/AddFeedPlan";
import FoodIntake from "../../food/pages/FoodIntake";
import AddFoodIntake from "../../food/pages/AddFoodIntake";
import CowSold from "../../sales/pages/CowSold";
import AddCowSold from "../../sales/pages/AddCowSold";
import CowHistory from "../../cows/pages/CowHistory";
import CowMilk from "../../milk/pages/CowMilk";
import AddMilk from "../../milk/pages/AddMilk";
import EditMilk from "../../milk/pages/EditMilk";
import Items from "../../stock/pages/Items";
import Orders from "../../orders/pages/Orders";
import UserProducts from "../../orders/pages/UserProducts";
import AlertPopup from "../../orders/components/AlertPopup";
import NotificationCenter from "../../../components/notifications/NotificationCenter";
import SpecialAlertsBanner from "../../../components/notifications/SpecialAlertsBanner";
import Report from "../../reports/pages/Report";
import AlertReports from "../../reports/pages/AlertReports";
import CowTreatment from "../../treatment/pages/CowTreatment";
import StockDashboard from "../../stock/pages/StockDashboard";
import StockAdjustments from "../../stock/pages/StockAdjustments";
import ManualAdjustment from "../../stock/pages/ManualAdjustment";
import CurrentStock from "../../stock/pages/CurrentStock";
import StockUpdate from "../../stock/pages/StockUpdate";
import RoleCreation from "../../roles/pages/RoleCreation";
import StaffMilkReportEntry from "../../milk-admin/pages/StaffMilkReportEntry";
import MyDeliveries from "../../milk-admin/pages/MyDeliveries";
import DeliveryBoyManagement from "../../milk-admin/pages/DeliveryBoyManagement";
import MilkDeliveryRequestsCustomer from "../../milk-admin/pages/requests/MilkDeliveryRequestsCustomer";
import { hasPermission } from "../../../utils/permissions";

const uiIcons = {
  dashboard: "\u25A6",
  cows: "\u265E",
  deaths: "\u2620",
  stock: "\u25A4",
  feed: "\u2691",
  intake: "\u25CF",
  milk: "\u25C8",
  sales: "$",
  treatments: "\u229E",
  items: "\u2B22",
  orders: "\u25A3",
  reports: "\u25A5",
  alerts: "!",
};

const sections = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: uiIcons.dashboard,
    path: "/admin/dashboard",
  },
  {
    key: "cows",
    label: "Manage Cows",
    icon: uiIcons.cows,
    path: "/admin/manage-cows",
  },
  {
    key: "deaths",
    label: "Cow Death",
    icon: uiIcons.deaths,
    path: "/admin/cow-death",
  },
  {
    key: "stock",
    label: "Stock Management",
    icon: uiIcons.stock,
    path: "/admin/stock-management",
  },
  {
    key: "feed",
    label: "Feed Plan",
    icon: uiIcons.feed,
    path: "/admin/feed-plan",
  },
  {
    key: "intake",
    label: "Food Intake",
    icon: uiIcons.intake,
    path: "/admin/food-intake",
  },
  {
    key: "milk",
    label: "Cow Milk",
    icon: uiIcons.milk,
    path: "/admin/cow-milk",
  },
  {
    key: "sales",
    label: "Cow Sold",
    icon: uiIcons.sales,
    path: "/admin/cow-sold",
  },
  {
    key: "treatments",
    label: "Cow Treatment",
    icon: uiIcons.treatments,
    path: "/admin/cow-treatment",
  },
  {
    key: "reports",
    label: "Reports",
    icon: uiIcons.reports,
    path: "/admin/reports",
  },
  {
    key: "alerts",
    label: "Alert Reports",
    icon: uiIcons.alerts,
    path: "/admin/alert-reports",
  },
  {
    key: "products",
    label: "All Products",
    icon: "\uD83D\uDCE6",
    path: "/admin/products",
  },
  {
    key: "milk-requests",
    label: "Milk Delivery Request",
    icon: "🥛",
    path: "/admin/milk-delivery-requests",
  },
];

const sectionByPath = sections.reduce((map, section) => {
  map[section.path] = section.key;
  return map;
}, {});

const sectionByKey = sections.reduce((map, section) => {
  map[section.key] = section;
  return map;
}, {});

const configs = {};

const quickActions = [
  ["cows", "Manage Cows", uiIcons.cows],
  ["feed", "Feed Plan", uiIcons.feed],
  ["intake", "Food Intake", uiIcons.intake],
  ["milk", "Cow Milk", uiIcons.milk],
  ["sales", "Cow Sold", uiIcons.sales],
  ["treatments", "Cow Treatment", uiIcons.treatments],
  ["reports", "Reports", uiIcons.reports],
  ["deaths", "Cow Death", uiIcons.deaths],
  ["items", "Items", uiIcons.items],
];

const optionalFields = [
  "notes",
  "fedAt",
  "recordedAt",
  "milkedAt",
  "soldAt",
  "treatedAt",
  "orderedAt",
  "deathAt",
];

const getValue = (record, key) =>
  key
    .split(".")
    .reduce((value, part) => (value ? value[part] : undefined), record);

const formatValue = (value) => {
  if (!value) return "-";
  if (typeof value === "string" && value.includes("T"))
    return new Date(value).toLocaleDateString();
  return value;
};

const getActiveKey = (pathname) => {
  if (pathname.startsWith("/admin/manage-cows")) return "cows";
  if (pathname.startsWith("/admin/feed-plan/add")) return "add-feed";
  if (pathname.startsWith("/admin/food-intake/add")) return "add-intake";
  if (pathname.startsWith("/admin/cow-sold/add")) return "add-sold";
  if (pathname.startsWith("/admin/cow-history")) return "cow-history";
  if (pathname.startsWith("/admin/cow-milk/add")) return "add-milk";
  if (pathname.startsWith("/admin/cow-milk/edit")) return "edit-milk";
  if (pathname.startsWith("/admin/stock-adjustments/new")) return "new-stock-adjustment";
  if (pathname.startsWith("/admin/stock-adjustments")) return "stock-adjustments";
  if (pathname.startsWith("/admin/stock-update")) return "stock-update";
  if (pathname.startsWith("/admin/stock/current")) return "current-stock";
  if (pathname.startsWith("/admin/items")) return "items";
  if (pathname.startsWith("/admin/orders")) return "orders";
  return sectionByPath[pathname] || "dashboard";
};

// ─── Farm Alerts Modal ─────────────────────────────────────────────────────

const ALERT_TABS = [
  "Pregnancy Check",
  "Check for Heat",
  "Care For Delivery",
  "Milk Drop",
  "Vaccinations",
];

const ANIMAL_FILTER_OPTIONS = ["All Animals", "Cow", "Buffalo", "Other"];

const FarmAlertsModal = ({ onClose, navigate, cows = [] }) => {
  const [activeTab, setActiveTab] = useState("Pregnancy Check");
  const [animalFilter, setAnimalFilter] = useState("All Animals");

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const pregnancyCheckAlerts = useMemo(() => {
    const alerts = [];
    cows.forEach(cow => {
      const cType = cow.animalType || "Cow";
      if (animalFilter !== "All Animals" && cType.toLowerCase() !== animalFilter.toLowerCase()) return;

      const records = cow.reproductionRecords || [];
      records.forEach(record => {
        if (record.pregnancyStatus) return; // already checked

        const baseDate = record.aiDate || record.heatDate;
        if (!baseDate) return;

        const checkDate = new Date(baseDate);
        checkDate.setDate(checkDate.getDate() + 75);

        if (checkDate <= today) {
          alerts.push({
            cowId: cow.id,
            cowName: cow.name || cow.tagNo,
            heatDate: record.heatDate,
            aiDate: record.aiDate,
            status: "Pending Check",
            recordId: record.id
          });
        }
      });
    });
    return alerts;
  }, [cows, animalFilter, today]);

  const careForDeliveryAlerts = useMemo(() => {
    const alerts = [];
    cows.forEach(cow => {
      const cType = cow.animalType || "Cow";
      if (animalFilter !== "All Animals" && cType.toLowerCase() !== animalFilter.toLowerCase()) return;

      const records = cow.reproductionRecords || [];
      records.forEach(record => {
        if (record.pregnancyStatus !== "Positive") return;

        const baseDate = record.aiDate || record.heatDate;
        if (!baseDate) return;

        const alertDate = new Date(baseDate);
        alertDate.setDate(alertDate.getDate() + 225); // 7.5 months

        if (alertDate <= today) {
          alerts.push({
            cowId: cow.id,
            cowName: cow.name || cow.tagNo,
            aiDate: record.aiDate,
            deliveryDate: record.deliveryDate,
            status: record.pregnancyStatus,
            recordId: record.id
          });
        }
      });
    });
    return alerts;
  }, [cows, animalFilter, today]);

  const checkForHeatAlerts = useMemo(() => {
    const alerts = [];
    cows.forEach(cow => {
      const cType = cow.animalType || "Cow";
      if (animalFilter !== "All Animals" && cType.toLowerCase() !== animalFilter.toLowerCase()) return;

      const records = cow.reproductionRecords || [];
      records.forEach(record => {
        if (record.pregnancyStatus === "Negative") {
          alerts.push({
            cowId: cow.id,
            cowName: cow.name || cow.tagNo,
            regNo: cow.regNo || cow.tagNo,
            aiDate: record.aiDate || record.heatDate,
            status: record.pregnancyStatus,
            anotherHeatDate: record.expectedNextHeatDate || "-",
            recordId: record.id
          });
        }
      });
    });
    return alerts;
  }, [cows, animalFilter]);

  // Milk Drop specific state
  const [milkDropRows, setMilkDropRows] = useState([]);
  const [milkDropLoading, setMilkDropLoading] = useState(false);
  const [milkDropError, setMilkDropError] = useState("");
  const [milkDropThreshold, setMilkDropThreshold] = useState(
    () => Number(localStorage.getItem("milkDropThreshold") || 15)
  );
  const [thresholdInput, setThresholdInput] = useState(
    () => String(localStorage.getItem("milkDropThreshold") || "15")
  );
  const thresholdSaved = useRef(milkDropThreshold);

  // Vaccinations specific state
  const [vacName, setVacName] = useState("");
  const [vacTargetType, setVacTargetType] = useState("All Cows");
  const [vacTargetId, setVacTargetId] = useState("");
  const [vacWindowVal, setVacWindowVal] = useState("1");
  const [vacWindowUnit, setVacWindowUnit] = useState("Year");
  const [vacRemarks, setVacRemarks] = useState("");
  const [vacSchedules, setVacSchedules] = useState(() => {
    const saved = localStorage.getItem("vacSchedules");
    return saved ? JSON.parse(saved) : [];
  });

  const handleScheduleVaccine = () => {
    if (!vacName) return;
    const newSchedule = {
      id: Date.now(),
      name: vacName,
      window: `${vacWindowVal} ${vacWindowUnit}`,
      target: vacTargetType === "Single Cow" ? `Cow ID: ${vacTargetId}` : vacTargetType,
      remarks: vacRemarks,
      active: true,
    };
    const updated = [...vacSchedules, newSchedule];
    setVacSchedules(updated);
    localStorage.setItem("vacSchedules", JSON.stringify(updated));
    setVacName("");
    setVacTargetId("");
    setVacRemarks("");
  };

  const saveThreshold = () => {
    const val = Number(thresholdInput);
    if (!isNaN(val) && val > 0) {
      localStorage.setItem("milkDropThreshold", String(val));
      setMilkDropThreshold(val);
      thresholdSaved.current = val;
    }
  };

  const loadMilkDrop = async () => {
    setMilkDropLoading(true);
    setMilkDropError("");
    try {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const [cowsRes, todayRes, yestRes] = await Promise.all([
        api.get("/admin/cows"),
        api.get(`/admin/milk/daily?date=${todayStr}`),
        api.get(`/admin/milk/daily?date=${yesterdayStr}`),
      ]);

      const activeCows = (cowsRes.data || []).filter(c => c.status === "Active" && c.isActiveForMilk);
      const todayRecords = todayRes.data || [];
      const yestRecords = yestRes.data || [];

      // Include all active cows (same as Milk Entry list)
      const cowMap = {};
      activeCows.forEach((c) => {
        cowMap[c.id] = {
          cowId: c.id,
          cowName: c.name || c.tagNo || `Cow #${c.id}`,
          regNo: c.regNo || c.tagNo || "-",
          animalType: c.animalType || "Cow",
          previousMilk: null,
          currentMilk: null,
        };
      });

      yestRecords.forEach((r) => {
        if (cowMap[r.cowId]) {
          cowMap[r.cowId].previousMilk = r.totalMilk || null;
        }
      });
      todayRecords.forEach((r) => {
        if (cowMap[r.cowId]) {
          cowMap[r.cowId].currentMilk = r.totalMilk || null;
        }
      });

      let rows = Object.values(cowMap);

      // Filter by animal type
      if (animalFilter !== "All Animals") {
        rows = rows.filter(
          (r) => (r.animalType || "").toLowerCase() === animalFilter.toLowerCase()
        );
      }

      // Compute drop% for each
      rows = rows.map((r) => {
        let dropPercentage = null;
        if (r.previousMilk !== null && r.currentMilk !== null && r.previousMilk > 0) {
          dropPercentage = ((r.previousMilk - r.currentMilk) / r.previousMilk) * 100;
        }
        return { ...r, dropPercentage };
      });

      // Sort: highest drop first
      rows.sort((a, b) => {
        if (a.dropPercentage === null) return 1;
        if (b.dropPercentage === null) return -1;
        return b.dropPercentage - a.dropPercentage;
      });

      setMilkDropRows(rows);
    } catch {
      setMilkDropError("Failed to load milk records.");
    } finally {
      setMilkDropLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "Milk Drop") {
      loadMilkDrop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, animalFilter]);

  const handleTreatmentClick = (row) => {
    onClose();
    navigate("/admin/cow-treatment", {
      state: {
        prefill: {
          cowId: row.cowId,
          cowName: row.cowName,
          animalType: row.animalType || "Cow",
          previousMilk: row.previousMilk,
          currentMilk: row.currentMilk,
          dropPercentage: row.dropPercentage,
          threshold: milkDropThreshold,
        },
      },
    });
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#fff", borderRadius: "12px",
          width: "100%", maxWidth: "860px",
          maxHeight: "88vh", display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          overflow: "hidden", margin: "auto"
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: "#2e6f40", color: "#fff",
            padding: "18px 24px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>🔔 Farm Alerts</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "#fff",
              fontSize: "22px", cursor: "pointer", lineHeight: 1, padding: "2px 6px",
            }}
          >×</button>
        </div>

        {/* Animal Filter */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", color: "#64748b" }}>Filter by Animal Type:</span>
          <select
            value={animalFilter}
            onChange={(e) => setAnimalFilter(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", minWidth: "120px" }}
          >
            {ANIMAL_FILTER_OPTIONS.map((opt) => <option key={opt}>{opt}</option>)}
          </select>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            Showing alerts for {animalFilter === "All Animals" ? "all animals" : animalFilter.toLowerCase() + "s"}
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#fff", padding: "0 16px", overflowX: "auto", WebkitOverflowScrolling: "touch", maxWidth: "100%" }}>
          {ALERT_TABS.map((tab) => (
            <button key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                background: "transparent",
                border: "none",
                padding: "12px 16px",
                fontSize: "13px",
                fontWeight: 600,
                color: activeTab === tab ? "#2563eb" : "#64748b",
                borderBottom: activeTab === tab ? "2px solid #2563eb" : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px" }}>

          {/* ── MILK DROP TAB ── */}
          {activeTab === "Milk Drop" && (
            <div>
              {/* Threshold Setting Row */}
              <div
                style={{
                  background: "#f0fdf4", border: "1px solid #bbf7d0",
                  borderRadius: "8px", padding: "12px 16px",
                  display: "flex", alignItems: "center", gap: "12px",
                  marginBottom: "16px", flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: "13px", color: "#166534", fontWeight: 600 }}>
                  🎚️ Alert if drop (%):
                </span>
                <input
                  type="number"
                  min="1" max="100"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  style={{
                    width: "72px", border: "1px solid #86efac", borderRadius: "6px",
                    padding: "5px 8px", fontSize: "14px", fontWeight: 700, textAlign: "center",
                    background: "#fff",
                  }}
                />
                <button
                  type="button"
                  onClick={saveThreshold}
                  style={{
                    background: "#2e6f40", color: "#fff", border: "none",
                    borderRadius: "6px", padding: "5px 14px",
                    fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Save
                </button>
                <span style={{ fontSize: "11px", color: "#4ade80" }}>
                  Treatment shown when drop &gt; 0% and &lt; {milkDropThreshold}%
                </span>
                <button
                  type="button"
                  onClick={loadMilkDrop}
                  disabled={milkDropLoading}
                  style={{
                    marginLeft: "auto", background: "#eff6ff", color: "#1d4ed8",
                    border: "1px solid #bfdbfe", borderRadius: "6px",
                    padding: "5px 12px", fontSize: "12px", cursor: "pointer",
                  }}
                >
                  🔄 Refresh
                </button>
              </div>

              {/* Table */}
              {milkDropLoading ? (
                <p style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>Loading milk records…</p>
              ) : milkDropError ? (
                <p style={{ textAlign: "center", color: "#dc2626", padding: "2rem" }}>{milkDropError}</p>
              ) : milkDropRows.length === 0 ? (
                <p style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>No milk records found for today or yesterday.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        {["#", "Name", "Reg No", "Prev Milk (L)", "Today Milk (L)", "Drop %", "Action"].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 12px", textAlign: h === "#" ? "center" : "left",
                              fontWeight: 700, color: "#475569",
                              borderBottom: "2px solid #e2e8f0",
                            }}
                          >{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {milkDropRows.map((row, idx) => {
                        const drop = row.dropPercentage;
                        const hasCurrentMilk = row.currentMilk !== null;
                        const hasPreviousMilk = row.previousMilk !== null;

                        const showTreatment = drop !== null && drop > 0 && row.currentMilk < row.previousMilk && drop < milkDropThreshold;
                        let dropColor = "#16a34a";
                        if (!hasCurrentMilk || drop === null || drop === 0) dropColor = "#94a3b8";
                        else if (drop > 0) dropColor = showTreatment ? "#b45309" : "#dc2626";

                        return (
                          <tr
                            key={row.cowId}
                            style={{
                              borderBottom: "1px solid #f1f5f9",
                              background: showTreatment ? "#fff7ed" : idx % 2 === 0 ? "#fff" : "#fafafa",
                            }}
                          >
                            <td style={{ padding: "10px 12px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1e293b" }}>{row.cowName}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ background: "#e2e8f0", color: "#475569", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", fontWeight: 700 }}>
                                {row.regNo}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px", color: "#475569" }}>
                              {hasPreviousMilk && row.previousMilk > 0 ? `${row.previousMilk.toFixed(2)} L` : <span style={{ color: "#94a3b8" }}>—</span>}
                            </td>
                            <td style={{ padding: "10px 12px", color: "#475569" }}>
                              {hasCurrentMilk && row.currentMilk > 0 ? `${row.currentMilk.toFixed(2)} L` : <span style={{ color: "#94a3b8" }}>—</span>}
                            </td>
                            <td style={{ padding: "10px 12px", fontWeight: 700, color: dropColor }}>
                              {!hasCurrentMilk
                                ? <span style={{ color: "#94a3b8", fontSize: "11px" }}>No today record</span>
                                : !hasPreviousMilk
                                  ? <span style={{ color: "#94a3b8", fontSize: "11px" }}>No prev record</span>
                                  : drop === 0
                                    ? <span style={{ color: "#94a3b8" }}>0%</span>
                                    : drop < 0
                                      ? <span style={{ color: "#16a34a" }}>▲ {Math.abs(drop).toFixed(1)}% up</span>
                                      : `▼ ${drop.toFixed(1)}%`
                              }
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              {showTreatment ? (
                                <button type="button"
                                  onClick={() => navigate('/admin/cow-milk')} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
                                  Check Milk
                                </button>
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "11px" }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Legend */}
              {!milkDropLoading && milkDropRows.length > 0 && (
                <div style={{ marginTop: "14px", fontSize: "11px", color: "#94a3b8", display: "flex", gap: "18px", flexWrap: "wrap" }}>
                  <span>🟠 <b>Orange row</b>: drop &gt; 0 and &lt; {milkDropThreshold}% → Treatment recommended</span>
                  <span>▼ Drop% = (prev − today) / prev × 100</span>
                </div>
              )}
            </div>
          )}

          {/* ── VACCINATIONS TAB ── */}
          {activeTab === "Vaccinations" && (
            <div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="Vaccine name"
                  value={vacName}
                  onChange={(e) => setVacName(e.target.value)}
                  style={{ flex: 1, minWidth: "120px", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", fontSize: "13px" }}
                />
                <select
                  value={vacTargetType}
                  onChange={(e) => setVacTargetType(e.target.value)}
                  style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", fontSize: "13px", background: "#fff" }}
                >
                  <option>All Cows</option>
                  <option>Female Cows</option>
                  <option>Calf</option>
                  <option>Single Cow</option>
                </select>
                <input
                  type="text"
                  placeholder="CowId (Single only)"
                  value={vacTargetId}
                  onChange={(e) => setVacTargetId(e.target.value)}
                  disabled={vacTargetType !== "Single Cow"}
                  style={{ flex: 1, minWidth: "120px", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", fontSize: "13px", background: vacTargetType !== "Single Cow" ? "#f1f5f9" : "#fff" }}
                />
                <select
                  value={vacWindowVal}
                  onChange={(e) => setVacWindowVal(e.target.value)}
                  style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", fontSize: "13px", background: "#fff" }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => <option key={num}>{num}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Year"
                  value={vacWindowUnit}
                  onChange={(e) => setVacWindowUnit(e.target.value)}
                  style={{ width: "70px", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", fontSize: "13px" }}
                />
                <input
                  type="text"
                  placeholder="Remarks (optional)"
                  value={vacRemarks}
                  onChange={(e) => setVacRemarks(e.target.value)}
                  style={{ flex: 2, minWidth: "150px", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", fontSize: "13px" }}
                />
                <button
                  type="button"
                  onClick={handleScheduleVaccine}
                  style={{
                    background: "#2e6f40", color: "#fff", border: "none",
                    borderRadius: "6px", padding: "8px 16px",
                    fontSize: "13px", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Schedule
                </button>
              </div>

              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                Active schedules that include today are shown below every day until turned off.
              </p>

              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", border: "1px solid #e2e8f0" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["#", "Name", "Window", "Target", "Remarks", "Active", "Action"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px", textAlign: "left",
                            fontWeight: 700, color: "#475569",
                            borderRight: h !== "Action" ? "1px solid #e2e8f0" : "none"
                          }}
                        >{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vacSchedules.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                          No active schedules today.
                        </td>
                      </tr>
                    ) : (
                      vacSchedules.map((s, idx) => (
                        <tr key={s.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}>{idx + 1}</td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0", fontWeight: 600 }}>{s.name}</td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}>{s.window}</td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}>{s.target}</td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}>{s.remarks || "-"}</td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}>
                            <span style={{ color: "#16a34a", fontWeight: 600 }}>Active</span>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <button onClick={() => navigate('/admin/treatment')} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
                              Log Vaccine
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── OTHER TABS (unchanged stubs) ── */}
          {activeTab !== "Milk Drop" && activeTab !== "Vaccinations" && activeTab !== "Pregnancy Check" && activeTab !== "Care For Delivery" && activeTab !== "Check for Heat" && (
            <div style={{ textAlign: "center", padding: "3rem 0", color: "#94a3b8" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
              <p style={{ fontSize: "15px", fontWeight: 600 }}>{activeTab}</p>
              <p style={{ fontSize: "13px" }}>No alerts configured for this category.</p>
            </div>
          )}

          {/* ── PREGNANCY CHECK TAB ── */}
          {activeTab === "Pregnancy Check" && (
            <div>
              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                Cows due for pregnancy check <b>2.5 months</b> (75 days) after AI/Heat date.
              </p>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", border: "1px solid #e2e8f0" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["#", "Cow", "Heat Date", "AI Date", "Status", "Action"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px", textAlign: "left",
                            fontWeight: 700, color: "#475569",
                            borderRight: h !== "Action" ? "1px solid #e2e8f0" : "none"
                          }}
                        >{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pregnancyCheckAlerts.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                          No due animals today.
                        </td>
                      </tr>
                    ) : (
                      pregnancyCheckAlerts.map((s, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}>{idx + 1}</td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0", fontWeight: 600 }}>{s.cowName}</td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}>{formatValue(s.heatDate)}</td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}>{formatValue(s.aiDate)}</td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}>
                            <span style={{ color: "#b45309", fontWeight: 600 }}>{s.status}</span>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <button onClick={() => navigate('/admin/manage-cows')} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
                              Update Status
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CHECK FOR HEAT TAB ── */}
          {activeTab === "Check for Heat" && (
            <div>
              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                Cows that failed pregnancy check and are check for heat.
              </p>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", border: "1px solid #e2e8f0" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["#", "Cow (Reg No)", "AI Date", "Status", "AnotherHeatDate", "Action"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px", textAlign: "left",
                            fontWeight: 700, color: "#475569",
                            borderRight: h !== "Action" ? "1px solid #e2e8f0" : "none"
                          }}
                        >{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {checkForHeatAlerts.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                          No animals found for heat check.
                        </td>
                      </tr>
                    ) : (
                      checkForHeatAlerts.map((s, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}>{idx + 1}</td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0", fontWeight: 600 }}>
                            {s.cowName} {s.regNo && `(${s.regNo})`}
                          </td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}>{formatValue(s.aiDate)}</td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}>
                            <span style={{ color: "#dc2626", fontWeight: 600 }}>{s.status}</span>
                          </td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0", fontWeight: 600 }}>{formatValue(s.anotherHeatDate)}</td>
                          <td style={{ padding: "12px" }}>
                            <button onClick={() => navigate('/admin/manage-cows', { state: { action: 'logHeat', cowId: s.cowId } })} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
                              Log Heat
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CARE FOR DELIVERY TAB ── */}
          {activeTab === "Care For Delivery" && (
            <div>
              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                Cows with AI dates from <b>7.5 months</b> ago that need delivery date entered.
              </p>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", border: "1px solid #e2e8f0" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["#", "Cow", "AI Date", "Delivery Date", "Pregnancy Status", "Action"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px", textAlign: "left",
                            fontWeight: 700, color: "#475569",
                            borderRight: h !== "Action" ? "1px solid #e2e8f0" : "none"
                          }}
                        >{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {careForDeliveryAlerts.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                          No animals need delivery date entered.
                        </td>
                      </tr>
                    ) : (
                      careForDeliveryAlerts.map((s, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}>{idx + 1}</td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0", fontWeight: 600 }}>{s.cowName}</td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}>{formatValue(s.aiDate)}</td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0", color: "#dc2626", fontWeight: 600 }}>{formatValue(s.deliveryDate)} (Expected)</td>
                          <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}>
                            <span style={{ color: "#16a34a", fontWeight: 600 }}>{s.status}</span>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <button onClick={() => navigate('/admin/manage-cows')} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
                              Log Delivery
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminData, setAdminData] = useState(JSON.parse(localStorage.getItem("adminData") || "{}"));
  const currentActive = getActiveKey(location.pathname);
  const [dashboard, setDashboard] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFarmAlerts, setShowFarmAlerts] = useState(false);
  const [cows, setCows] = useState([]);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({});
  const [message, setMessage] = useState("");
  const config = useMemo(() => configs[currentActive], [currentActive]);

  const roleName = (adminData?.customRole?.name || "").toLowerCase();
  const isUser = adminData?.role === "CUSTOM" && (roleName.includes("user") || (adminData?.name || "").toLowerCase().includes("user"));

  const loadDashboard = async () => {
    try {
      const dashboardRes = await api.get("/admin/dashboard");
      setDashboard(dashboardRes.data);
    } catch (err) {
      console.warn("Could not fetch dashboard stats", err);
    }
    try {
      const cowRes = await api.get("/admin/cows");
      setCows(cowRes.data);
    } catch (err) {
      console.warn("Could not fetch cows", err);
    }
  };

  const loadRecords = async (nextConfig) => {
    const res = await api.get(nextConfig.endpoint);
    setRecords(res.data);
  };

  useEffect(() => {
    if (!localStorage.getItem("adminToken")) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await api.get("/admin/auth/profile");
        if (res.data && res.data.admin) {
          localStorage.setItem("adminData", JSON.stringify(res.data.admin));
          setAdminData(res.data.admin);

          const roleName = res.data.admin?.customRole?.name?.toLowerCase() || "";
          if (roleName.includes("delivery") || roleName.includes("delever") || roleName.includes("milk") || res.data.admin?.permissions?.some(p => String(p).toLowerCase().includes("deliver"))) {
            navigate("/milk-admin/dashboard");
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile");
      }
    };

    const timer = window.setTimeout(() => {
      fetchProfile().then(() => {
        loadDashboard().catch(() => setMessage("Unable to load dashboard data"));
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!config) {
        setRecords([]);
        setMessage("");
        setForm({});
        return;
      }

      setRecords([]);
      setMessage("");
      setForm(config.initial || {});

      loadRecords(config).catch(() => setMessage("Unable to load records"));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [config]);



  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await api.post(config.endpoint, form);
      setForm(config.initial);
      await Promise.all([loadRecords(config), loadDashboard()]);
      setMessage(`${config.title} record saved`);
    } catch {
      setMessage("Please check the form and try again");
    }
  };

  const handleSection = (key) => {
    const nextPath = sectionByKey[key]?.path || "/admin/dashboard";
    navigate(nextPath);
    setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminData");
    navigate("/login");
  };

  const stats = dashboard?.stats || {};

  const getHeaderTitle = () => {
    if (currentActive === "add-feed") return "Feed Plan";
    if (currentActive === "add-intake") return "Food Intake";
    if (currentActive === "add-sold") return "Cow Sold";
    return sectionByKey[currentActive]?.label || "Admin Dashboard";
  };



  return (
    <div className="admin-shell">
      <AlertPopup />
      {showFarmAlerts && !isUser && (
        <FarmAlertsModal
          onClose={() => setShowFarmAlerts(false)}
          navigate={navigate}
          cows={cows}
        />
      )}
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h1>Cattle Manager</h1>
            <button className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)}>×</button>
          </div>
          <p>{adminData?.role === 'ADMIN' ? 'Admin' : (adminData?.name || 'Staff')} Dashboard</p>
        </div>
        <nav className="sidebar-nav">
          {sections.filter(section => {
            // Role creation should be admin only, or specific permission if implemented
            if (section.key === "roles") {
              return adminData?.role === "ADMIN";
            }
            if (section.key === "my-deliveries") {
              const rn = (adminData?.customRole?.name || "").toLowerCase();
              return hasPermission(adminData, "my-deliveries", "view") || rn.includes("delivery") || rn.includes("delever");
            }
            if (section.key === "delivery-boys") {
              return adminData?.role === "ADMIN";
            }
            if (section.key === "products" || section.key === "milk-requests") {
              return adminData?.role === "ADMIN" || (adminData?.role === "CUSTOM" && (adminData?.name?.toLowerCase().includes("user") || adminData?.customRole?.name?.toLowerCase().includes("user")));
            }
            return hasPermission(adminData, section.key, "view");
          }).map((section) => (
            <button
              key={section.key}
              className={
                currentActive === section.key ? "nav-item active" : "nav-item"
              }
              type="button"
              onClick={() => handleSection(section.key)}
            >
              {section.key === "milk" && adminData?.role === "CUSTOM" && (adminData?.name?.toLowerCase().includes("user") || adminData?.customRole?.name?.toLowerCase().includes("user")) ? (
                <>
                  <span>🛒</span>
                  Order Milk
                </>
              ) : (
                <>
                  <span>{section.icon}</span>
                  {section.label}
                </>
              )}
            </button>
          ))}
          <button className="nav-item" type="button" onClick={handleLogout}>
            <span>&gt;</span>
            Logout
          </button>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar" style={{ flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="mobile-menu-btn" style={{ fontSize: '32px', paddingBottom: '4px' }} onClick={() => setIsSidebarOpen(true)}>☰</button>
            <div>
              <h2>{getHeaderTitle()}</h2>
              <p>
                {adminData?.name
                  ? `Welcome, ${adminData.name}`
                  : "Farm records and activity"}
              </p>
            </div>
          </div>
          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <NotificationCenter />
            {!isUser && (
              <button type="button" onClick={() => setShowFarmAlerts(true)}>
                🔔 Farm Alerts
              </button>
            )}
            {adminData?.role === 'ADMIN' && (
              <button type="button" onClick={() => navigate("/milk-admin")} style={{ background: "#3b82f6", color: "white", border: "none", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 17l5-5-5-5M19.8 12H9M10 3H4v18h6" /></svg>
                Switch Account
              </button>
            )}
          </div>
        </header>

        <section className="admin-content">
          <SpecialAlertsBanner />
          {/* Access Control Check */}
          {(() => {
            const perms = adminData?.permissions || [];
            const isAdmin = adminData?.role === 'ADMIN';

            const permissionMap = {
              "add-feed": "feed",
              "add-intake": "intake",
              "add-sold": "sales",
              "cow-history": "cows",
              "add-milk": "milk",
              "edit-milk": "milk",
              "new-stock-adjustment": "stock",
              "stock-adjustments": "stock",
              "stock-update": "stock",
              "current-stock": "stock"
            };

            const requiredPermission = permissionMap[currentActive] || currentActive;

            let hasAccess = false;
            if (requiredPermission === "roles" || requiredPermission === "delivery-boys") {
              hasAccess = adminData?.role === "ADMIN";
            } else if (requiredPermission === "dashboard") {
              hasAccess = true;
            } else if (requiredPermission === "my-deliveries") {
              const rn = (adminData?.customRole?.name || "").toLowerCase();
              hasAccess = hasPermission(adminData, "my-deliveries", "view") || rn.includes("delivery") || rn.includes("delever");
            } else if (requiredPermission === "products" || requiredPermission === "milk-requests") {
              const isUser = adminData?.role === "CUSTOM" && (adminData?.name?.toLowerCase().includes("user") || adminData?.customRole?.name?.toLowerCase().includes("user"));
              hasAccess = adminData?.role === "ADMIN" || isUser || hasPermission(adminData, requiredPermission, "view");
            } else {
              hasAccess = hasPermission(adminData, requiredPermission, "view");
            }

            if (!hasAccess) {
              return (
                <div style={{ padding: "40px", textAlign: "center" }}>
                  <h2 style={{ color: "#dc2626" }}>Access Denied</h2>
                  <p>You do not have permission to view this module. Please contact the administrator.</p>
                </div>
              );
            }

            return (
              <>
                {currentActive === "dashboard" && (
                  <div className="stat-grid">
                    <article className="stat-card">
                      <span>{uiIcons.cows}</span>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                        <strong>{stats.totalCows || 0}</strong>
                        <p style={{ marginBottom: "2px" }}>Total Cattle</p>
                        <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap", marginTop: "4px" }}>
                          ({stats.cowCount || 0} Cows, {stats.buffaloCount || 0} Buffalos)
                        </div>
                      </div>
                    </article>
                    <article className="stat-card amber">
                      <span>{uiIcons.milk}</span>
                      <div>
                        <strong>{Number(stats.milkToday || 0).toFixed(2)} L</strong>
                        <p>Milk Production Today</p>
                      </div>
                    </article>
                    <article className="stat-card blue">
                      <span>{uiIcons.stock}</span>
                      <div>
                        <strong>{stats.lowStock || 0}</strong>
                        <p>Low Stock Items</p>
                      </div>
                    </article>
                    <article className="stat-card red">
                      <span>{uiIcons.treatments}</span>
                      <div>
                        <strong>{stats.activeTreatments || 0}</strong>
                        <p>Treatment Records</p>
                      </div>
                    </article>
                  </div>
                )}

                {currentActive === "dashboard" && (
                  <section className="panel">
                    <div className="panel-heading">
                      <h3>Quick Actions</h3>
                    </div>
                    <div className="quick-grid">
                      {quickActions.filter(([key]) => {
                        return hasPermission(adminData, key, "view");
                      }).map(([key, label, icon]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleSection(key)}
                        >
                          <span>{icon}</span>
                          {label}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {currentActive === "cows" && <ManageCows onChanged={loadDashboard} />}
                {currentActive === "deaths" && <CowDeath onChanged={loadDashboard} />}
                {currentActive === "feed" && <FeedPlan />}
                {currentActive === "add-feed" && <AddFeedPlan onChanged={loadDashboard} />}
                {currentActive === "intake" && <FoodIntake />}
                {currentActive === "add-intake" && <AddFoodIntake onChanged={loadDashboard} />}
                {currentActive === "sales" && <CowSold />}
                {currentActive === "add-sold" && <AddCowSold onChanged={loadDashboard} />}
                {currentActive === "cow-history" && <CowHistory />}
                {currentActive === "milk" && <CowMilk />}
                {currentActive === "add-milk" && <AddMilk />}
                {currentActive === "edit-milk" && <EditMilk />}
                {currentActive === "treatments" && (
                  <CowTreatment
                    prefillData={location.state?.prefill || null}
                    onChanged={loadDashboard}
                  />
                )}
                {currentActive === "stock" && <StockDashboard />}
                {currentActive === "current-stock" && <CurrentStock />}
                {currentActive === "stock-adjustments" && <StockAdjustments />}
                {currentActive === "new-stock-adjustment" && <ManualAdjustment />}
                {currentActive === "stock-update" && <StockUpdate />}
                {currentActive === "items" && <Items />}
                {currentActive === "orders" && <Orders />}
                {currentActive === "products" && <UserProducts />}
                {currentActive === "milk-requests" && <MilkDeliveryRequestsCustomer />}

                {currentActive === "reports" && <Report />}

                {currentActive === "alerts" && <AlertReports cows={cows} />}

                {currentActive === "staff-milk-report" && <StaffMilkReportEntry adminData={adminData} />}
                {currentActive === "my-deliveries" && <MyDeliveries />}
                {currentActive === "delivery-boys" && <DeliveryBoyManagement />}


                {config && (
                  <section className="data-layout">
                    {hasPermission(adminData, requiredPermission, "add") && (
                      <form className="record-form" onSubmit={handleSubmit}>
                        <h3>Add {config.title}</h3>

                        {config.fields.map(([name, label, type = "text"]) => (
                          <label key={name}>
                            {label}
                            {type === "cow" ? (
                              <select
                                value={form[name] || ""}
                                onChange={(event) =>
                                  setForm({ ...form, [name]: event.target.value })
                                }
                                required
                              >
                                <option value="">Select cow</option>
                                {cows.map((cow) => (
                                  <option key={cow.id} value={cow.id}>
                                    {cow.regNo || cow.tagNo} - {cow.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={type}
                                value={form[name] || ""}
                                onChange={(event) =>
                                  setForm({ ...form, [name]: event.target.value })
                                }
                                required={!optionalFields.includes(name)}
                              />
                            )}
                          </label>
                        ))}
                        <button type="submit">Save Record</button>
                        {message && <p className="form-message">{message}</p>}
                      </form>
                    )}

                    <section className="records-panel">
                      <div className="panel-heading">
                        <h3>{config.title} Records</h3>
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              {config.columns.map((column) => (
                                <th key={column}>{column.replace("cow.", "cow ")}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {records.map((record) => (
                              <tr key={record.id}>
                                {config.columns.map((column) => (
                                  <td key={column} data-label={column.replace("cow.", "cow ")}>
                                    {formatValue(getValue(record, column))}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {!records.length && (
                        <p className="empty-state">No records added yet.</p>
                      )}
                    </section>
                  </section>
                )}
              </>
            );
          })()}
        </section>

        <footer className="admin-footer">
          &copy; 2026 Codeniche Softstudio | {adminData?.role === 'ADMIN' ? 'Admin' : (adminData?.name || 'Staff')} Dashboard
        </footer>
      </main>
    </div>
  );
};

export default AdminDashboard;
