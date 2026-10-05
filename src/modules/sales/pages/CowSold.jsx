import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useConfirm } from "../../../context/ConfirmContext";
import { hasPermission } from "../../../utils/permissions";
import ExportButtons from "../../../components/ExportButtons";

const CowSold = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [animalFilter, setAnimalFilter] = useState("All Animals");
  const { confirm, customAlert } = useConfirm();

  const adminData = JSON.parse(localStorage.getItem("adminData") || "{}");
  const canAdd = hasPermission(adminData, "sales", "add");
  const canEdit = hasPermission(adminData, "sales", "edit");
  const canDelete = hasPermission(adminData, "sales", "delete");

  const loadSales = async () => {
    try {
      const res = await api.get("/admin/sold-cows");
      setSales(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const handleDeleteSale = async (saleId) => {
    const isConfirmed = await confirm("Are you sure you want to delete this sale record? The animal will be marked as Active again.");
    if (!isConfirmed) return;
    try {
      await api.delete(`/admin/sold-cows/${saleId}`);
      loadSales();
    } catch (error) {
      console.error("Failed to delete sale", error);
      customAlert("Failed to delete sale record");
    }
  };

  const animalTypes = [...new Set(sales.map(s => s.cow?.animalType).filter(Boolean))];

  const filteredSales = sales.filter((s) => {
    return animalFilter === "All Animals" || s.cow?.animalType === animalFilter;
  });

  const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString();
  };



  return (
    <div className="cattle-page">
      <div className="cattle-toolbar">
        <div>
          <h3>Sold Cows</h3>
          <p className="text-text-secondary text-sm mt-1 mb-0">Manage all sold animals and their sales records</p>
        </div>
        
        <div className="cattle-toolbar-actions">
          <select 
            value={animalFilter} 
            onChange={(e) => setAnimalFilter(e.target.value)}
          >
            <option value="All Animals">All Animals</option>
            {animalTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <ExportButtons tableId="sold-cows-table" filename="Sold_Cows" title="Sold Cows" />
          {canAdd && (
            <button 
              className="primary"
              onClick={() => navigate("/admin/cow-sold/add")}
            >
              + Sell Cow
            </button>
          )}
        </div>
      </div>
      
      <div className="cattle-table-card">
        <div className="table-wrap">
          <table id="sold-cows-table">
            <thead>
              <tr>
                <th>Sr No</th>
                <th>Animal Name</th>
                <th>Type</th>
                <th>Breed</th>
                <th>Tag / Reg No</th>
                <th>Sale Date</th>
                <th>Buyer Name</th>
                <th>Sale Price</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale, index) => (
                <tr key={sale.id}>
                  <td data-label="Sr No">{index + 1}</td>
                  <td data-label="Animal Name">
                    <strong>{sale.cow?.name}</strong>
                  </td>
                  <td data-label="Type">{sale.cow?.animalType}</td>
                  <td data-label="Breed">{sale.cow?.breed}</td>
                  <td data-label="Tag / Reg No">{sale.cow?.tagNo || sale.cow?.regNo}</td>
                  <td data-label="Sale Date">{formatDate(sale.soldAt)}</td>
                  <td data-label="Buyer Name">{sale.buyer}</td>
                  <td data-label="Sale Price">₹{sale.amount}</td>
                  <td data-label="Action">
                     <div className="row-actions">
                       <button className="icon-action view" title="View History" onClick={() => navigate(`/admin/cow-history/${sale.cowId}`)}>
                          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                       </button>
                       {canEdit && (
                         <button className="icon-action edit" title="Edit Sale" onClick={() => customAlert("Edit sale functionality coming soon!")}>
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="16" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                         </button>
                       )}
                       {canDelete && (
                         <button className="icon-action delete" title="Delete Sale" onClick={() => handleDeleteSale(sale.id)}>
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="16" width="16" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                         </button>
                       )}
                     </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan="9" className="empty-state">
                    No sold cows found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CowSold;
