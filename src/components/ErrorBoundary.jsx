import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "50vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
          textAlign: "center",
          fontFamily: '"Inter", sans-serif'
        }}>
          <div style={{
            background: "#fff",
            padding: "32px",
            borderRadius: "16px",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
            maxWidth: "480px",
            border: "1px solid #fee2e2"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
            <h2 style={{ margin: "0 0 8px 0", color: "#991b1b", fontSize: "1.3rem" }}>Something went wrong</h2>
            <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: "20px" }}>
              An error occurred while loading this section.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  if (this.props.onReset) this.props.onReset();
                  else window.location.reload();
                }}
                style={{
                  padding: "10px 20px",
                  background: "#0284c7",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.history.back()}
                style={{
                  padding: "10px 20px",
                  background: "#f1f5f9",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
