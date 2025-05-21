import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const LoadingModal = ({ show, message = "Processing your transaction..." }) => {
  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="ld-sw-animation-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="ld-sw-modal"
            initial={{ scale: 0.8, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <div className="ld-sw-animation-container">
              <div className="ld-sw-circle-container">
                {/* Animated circles */}
                <motion.div
                  className="ld-sw-circle ld-sw-circle-1"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="ld-sw-circle ld-sw-circle-2"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.2,
                  }}
                />
                <motion.div
                  className="ld-sw-circle ld-sw-circle-3"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.4,
                  }}
                />
              </div>

              {/* Pulse effect */}
              <motion.div
                className="ld-sw-pulse"
                animate={{
                  scale: [1, 1.5],
                  opacity: [0.7, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />

              {/* Digital scanning line effect */}
              <motion.div
                className="ld-sw-scan-line"
                animate={{
                  y: ["-100%", "100%"],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </div>

            <motion.h3
              className="ld-sw-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {message}
            </motion.h3>

            <motion.div
              className="ld-sw-progress"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{
                duration: 2.5,
                ease: "easeInOut",
                repeat: Infinity,
              }}
            />

            <motion.p
              className="ld-sw-subtitle"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{
                duration: 2,
                times: [0, 0.5, 1],
                repeat: Infinity,
              }}
            >
              Please don't close this window
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingModal;
