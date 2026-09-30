import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AdminLogin = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const res = await axios.post("/api/admin/auth/login", formData);

      localStorage.setItem("adminToken", res.data.token);
      localStorage.setItem("adminData", JSON.stringify(res.data.admin));

      const roleName = res.data.admin?.customRole?.name?.toLowerCase() || ""; if (roleName.includes("delivery") || roleName.includes("milk")) { navigate("/milk-admin/dashboard"); } else { navigate("/admin/dashboard"); }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage("Invalid email or password");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="login-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img">
              <path d="M4 11.6c0-4.5 3.6-8.1 8-8.1s8 3.6 8 8.1v1.7c0 3.9-2.7 7.3-6.5 8.1l-1.5.3-1.5-.3C6.7 20.6 4 17.2 4 13.3v-1.7Z" />
              <path d="M8.6 11.5h6.8M8.6 14.8h6.8M10.2 8.2h3.6" />
            </svg>
          </span>
          <p>Cattle Management</p>
        </div>

        <div className="login-heading">
          <h1 id="login-title">Admin Login</h1>
          <p>Sign in to manage livestock records, health updates, and farm activity.</p>
        </div>

        <form className="login-form" onSubmit={handleLogin} autoComplete="off">
          <label htmlFor="email">Email address</label>
          <div className="input-shell">
            <span className="input-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M4.5 6.5h15v11h-15v-11Z" />
                <path d="m5 7 7 5.7L19 7" />
              </svg>
            </span>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="admin@example.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="new-email"
              required
            />
          </div>

          <label htmlFor="password">Password</label>
          <div className="input-shell">
            <span className="input-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M7 10V8a5 5 0 0 1 10 0v2" />
                <path d="M6 10h12v9H6v-9Z" />
              </svg>
            </span>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.8 12s3.2-5.5 9.2-5.5S21.2 12 21.2 12s-3.2 5.5-9.2 5.5S2.8 12 2.8 12Z" />
                <path d="M9.6 12a2.4 2.4 0 1 0 4.8 0 2.4 2.4 0 0 0-4.8 0Z" />
              </svg>
            </button>
          </div>

          <button className="login-button" type="submit" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="login-message" role="alert">
          {message}
        </p>
      </section>
    </div>
  );
};

export default AdminLogin;

