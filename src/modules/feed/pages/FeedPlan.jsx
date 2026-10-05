import { useState, useCallback } from "react";
import api from "../../../services/api";
import ExportButtons from "../../../components/ExportButtons";

const ANIMAL_TYPES = ["All", "Cow", "Buffalo", "Goat", "Sheep", "Other"];

const fmt = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

const isoDate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString().split("T")[0];
};

const FeedPlan = () => {
  const today = isoDate(new Date());

  const [feedDate, setFeedDate] = useState(today);
  const [animalType, setAnimalType] = useState("All");
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [noDataMsg, setNoDataMsg] = useState("");

  const fetchPlan = useCallback(async (dateStr, type) => {
    setLoading(true);
    setNoDataMsg("");
    setPlans([]);
    try {
      const params = new URLSearchParams({ date: dateStr });
      if (type && type !== "All") params.append("animalType", type);
      const res = await api.get(`/admin/milk/feed-plan?${params}`);
      setPlans(res.data || []);
      setGenerated(true);
      if (!res.data?.length) {
        setNoDataMsg(`No feed plan data found for this date. Generate milk entry for the previous day first.`);
      }
    } catch {
      setNoDataMsg("Failed to load. Please try again.");
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const shiftDate = (days) => {
    const d = new Date(feedDate);
    d.setDate(d.getDate() + days);
    const newDate = isoDate(d);
    setFeedDate(newDate);
    fetchPlan(newDate, animalType);
  };

  return (
    <section className="cattle-page">
      <section className="cattle-toolbar">
        <h3>Feed Plan</h3>
        <div className="cattle-toolbar-actions">
          <select
            value={animalType}
            onChange={(e) => setAnimalType(e.target.value)}
          >
            {ANIMAL_TYPES.map((t) => (
              <option key={t} value={t}>{t === "All" ? "All Animals" : t}</option>
            ))}
          </select>
          <input
            type="date"
            value={feedDate}
            onChange={(e) => setFeedDate(e.target.value)}
          />
          <button
            type="button"
            className="primary"
            onClick={() => fetchPlan(feedDate, animalType)}
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate Feed Plan"}
          </button>
          <ExportButtons tableId="feed-plan-table" filename="Feed_Plan" title="Daily Feed Plan" />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const d = new Date(feedDate);
              d.setDate(d.getDate() + 1);
              const nextDay = d.toISOString().slice(0, 10);
              setFeedDate(nextDay);
              fetchPlan(nextDay, animalType);
            }}
            disabled={loading}
          >
            Generate Next Day &rarr;
          </button>
        </div>
      </section>

      {generated && noDataMsg && (
        <div style={{ marginBottom: "16px", padding: "12px", background: "#fffbeb", color: "#92400e", borderRadius: "8px", border: "1px solid #fde68a" }}>
          ⚠️ {noDataMsg}
        </div>
      )}

      <section className="cattle-table-card">
        <div className="table-wrap">
          <table id="feed-plan-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Animal Name</th>
                <th>Reg / Tag</th>
                <th>Milk Date</th>
                <th>Total Milk (L)</th>
                <th>Feed Date</th>
                <th>Required Food (Kg)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>
                    ⏳ Generating feed plan...
                  </td>
                </tr>
              ) : !generated ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>
                    Select a date and click Generate Feed Plan.
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
                    No feed records found for this date.
                  </td>
                </tr>
              ) : (
                plans.map((plan, i) => (
                  <tr key={`${plan.cowId}-${i}`}>
                    <td data-label="#">{i + 1}</td>
                    <td data-label="Animal Name">{plan.cowName} ({plan.animalType})</td>
                    <td data-label="Reg / Tag">{plan.regNo}</td>
                    <td data-label="Milk Date">{fmt(plan.milkDate)}</td>
                    <td data-label="Total Milk (L)"><strong>{plan.totalMilk} L</strong></td>
                    <td data-label="Feed Date">{fmt(plan.feedDate)}</td>
                    <td data-label="Required Food (Kg)"><strong>{plan.requiredFood} Kg</strong></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};

export default FeedPlan;
