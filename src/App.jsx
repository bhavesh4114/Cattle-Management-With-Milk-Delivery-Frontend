import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminLogin from "./modules/auth/pages/AdminLogin";
import AdminDashboard from "./modules/dashboard/pages/AdminDashboard";
import MilkAdminDashboard from "./modules/milk-admin/pages/MilkAdminDashboard";
import { ConfirmProvider } from "./context/ConfirmContext";
import "./css/login.css";
import "./css/dashboard.css";

const App = () => {
  return (
    <ConfirmProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AdminLogin />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/milk-admin/*" element={<MilkAdminDashboard />} />
        </Routes>
      </BrowserRouter>
    </ConfirmProvider>
  );
};

export default App;
