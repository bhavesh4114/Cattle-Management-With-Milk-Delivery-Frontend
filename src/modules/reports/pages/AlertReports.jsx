import React, { useState } from "react";
import ExportButtons from "../../../components/ExportButtons";

const AlertReports = ({ cows = [] }) => {
  const today = new Date();
  const past = new Date();
  past.setMonth(past.getMonth() - 1);
  const formatDateStr = (d) => d.toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(formatDateStr(past));
  const [toDate, setToDate] = useState(formatDateStr(today));
  const [alertType, setAlertType] = useState("All Alerts");
  const [animalType, setAnimalType] = useState("All Animals");

  const alerts = React.useMemo(() => {
    let allAlerts = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    cows.forEach(cow => {
      const cType = cow.animalType || "Cow";
      if (animalType !== "All Animals" && cType.toLowerCase() !== animalType.toLowerCase()) return;

      const records = cow.reproductionRecords || [];
      records.forEach(record => {
        // Pregnancy Check
        if (!record.pregnancyStatus) {
          const baseDate = record.aiDate || record.heatDate;
          if (baseDate) {
            const checkDate = new Date(baseDate);
            checkDate.setDate(checkDate.getDate() + 75);
            if (checkDate <= today) {
              allAlerts.push({
                type: "Pregnancy Check",
                animal: cType,
                cowId: cow.regNo || cow.tagNo || cow.id,
                name: cow.name || cow.tagNo,
                rawDate: checkDate,
                alertDate: checkDate.toLocaleDateString(),
                status: "Pending Check",
                details: "Needs pregnancy check"
              });
            }
          }
        }

        // Care for delivery
        if (record.pregnancyStatus === "Positive") {
          const baseDate = record.aiDate || record.heatDate;
          if (baseDate) {
            const alertDate = new Date(baseDate);
            alertDate.setDate(alertDate.getDate() + 225);
            if (alertDate <= today) {
              allAlerts.push({
                type: "Care For Delivery",
                animal: cType,
                cowId: cow.regNo || cow.tagNo || cow.id,
                name: cow.name || cow.tagNo,
                rawDate: alertDate,
                alertDate: alertDate.toLocaleDateString(),
                status: record.pregnancyStatus,
                details: "Delivery care needed"
              });
            }
          }
        }

        // Check for Heat
        if (record.pregnancyStatus === "Negative") {
          const rawAlertDate = new Date(record.expectedNextHeatDate || record.aiDate || record.heatDate);
          allAlerts.push({
            type: "Check for Heat",
            animal: cType,
            cowId: cow.regNo || cow.tagNo || cow.id,
            name: cow.name || cow.tagNo,
            rawDate: rawAlertDate,
            alertDate: rawAlertDate.toLocaleDateString(),
            status: record.pregnancyStatus,
            details: "Failed pregnancy, monitor heat"
          });
        }
      });
    });

    // Vaccinations
    const savedSchedules = localStorage.getItem("vacSchedules");
    if (savedSchedules) {
      try {
        const vacSchedules = JSON.parse(savedSchedules);
        vacSchedules.forEach(schedule => {
          if (schedule.active) {
            let animal = "All Animals";
            let cowName = schedule.name;
            if (schedule.target.startsWith("Cow ID:")) {
              const cId = schedule.target.replace("Cow ID:", "").trim();
              const foundCow = cows.find(c => c.id.toString() === cId || c.tagNo === cId);
              if (foundCow) {
                animal = foundCow.animalType || "Cow";
                cowName = `${schedule.name} - ${foundCow.name || foundCow.tagNo}`;
              } else {
                 animal = "Cow";
              }
            } else {
              animal = schedule.target === "All Cows" ? "All Animals" : schedule.target;
            }
            
            if (animalType !== "All Animals" && animal !== "All Animals" && animal.toLowerCase() !== animalType.toLowerCase()) {
               return; 
            }

            allAlerts.push({
              type: "Vaccinations",
              animal: animal,
              cowId: schedule.target,
              name: cowName,
              rawDate: today,
              alertDate: today.toLocaleDateString(),
              status: "Active",
              details: `Window: ${schedule.window} ${schedule.remarks ? '| ' + schedule.remarks : ''}`
            });
          }
        });
      } catch (e) {}
    }

    if (alertType !== "All Alerts") {
      allAlerts = allAlerts.filter(a => a.type === alertType);
    }

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      
      allAlerts = allAlerts.filter(a => {
        const d = new Date(a.rawDate);
        return d >= from && d <= to;
      });
    }

    return allAlerts;
  }, [cows, animalType, alertType, fromDate, toDate]);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: "16px", background: "#f8fafc", minHeight: "calc(100vh - 100px)" }}>
      {/* Page Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="24" width="24" style={{ color: "#1e293b" }}><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z"></path></svg>
        <h2 style={{ margin: 0, color: "#1e293b", fontSize: "20px", fontWeight: "700" }}>Alert Reports</h2>
      </div>

      {/* Report Filters */}
      <div style={{ background: "#fff", borderRadius: "8px", padding: "20px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#1e293b", fontWeight: "600" }}>Report Filters</h3>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
          {/* From Date */}
          <div style={{ flex: "1 1 130px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#64748b", marginBottom: "6px", fontWeight: "500" }}>From Date</label>
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* To Date */}
          <div style={{ flex: "1 1 130px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#64748b", marginBottom: "6px", fontWeight: "500" }}>To Date</label>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Alert Type */}
          <div style={{ flex: "1 1 130px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#64748b", marginBottom: "6px", fontWeight: "500" }}>Alert Type</label>
            <select 
              value={alertType}
              onChange={(e) => setAlertType(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "#fff" }}
            >
              <option>All Alerts</option>
              <option>Milk Drop</option>
              <option>Check for Heat</option>
              <option>Pregnancy Check</option>
              <option>Vaccinations</option>
            </select>
          </div>

          {/* Animal Type */}
          <div style={{ flex: "1 1 130px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#64748b", marginBottom: "6px", fontWeight: "500" }}>Animal Type</label>
            <select 
              value={animalType}
              onChange={(e) => setAnimalType(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "#fff" }}
            >
              <option>All Animals</option>
              <option>Cow</option>
              <option>Buffalo</option>
            </select>
          </div>

          {/* Generate Button */}
          <div style={{ flex: "1 1 100px" }}>
            <button 
              type="button"
              style={{ 
                width: "100%", background: "#2e6f40", color: "#fff", border: "none", 
                padding: "9px 16px", borderRadius: "6px", fontSize: "14px", 
                fontWeight: "600", cursor: "pointer", display: "flex", 
                alignItems: "center", justifyContent: "center", gap: "8px"
              }}
            >
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="16" width="16"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>
              Generate
            </button>
          </div>
        </div>
      </div>

      {/* Alert Details */}
      <div className="cattle-table-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#1e293b", fontWeight: "600" }}>Alert Details</h3>
          
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <ExportButtons tableId="alert-reports-table" filename="Alert_Reports" title="Alert Details" />
          </div>
        </div>

        <div className="table-wrap">
          <table id="alert-reports-table">
            <thead>
              <tr>
                {["#", "Alert Type", "Animal", "Cow ID", "Name", "Alert Date", "Status", "Details"].map((th) => (
                  <th key={th}>{th}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state">
                    No alerts found.
                  </td>
                </tr>
              ) : (
                alerts.map((alert, idx) => (
                  <tr key={idx}>
                    <td data-label="#">{idx + 1}</td>
                    <td data-label="Alert Type"><strong>{alert.type}</strong></td>
                    <td data-label="Animal">{alert.animal}</td>
                    <td data-label="Cow ID">{alert.cowId}</td>
                    <td data-label="Name">{alert.name}</td>
                    <td data-label="Alert Date">{alert.alertDate}</td>
                    <td data-label="Status">
                      <span style={{ 
                        color: alert.status === "Negative" ? "#dc2626" : alert.status === "Positive" ? "#16a34a" : "#ca8a04", 
                        fontWeight: "600" 
                      }}>{alert.status}</span>
                    </td>
                    <td data-label="Details">{alert.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AlertReports;
