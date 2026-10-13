import React from "react";
import { X, MessageCircle } from "lucide-react";
import ParticipantChatView from "./ParticipantChatView";

const SupportChatModal = ({ isOpen, onClose, role = "USER" }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          height: "90vh",
          maxHeight: "750px",
          background: "white",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          animation: "modalFadeIn 0.2s ease-out",
        }}
      >
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          title="Close Chat"
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            zIndex: 30,
            background: "rgba(255, 255, 255, 0.2)",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.35)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")}
        >
          <X size={20} />
        </button>

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <ParticipantChatView role={role} title="Support Chat with Admin" />
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default SupportChatModal;
