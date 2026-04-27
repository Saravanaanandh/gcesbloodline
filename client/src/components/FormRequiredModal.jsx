import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, AlertCircle, Droplets } from "lucide-react";

/**
 * FormRequiredModal
 *
 * Props:
 *   isOpen    – boolean: controls visibility
 *   onClose   – function: called when user dismisses (ignored in forced mode)
 *   userType  – "donor" | "recipient"
 *   forced    – boolean: hides Cancel, disables backdrop-click & Escape key
 */
const FormRequiredModal = ({ isOpen, onClose, userType, forced = false }) => {
  const navigate = useNavigate();

  const isDonor = userType === "donor";
  const redirectPath = isDonor ? "/donate" : "/request";
  const buttonLabel  = isDonor ? "Go to Donor Form" : "Go to Request Form";

  const title = isDonor
    ? "Donor Form Required"
    : "Request Form Required";

  const message = isDonor
    ? "You must fill the Donor Form before you can donate blood to recipients."
    : "You must fill the Request Form before you can send a request to donors.";

  // Escape key – disabled in forced mode
  useEffect(() => {
    if (forced) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose, forced]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        /* ── Backdrop ── */
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => { if (!forced) onClose(); }}
          style={{
            backgroundColor: "rgba(0,0,0,0.80)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
          }}
        >
          {/* ── Modal card ── */}
          <motion.div
            key="modal"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm sm:max-w-md overflow-hidden"
            style={{
              background: "#0a0a0a",
              border: "1px solid #dc2626",
              borderRadius: "6px",
              boxShadow: "0 0 0 1px #7f1d1d, 0 25px 60px rgba(220,38,38,0.25)",
            }}
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={{ scale: 0.9,     opacity: 0, y: 15 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
          >
            {/* ── Top red bar with diagonal stripes ── */}
            <div
              className="h-1.5 w-full"
              style={{
                background:
                  "repeating-linear-gradient(90deg, #dc2626 0px, #dc2626 10px, #b91c1c 10px, #b91c1c 20px)",
              }}
            />

            {/* ── Header strip ── */}
            <div
              className="flex items-center gap-3 px-6 py-4"
              style={{ borderBottom: "1px solid #1f1f1f" }}
            >
              {/* Blood drop pulse */}
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <Droplets className="size-5 text-red-600" fill="#dc2626" />
              </motion.div>
              <span
                className="text-xs font-semibold tracking-[0.18em] uppercase"
                style={{ color: "#dc2626" }}
              >
                Blood Donation System
              </span>
            </div>

            {/* ── Body ── */}
            <div className="px-6 pt-6 pb-8 flex flex-col items-center gap-5 text-center">

              {/* Icon ring */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1,  rotate: 0   }}
                transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.08 }}
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 72,
                  height: 72,
                  background:
                    "radial-gradient(circle, rgba(220,38,38,0.15) 0%, rgba(220,38,38,0) 70%)",
                  border: "1.5px solid #dc2626",
                  boxShadow: "0 0 20px rgba(220,38,38,0.35)",
                }}
              >
                <AlertCircle
                  className="size-9"
                  style={{ color: "#dc2626" }}
                  strokeWidth={1.6}
                />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="text-lg font-bold tracking-wide"
                style={{ color: "#ffffff" }}
              >
                {title}
              </motion.h2>

              {/* Message */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="text-sm leading-relaxed"
                style={{ color: "#9ca3af" }}
              >
                {message}
              </motion.p>

              {/* Divider */}
              <div
                className="w-full"
                style={{
                  height: 1,
                  background:
                    "linear-gradient(90deg, transparent, #dc2626 40%, #dc2626 60%, transparent)",
                  opacity: 0.4,
                }}
              />

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="flex gap-3 w-full"
              >
                {/* Cancel – hidden in forced mode */}
                {!forced && (
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 text-sm font-medium transition-all duration-200"
                    style={{
                      color: "#9ca3af",
                      border: "1px solid #374151",
                      borderRadius: "4px",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#1f1f1f";
                      e.currentTarget.style.color = "#ffffff";
                      e.currentTarget.style.borderColor = "#6b7280";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#9ca3af";
                      e.currentTarget.style.borderColor = "#374151";
                    }}
                  >
                    Cancel
                  </button>
                )}

                {/* Go to form */}
                <button
                  onClick={() => {
                    if (!forced) onClose();
                    navigate(redirectPath);
                  }}
                  className="flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                    color: "#ffffff",
                    border: "1px solid #ef4444",
                    borderRadius: "4px",
                    boxShadow: "0 4px 18px rgba(220,38,38,0.45)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 24px rgba(220,38,38,0.65)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 18px rgba(220,38,38,0.45)";
                  }}
                >
                  <FileText className="size-4" />
                  {buttonLabel}
                </button>
              </motion.div>

              {/* Forced-mode hint */}
              {forced && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="text-xs"
                  style={{ color: "#6b7280" }}
                >
                  You must complete the form to continue using this page.
                </motion.p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FormRequiredModal;
