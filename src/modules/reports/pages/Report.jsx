import React, { useState, useEffect, useCallback, useMemo } from "react";
import "../../../css/Report.css";

import api from "../../../services/api";
import ExportButtons from "../../../components/ExportButtons";

// ---- Report type config -----------------------------------------------
// `cowWise: true` means the "Select Cow" dropdown will appear for that type.
// Add/remove/edit entries here to match your actual report types.
const REPORT_TYPES = [
    { value: "", label: "Select Report Type", cowWise: false },
    { value: "purchase", label: "Purchase Orders", cowWise: false },
    { value: "milk", label: "Milk Production", cowWise: true },
    { value: "treatment", label: "Treatment Records", cowWise: true },
    { value: "itemwise", label: "Item-wise Orders", cowWise: false },
    { value: "cowmilk", label: "Cow-wise Milk", cowWise: true },
    { value: "cowtreatment", label: "Cow-wise Treatment", cowWise: true },
];

// Titles shown on the generated-report page for each type
const REPORT_TITLES = {
    purchase: "Purchase Orders Report",
    milk: "Milk Production Report",
    treatment: "Treatment Records Report",
    itemwise: "Item-wise Orders Report",
    cowmilk: "Cow-wise Milk Report",
    cowtreatment: "Cow-wise Treatment Report",
};

