import React, { useState } from "react";

const DeliveryProofViewModal = ({ isOpen, onClose, proofData }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  if (!isOpen || !proofData) return null;

  const {
    photoUrl,
    customerName,
    address,
    productName,
    itemLabel,
    quantity,
    unit,
    deliveryBoyName,
    status,
    capturedAt,
    orderId,
    orderType,
    qrVerified = true,
  } = proofData;

  const displayProduct = productName || itemLabel || "Delivered Milk / Product";
  const displayQty = quantity ? `${quantity} ${unit || "L"}` : null;
  const formattedTime = capturedAt
    ? new Date(capturedAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "N/A";

  const isDelivered = ["Delivered", "DELIVERED", "VERIFIED"].includes(status);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(6px)",
        zIndex: 3600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: isZoomed ? "90vw" : "560px",
          maxHeight: "92vh",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
          display: "flex",
          flexDirection: "column",
          transition: "max-width 0.3s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 22px",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>📸</span>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
                Delivery Proof Verification
              </h3>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                Order #{orderId} {orderType ? `(${orderType.toUpperCase()})` : ""}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              title={isZoomed ? "Normal View" : "Expand / Zoom"}
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                border: "none",
                color: "#ffffff",
                padding: "6px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {isZoomed ? "🔍 Shrink" : "🔍 Zoom"}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                border: "none",
                color: "#ffffff",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Image Display Area */}
        <div
          style={{
            background: "#000000",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: isZoomed ? "500px" : "320px",
            maxHeight: isZoomed ? "65vh" : "380px",
            overflow: "hidden",
            cursor: "pointer",
          }}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Delivery Proof"
              style={{
                width: "100%",
                height: "100%",
                maxHeight: isZoomed ? "65vh" : "380px",
                objectFit: "contain",
                transform: isZoomed ? "scale(1.05)" : "scale(1)",
                transition: "transform 0.2s ease",
              }}
            />
          ) : (
            <div style={{ color: "#94a3b8", fontSize: "14px" }}>No photo available</div>
          )}

          {/* Badges on image */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {qrVerified && (
              <span
                style={{
                  background: "rgba(16, 185, 129, 0.9)",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
              >
                ✓ Door QR Verified
              </span>
            )}
            <span
              style={{
                background: isDelivered ? "rgba(34, 197, 94, 0.9)" : "rgba(245, 158, 11, 0.9)",
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: "700",
                padding: "4px 10px",
                borderRadius: "20px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
            >
              {isDelivered ? "✓ Delivery Verified" : "⏳ Awaiting Confirmation"}
            </span>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: "8px",
              right: "12px",
              background: "rgba(0, 0, 0, 0.6)",
              color: "#cbd5e1",
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "4px",
            }}
          >
            Click image to {isZoomed ? "shrink" : "zoom"}
          </div>
        </div>

        {/* Verification Metadata Grid */}
        <div style={{ padding: "18px 22px", background: "#f8fafc", overflowY: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              fontSize: "13px",
            }}
          >
            <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Delivered Product</div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>
                {displayProduct} {displayQty ? `(${displayQty})` : ""}
              </div>
            </div>

            <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Customer Name</div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>
                {customerName || "Customer"}
              </div>
              {address && <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{address}</div>}
            </div>

            <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Delivery Boy</div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>
                {deliveryBoyName || "Assigned Boy"}
              </div>
            </div>

            <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Captured Timestamp</div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", marginTop: "2px" }}>
                🕒 {formattedTime}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 22px",
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          {photoUrl && (
            <a
              href={photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "8px 16px",
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                color: "#334155",
                fontSize: "13px",
                fontWeight: "600",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              Open Original ↗
            </a>
          )}
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              background: "#1e293b",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryProofViewModal;
