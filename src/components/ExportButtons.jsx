import React from "react";
import { exportTableToExcel, exportTableToPDF } from "../utils/exportUtils";

const ExportButtons = ({ tableId, filename, title }) => {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <button
        type="button"
        onClick={() => exportTableToExcel(tableId, filename)}
        style={{
          background: "#10b981",
          color: "#fff",
          border: "none",
          padding: "8px 12px",
          borderRadius: "6px",
          fontWeight: 600,
          cursor: "pointer",
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          gap: "6px"
        }}
      >
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 1024 1024" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M685.2 148.7l-96.2 32v292h142.2v-292l-46-32zM731.2 506.7h-142.2v292l96.2 32 46-32v-292zM855.2 248.7h-86v224h86v-224zM855.2 540.7h-86v224h86v-224zM532.2 116.7h-362c-17.7 0-32 14.3-32 32v726c0 17.7 14.3 32 32 32h362c17.7 0 32-14.3 32-32v-726c0-17.7-14.3-32-32-32z m-160 520.6l-50.6-97.1h-2.3l-50.3 97.1h-56.1l78.8-136.5-73.6-126.7h55.2l46.2 90.7h2.3l47.1-90.7h55.1l-75 127.3 78.5 135.9h-55.3z"></path></svg>
        Excel
      </button>
      <button
        type="button"
        onClick={() => exportTableToPDF(tableId, filename, title)}
        style={{
          background: "#ef4444",
          color: "#fff",
          border: "none",
          padding: "8px 12px",
          borderRadius: "6px",
          fontWeight: 600,
          cursor: "pointer",
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          gap: "6px"
        }}
      >
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 1024 1024" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M531.3 574.4l.3-1.4c5.8-23.9 13.1-53.7 7.4-80.7-3.8-21.3-19.5-29.6-32.9-30.2-15.8-.7-29.9 8.3-33.4 21.4-6.6 24-.7 56.8 10.1 98.6-13.6 32.4-35.3 79.5-51.2 107.5-29.6 15.3-69.3 38.9-75.2 68.7-1.2 5.5.2 12.5 3.5 18.8 3.7 7 9.6 12.4 16.5 15 3 1.1 6.6 2 10.8 2 17.6 0 46.1-14.2 84.1-79.4 58-19.2 114.2-34.1 157.9-42.7 7.6 1.7 15.2 3.4 22.7 4.5 30.1 4.9 59.2 2.8 74.3-5.4 10.7-5.8 11.6-16 11-20.3-1.9-12.6-15.7-18.7-27.4-20.6-19.1-3.2-46.7 1.8-78.4 14.2zm-225 152.9c-4.4-4-1.5-12.8 4.2-22.1 12.8-21 34.6-35.6 52.8-43.9-9.9 29.5-31.5 54.3-57 66zM469 486.2c4.1-13.7 9-17 12.1-17 1.3 0 5.2.2 6.5 7.1 2 10.7-1.4 33-7.5 54.3-4-15.5-8.4-30.5-11.1-44.4zm164.7 101.4c-13.2-1.3-27.2-3.7-41-7.2 20.3-7.8 42-13.9 59.9-17.7 17.1 5.3 32.5 12.1 32.5 12.1 2.4 1.1 2.3 4.2 1.9 5-.5.7-4.1 8.8-13.3 7.8zm819.3-125.7H940v-166c0-4.4-3.6-8-8-8h-74v174h-92v-174h-74v174h-92v-174h-74v174H364v-174h-74v174h-92v-174h-74v174h-92v-174h-74v468h74v-174h92v174h74v-174h92v174h74v-174h92v174h74v-174h92v174h74v-174h92v174h74c4.4 0 8-3.6 8-8v-294z m-413.3 58h-92v-58h92v58zm166 0h-92v-58h92v58z"></path></svg>
        PDF
      </button>
    </div>
  );
};

export default ExportButtons;