// Convert yyyy-mm-dd (native <input type="date"> value) -> dd-mm-yyyy for display
function toDisplayDate(isoDate) {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}-${m}-${y}`;
}

export default function Report() {
    // ----- form state -----
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [reportType, setReportType] = useState("");
    const [selectedCow, setSelectedCow] = useState("all");
    const [cows, setCows] = useState([]); // Loaded from API

    // ----- page / result state -----
    const [view, setView] = useState("form"); // "form" | "report"
    const [reportData, setReportData] = useState(null); // { columns: [...], rows: [...], totalLabel, totalValue }
    const [loading, setLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [error, setError] = useState("");
    const [autoPrint, setAutoPrint] = useState(false); // true when "Download PDF" was clicked from the form

    // Fetch cows on mount
    useEffect(() => {
        api.get("/admin/cows")
            .then(res => setCows(res.data.map(c => c.name || c.tagNo)))
            .catch(err => console.error("Failed to load cows", err));
    }, []);

    // When we land on the report page because of the form's "Download PDF"
    // button, trigger the print dialog automatically once the table is rendered.
    useEffect(() => {
        if (view === "report" && autoPrint) {
            const t = setTimeout(() => {
                window.print();
                setAutoPrint(false);
            }, 150); // small delay so the table has painted before print
            return () => clearTimeout(t);
        }
    }, [view, autoPrint]);

    const currentType = REPORT_TYPES.find((r) => r.value === reportType);
    const showCowSelect = !!currentType?.cowWise;

    async function fetchReportData() {
        const queryParams = new URLSearchParams({
            type: reportType,
            from: fromDate,
            to: toDate,
        });
        if (showCowSelect && selectedCow !== "all") {
            queryParams.append("cowId", selectedCow);
        }
        
        const res = await api.get(`/admin/reports?${queryParams.toString()}`);
        let data = res.data;
        
        // Fix for reports where backend sends headers in the first row instead of columns
        if (!data.columns || data.columns.length === 0 || data.columns.every(c => !c || String(c).trim() === "")) {
            if (data.rows && data.rows.length > 0) {
                data.columns = data.rows[0];
                data.rows = data.rows.slice(1);
            } else {
                data.columns = [];
            }
        }
        
        return data;
    }

    function validateForm() {
        if (!fromDate || !toDate) {
            setError("Please select both From Date and To Date.");
            return false;
        }
        if (!reportType) {
            setError("Please select a Report Type.");
            return false;
        }
        setError("");
        return true;
    }

    // "Generate Report" on the form -> just opens the report page
    async function handleGenerateReport() {
        if (!validateForm()) return;
        setLoading(true);
        try {
            const data = await fetchReportData();
            setReportData(data);
            setView("report"); // navigate to the report page
        } catch (e) {
            setError("Could not generate the report. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    // "Download PDF" on the form -> generate, open report page, auto-print
    async function handleDirectDownload() {
        if (!validateForm()) return;
        setPdfLoading(true);
        try {
            const data = await fetchReportData();
            setReportData(data);
            setAutoPrint(true);
            setView("report");
        } catch (e) {
            setError("Could not generate the report. Please try again.");
        } finally {
            setPdfLoading(false);
        }
    }

    function handleDownloadPdf() {
        // Uses the browser's native print dialog -> "Save as PDF".
        // Only the .report-print-area is visible in print mode (see Report.css @media print).
        window.print();
    }

    function handleBack() {
        setView("form");
        setReportData(null);
        setError("");
    }

    // ---------------------------------------------------------------------
    // FORM VIEW
    // ---------------------------------------------------------------------
    if (view === "form") {
        return (
            <div className="report-card">
                <h2 className="report-card__title">Generate Reports</h2>

                <div className="report-form-grid">
                    <div className="report-field">
                        <label>From Date</label>
                        <input
                            type="date"
                            value={fromDate}
                            max={toDate || undefined}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>

                    <div className="report-field">
                        <label>To Date</label>
                        <input
                            type="date"
                            value={toDate}
                            min={fromDate || undefined}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>

                    <div className="report-field">
                        <label>Report Type</label>
                        <select
                            value={reportType}
                            onChange={(e) => {
                                setReportType(e.target.value);
                                setSelectedCow("all");
                            }}
                        >
                            {REPORT_TYPES.map((rt) => (
                                <option key={rt.value} value={rt.value}>
                                    {rt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {showCowSelect && (
                        <div className="report-field">
                            <label>Select Cow</label>
                            <select
                                value={selectedCow}
                                onChange={(e) => setSelectedCow(e.target.value)}
                            >
                                <option value="all">All Cows</option>
                                {cows.map((cow) => (
                                    <option key={cow} value={cow}>
                                        {cow}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {error && <div className="report-error">{error}</div>}

                <div className="report-actions">
                    <button
                        className="btn btn--primary"
                        onClick={handleGenerateReport}
                        disabled={loading || pdfLoading}
                    >
                        {loading ? "Generating..." : "📊 Generate Report"}
                    </button>
                    
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------------
    // REPORT (RESULT) VIEW
    // ---------------------------------------------------------------------
    return (
        <div className="report-result" style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden", boxSizing: "border-box" }}>
            <div className="report-result__header no-print" style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}>
                <h2 style={{ minWidth: 0, wordBreak: "break-word", whiteSpace: "normal" }}>
                    {reportType === "milk" || reportType === "cowmilk" ? "🥛 " : "📋 "}
                    {REPORT_TITLES[reportType] || "Report"}
                </h2>
                <div className="report-result__actions" style={{ maxWidth: "100%", minWidth: 0, boxSizing: "border-box" }}>
                    <button onClick={handleBack} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="16" width="16" xmlns="http://www.w3.org/2000/svg"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
  Back
</button>
                    <ExportButtons tableId="report-generated-table" filename={`Report_${reportType}_${fromDate}_to_${toDate}`} title={REPORT_TITLES[reportType] || "Report"} />
                </div>
            </div>

            <div className="report-print-area" style={{ width: "100%", minWidth: 0, boxSizing: "border-box", overflowX: "hidden" }}>
                <h2 className="print-only-title">
                    {REPORT_TITLES[reportType] || "Report"}
                </h2>

                <div className="report-period" style={{ wordBreak: "break-word" }}>
                    <strong>Period:</strong> {toDisplayDate(fromDate)} to {toDisplayDate(toDate)}
                    {showCowSelect && selectedCow !== "all" && (
                        <>
                            {" "}
                            &nbsp;|&nbsp; <strong>Cow:</strong> {selectedCow}
                        </>
                    )}
                </div>

                <div className="report-table-wrapper">
                    <table id="report-generated-table" className="report-table">
                        <thead>
                        <tr>
                            {reportData.columns.map((col) => (
                                <th key={col}>{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.rows.map((row, i) => (
                            <tr key={i}>
                                {row.map((cell, j) => (
                                    <td key={j} data-label={reportData.columns[j]}>{cell}</td>
                                ))}
                            </tr>
                        ))}
                        {reportData.rows.length === 0 && (
                            <tr>
                                <td colSpan={reportData.columns.length} className="report-empty">
                                    No records found for the selected period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {reportData.rows.length > 0 &&
                        ((reportData.totalLabel && String(reportData.totalLabel).trim().length > 0) ||
                         (reportData.totalValue && String(reportData.totalValue).trim().length > 0)) && (
                        <tfoot>
                            <tr className="report-total-row">
                                <td colSpan={reportData.columns.length - 1}>
                                    {reportData.totalLabel}
                                </td>
                                <td>{reportData.totalValue}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
                </div>
            </div>
        </div>
    );
}