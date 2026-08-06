import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { DemoAnimation } from "./DemoAnimation";

export function DemoDialog({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid="demo-dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-8 bg-[#0C0C0E]/85 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              data-testid="demo-dialog-close"
              onClick={onClose}
              className="absolute -top-12 right-0 text-[#F5F1E8]/70 hover:text-[#F5F1E8] flex items-center gap-2 text-sm"
            >
              <X size={18} /> Esc
            </button>
            <DemoAnimation large />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
