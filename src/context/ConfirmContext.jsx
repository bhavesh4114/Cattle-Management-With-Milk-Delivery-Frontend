import React, { createContext, useContext, useState, useCallback } from "react";

const ConfirmContext = createContext();

export const useConfirm = () => {
  return useContext(ConfirmContext);
};

export const ConfirmProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    message: "",
    type: "confirm", // "confirm" or "alert"
    resolve: null,
  });

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        message,
        type: "confirm",
        resolve,
      });
    });
  }, []);

  const customAlert = useCallback((message) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        message,
        type: "alert",
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    if (modalState.resolve) modalState.resolve(true);
    closeModal();
  };

  const handleCancel = () => {
    if (modalState.resolve) modalState.resolve(false);
    closeModal();
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ConfirmContext.Provider value={{ confirm, customAlert }}>
      {children}
      {modalState.isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 99999, // Ensure it's above everything
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "400px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  background: modalState.type === "confirm" ? "#fef2f2" : "#eff6ff",
                  color: modalState.type === "confirm" ? "#dc2626" : "#2563eb",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                }}
              >
                {modalState.type === "confirm" ? "⚠️" : "ℹ️"}
              </div>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#1a2e26" }}>
                {modalState.type === "confirm" ? "Confirm Action" : "Notice"}
              </h3>
            </div>
            
            <p style={{ margin: "0 0 24px 0", fontSize: "15px", color: "#475569", lineHeight: "1.5" }}>
              {modalState.message}
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              {modalState.type === "confirm" && (
                <button
                  onClick={handleCancel}
                  style={{
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleConfirm}
                style={{
                  background: modalState.type === "confirm" ? "#dc2626" : "#2e6f40",
                  color: "#fff",
                  border: "none",
                  padding: "8px 20px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                {modalState.type === "confirm" ? "Yes, I'm sure" : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
