import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const parseTableData = (tableId) => {
  const table = document.getElementById(tableId);
  if (!table) return null;

  const head = [];
  const body = [];
  let actionColIndex = -1;

  // Parse header
  const thead = table.querySelector("thead");
  if (thead) {
    const trs = thead.querySelectorAll("tr");
    trs.forEach(tr => {
      const rowData = [];
      tr.querySelectorAll("th").forEach((th, index) => {
        const text = (th.innerText || th.textContent || "").trim();
        if (text.toLowerCase() === "action" || text.toLowerCase() === "actions") {
          actionColIndex = index;
        } else {
          rowData.push(text);
        }
      });
      head.push(rowData);
    });
  }

  // Parse body
  const tbody = table.querySelector("tbody");
  if (tbody) {
    const trs = tbody.querySelectorAll("tr");
    trs.forEach(tr => {
      const rowData = [];
      tr.querySelectorAll("td").forEach((td, index) => {
        if (index !== actionColIndex) {
          rowData.push((td.innerText || td.textContent || "").trim());
        }
      });
      // only add row if it has data
      if (rowData.length > 0) {
        body.push(rowData);
      }
    });
  }

  return { head, body };
};

export const exportTableToExcel = (tableId, filename = "ExportData") => {
  const data = parseTableData(tableId);
  if (!data) {
    console.error(`Table with id "${tableId}" not found.`);
    return;
  }

  try {
    const ws = XLSX.utils.aoa_to_sheet([...data.head, ...data.body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (err) {
    console.error("Excel Export Error:", err);
  }
};

export const exportTableToPDF = (tableId, filename = "ExportData", title = "Exported Data") => {
  const data = parseTableData(tableId);
  if (!data) {
    console.error(`Table with id "${tableId}" not found.`);
    return;
  }

  try {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    
    autoTable(doc, {
      head: data.head.length > 0 ? [data.head[0]] : [],
      body: data.body,
      startY: 25,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [46, 111, 64],
        textColor: 255,
        fontStyle: 'bold'
      }
    });

    doc.save(`${filename}.pdf`);
  } catch (err) {
    console.error("PDF Export Error:", err);
  }
};
