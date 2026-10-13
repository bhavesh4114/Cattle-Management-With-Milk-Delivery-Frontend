import React, { useState, useRef, useEffect } from "react";

const DeliveryPhotoCaptureModal = ({
  isOpen,
  onClose,
  onPhotoCaptured,
  productInfo,
  customerInfo,
}) => {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCameraError("");
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setIsInitializing(true);
    setCameraError("");
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser environment.");
      }

      // Prefer rear environment camera on mobile devices
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
      setIsInitializing(false);
    } catch (err) {
      console.warn("Camera access error:", err);
      let errorMsg = "Unable to access camera.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMsg = "Camera permission was denied. Please allow camera permissions in your browser or use the file upload option.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMsg = "No camera found on this device. You can capture or upload using the file button below.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMsg = "Camera is currently in use by another app or browser tab.";
      } else if (err.message) {
        errorMsg = err.message;
      }
      setCameraError(errorMsg);
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `proof_${Date.now()}.jpg`, { type: "image/jpeg" });
          const previewUrl = URL.createObjectURL(blob);
          setCapturedImage({ file, previewUrl });
          stopCamera();
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setCapturedImage({ file, previewUrl });
      stopCamera();
      setCameraError("");
    }
  };

  const handleRetake = () => {
    if (capturedImage?.previewUrl) {
      URL.revokeObjectURL(capturedImage.previewUrl);
    }
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onPhotoCaptured(capturedImage.file, capturedImage.previewUrl);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(4px)",
        zIndex: 3500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "520px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>📸</span>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700" }}>Doorstep Delivery Photo Proof</h3>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#94a3b8" }}>
              🚪 Capture photo of <strong style={{ color: "#38bdf8" }}>{productInfo?.label || "product"}</strong> at customer's door
            </p>
          </div>
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

        {/* Info Banner */}
        <div
          style={{
            padding: "10px 24px",
            background: "#f0fdf4",
            borderBottom: "1px solid #bbf7d0",
            fontSize: "12.5px",
            color: "#166534",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            Customer: <strong>{customerInfo?.name || "Customer"}</strong>
          </span>
          <span style={{ fontSize: "11.5px", background: "#dcfce7", padding: "2px 8px", borderRadius: "10px", fontWeight: "600" }}>
            Rear Camera Mode
          </span>
        </div>

        {/* Viewfinder / Preview Box */}
        <div
          style={{
            padding: "16px 24px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "340px",
            background: "#0f172a",
            position: "relative",
          }}
        >
          {capturedImage ? (
            /* Captured Image Preview */
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  maxHeight: "340px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "2px solid #22c55e",
                  display: "flex",
                  justifyContent: "center",
                  background: "#000000",
                }}
              >
                <img
                  src={capturedImage.previewUrl}
                  alt="Captured Delivery Proof"
                  style={{ width: "100%", maxHeight: "340px", objectFit: "contain" }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    left: "10px",
                    background: "rgba(34, 197, 94, 0.9)",
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "700",
                  }}
                >
                  ✓ Photo Captured
                </div>
              </div>
              <p style={{ color: "#94a3b8", fontSize: "12.5px", marginTop: "10px", textAlign: "center" }}>
                Verify product packet / door delivery is clearly visible before using.
              </p>
            </div>
          ) : cameraError ? (
            /* Error & Retry Display */
            <div style={{ textAlign: "center", padding: "20px", color: "#f87171", maxWidth: "380px" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
              <h4 style={{ color: "#fca5a5", margin: "0 0 8px 0", fontSize: "16px" }}>Camera Access Required</h4>
              <p style={{ fontSize: "13px", lineHeight: "1.5", color: "#cbd5e1", marginBottom: "18px" }}>
                {cameraError}
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button
                  onClick={startCamera}
                  style={{
                    padding: "8px 16px",
                    background: "#334155",
                    color: "#ffffff",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  🔄 Retry Camera
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: "8px 16px",
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "700",
                  }}
                >
                  📁 Use Native Camera / File
                </button>
              </div>
            </div>
          ) : (
            /* Live Camera Feed */
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "320px",
                borderRadius: "12px",
                overflow: "hidden",
                background: "#000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />

              {/* Viewfinder Target Frame Overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: "20px",
                  border: "2px dashed rgba(255, 255, 255, 0.6)",
                  borderRadius: "12px",
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  paddingBottom: "12px",
                }}
              >
                <span
                  style={{
                    background: "rgba(0, 0, 0, 0.6)",
                    color: "#ffffff",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                >
                  Align delivered milk / product inside frame
                </span>
              </div>

              {isInitializing && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(15, 23, 42, 0.8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: "14px",
                  }}
                >
                  Initializing camera...
                </div>
              )}
            </div>
          )}

          {/* Hidden File Input Fallback for Native Camera */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            gap: "12px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {capturedImage ? (
            <>
              <button
                onClick={handleRetake}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  color: "#475569",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                🔄 Retake Photo
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#16a34a",
                  border: "none",
                  borderRadius: "10px",
                  color: "#ffffff",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "14px",
                  boxShadow: "0 4px 6px -1px rgba(22, 163, 74, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                ✓ Use Photo
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: "12px 16px",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  color: "#475569",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                📁 Native Camera
              </button>
              <button
                disabled={isInitializing || Boolean(cameraError)}
                onClick={handleCapture}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  background: isInitializing || Boolean(cameraError) ? "#94a3b8" : "#2563eb",
                  border: "none",
                  borderRadius: "10px",
                  color: "#ffffff",
                  fontWeight: "700",
                  cursor: isInitializing || Boolean(cameraError) ? "not-allowed" : "pointer",
                  fontSize: "15px",
                  boxShadow: "0 4px 10px rgba(37, 99, 235, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                📸 Capture Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryPhotoCaptureModal;
