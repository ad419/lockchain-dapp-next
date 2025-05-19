"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import ReactConfetti from "react-confetti";
import "../styles/CreateToken.css";

const CreateToken = () => {
  const { data: session } = useSession();
  const [formStep, setFormStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // New state for animations
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  // Handle window size for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Effect to clear success/error states after animation
  useEffect(() => {
    if (showConfetti || showSuccess) {
      const timer = setTimeout(() => {
        setShowConfetti(false);
        setShowSuccess(false);
      }, 6000);
      return () => clearTimeout(timer);
    }

    if (showError) {
      const timer = setTimeout(() => {
        setShowError(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti, showSuccess, showError]);

  // Your existing form data state and functions...
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    tokenName: "",
    tokenSymbol: "",
    tokenSupply: "",
    decimals: "18",
    blockchain: "Ethereum",
    tokenType: "ERC-20",
    features: [],
    description: "",
    budget: "",
    timeframe: "1-2 weeks",
    terms: false,
  });

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  // Form features options
  const featureOptions = [
    { id: "mintable", label: "Mintable" },
    { id: "burnable", label: "Burnable" },
    { id: "pausable", label: "Pausable" },
    { id: "reflections", label: "Reflections" },
    { id: "taxable", label: "Tax Mechanism" },
    { id: "antibot", label: "Anti-Bot Protection" },
    { id: "liquidity", label: "Auto Liquidity" },
    { id: "staking", label: "Staking Functionality" },
  ];

  // Blockchain options
  const blockchainOptions = [
    "Ethereum",
    "Binance Smart Chain",
    "Polygon",
    "Avalanche",
    "Arbitrum",
    "Optimism",
    "Base",
    "Solana",
  ];

  // Pre-fill form with user data if logged in
  useEffect(() => {
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        name: session.user.name || "",
        email: session.user.email || "",
        userId: session.user.id || null,
      }));
    }
  }, [session]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle checkbox changes for features
  const handleFeatureToggle = (featureId) => {
    setFormData((prevData) => {
      const features = [...prevData.features];
      if (features.includes(featureId)) {
        return {
          ...prevData,
          features: features.filter((f) => f !== featureId),
        };
      } else {
        return { ...prevData, features: [...features, featureId] };
      }
    });
  };

  // Navigate to next form step
  const nextStep = () => {
    if (formStep < 3) {
      setFormStep(formStep + 1);
    }
  };

  // Go back to previous form step
  const prevStep = () => {
    if (formStep > 0) {
      setFormStep(formStep - 1);
    }
  };

  // Submit form with enhanced animations
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check terms agreement
    if (!formData.terms) {
      toast.error("You must agree to the terms before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      // Create submission data object
      const submissionData = {
        // Form data
        name: formData.name || "",
        email: formData.email || "",
        tokenName: formData.tokenName || "",
        tokenSymbol: formData.tokenSymbol || "",
        tokenSupply: formData.tokenSupply || "",
        decimals: formData.decimals || "18",
        blockchain: formData.blockchain || "Ethereum",
        tokenType: formData.tokenType || "ERC-20",
        features: formData.features || [],
        description: formData.description || "",
        budget: formData.budget || "",
        timeframe: formData.timeframe || "1-2 weeks",

        // User data if authenticated
        ...(session?.user?.id && { userId: session.user.id }),
      };

      // Send request to our API route
      const response = await fetch("/api/token-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to submit request");
      }

      // Show success animations!
      setShowConfetti(true);
      setShowSuccess(true);

      // Also show a regular toast
      toast.success(
        "Your token creation request has been submitted successfully! Our team will contact you soon."
      );

      // Reset form but keep user data
      setFormData({
        name: formData.name || "",
        email: formData.email || "",
        tokenName: "",
        tokenSymbol: "",
        tokenSupply: "",
        decimals: "18",
        blockchain: "Ethereum",
        tokenType: "ERC-20",
        features: [],
        description: "",
        budget: "",
        timeframe: "1-2 weeks",
        terms: false,
      });
      setFormStep(0);
    } catch (error) {
      console.error("Error submitting form:", error);

      // Show error animation
      setShowError(true);

      // Regular toast message
      toast.error(
        error.message ||
          "There was an error submitting your request. Please try again later."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Validate current step before proceeding
  const canProceed = () => {
    if (formStep === 0) {
      return formData.name && formData.email;
    } else if (formStep === 1) {
      return formData.tokenName && formData.tokenSymbol && formData.tokenSupply;
    } else if (formStep === 2) {
      return true; // Features are optional
    } else if (formStep === 3) {
      return formData.terms; // Require terms agreement for submission
    }
    return false;
  };

  return (
    <div className="token-build-container">
      {/* Enhanced Success Overlay with Cinematic Animation */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="token-build-overlay cosmic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="token-build-cosmos-background">
              <div className="token-build-stars"></div>
              <div className="token-build-stars-2"></div>
              <div className="token-build-stars-3"></div>
              <div className="token-build-shooting-stars"></div>
            </div>

            <motion.div
              className="token-build-success-modal glassmorphism"
              initial={{ scale: 0.8, y: 80, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 80, opacity: 0 }}
              transition={{
                type: "spring",
                damping: 12,
                stiffness: 80,
                delay: 0.3,
              }}
            >
              {/* Animated Token Icon */}
              <motion.div
                className="token-build-token-container"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{
                  duration: 20,
                  ease: "linear",
                  repeat: Infinity,
                }}
              >
                <motion.div
                  className="token-build-token-ring"
                  animate={{
                    boxShadow: [
                      "0 0 25px 5px rgba(18, 83, 255, 0.8)",
                      "0 0 35px 8px rgba(125, 160, 255, 0.8)",
                      "0 0 25px 5px rgba(18, 83, 255, 0.8)",
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                >
                  <motion.div
                    className="token-build-token-circle"
                    animate={{
                      background: [
                        "linear-gradient(45deg, #1253ff, #7da0ff)",
                        "linear-gradient(225deg, #1253ff, #43f6ff)",
                        "linear-gradient(45deg, #1253ff, #7da0ff)",
                      ],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                    }}
                  >
                    <motion.span
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                    >
                      🚀
                    </motion.span>
                  </motion.div>
                </motion.div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="token-build-glow-text"
              >
                Token Request Submitted!
              </motion.h2>

              <motion.div
                className="token-build-success-progress"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.9, duration: 2.5 }}
              />

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.85 }}
                transition={{ delay: 1.2, duration: 0.6 }}
              >
                Your token creation process has been initiated. Our team will
                review your request and contact you shortly.
              </motion.p>

              <motion.button
                className="token-build-btn token-build-btn-glow"
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 0 20px rgba(18, 83, 255, 0.8)",
                }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.6 }}
                onClick={() => setShowSuccess(false)}
              >
                <span className="token-build-btn-shine"></span>
                Awesome!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Error Animation with Futuristic Elements */}
      <AnimatePresence>
        {showError && (
          <motion.div
            className="token-build-overlay error-theme"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="token-build-glitch-overlay"></div>

            <motion.div
              className="token-build-error-modal"
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 15 }}
            >
              <motion.div
                className="token-build-error-symbol"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  rotate: [0, -5, 10, -10, 5, 0],
                }}
                transition={{
                  duration: 0.7,
                  opacity: { delay: 0.3 },
                  rotate: { delay: 0.4, duration: 0.5 },
                }}
              >
                <svg viewBox="0 0 24 24" width="80" height="80">
                  <motion.circle
                    cx="12"
                    cy="12"
                    r="11"
                    stroke="#ff3b58"
                    strokeWidth="2"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                  <motion.path
                    d="M12 7v6M12 17v.5"
                    stroke="#ff3b58"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 1 }}
                  />
                </svg>
              </motion.div>

              <motion.div
                className="token-build-digital-lines"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="token-build-digital-line"></div>
                <div className="token-build-digital-line"></div>
                <div className="token-build-digital-line"></div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <motion.h2
                  animate={{
                    color: ["#ff3b58", "#ff5872", "#ff3b58"],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Submission Error
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.9 }}
                  transition={{ delay: 0.9 }}
                >
                  We encountered an issue while processing your request. Our
                  team has been notified.
                </motion.p>

                <motion.div
                  className="token-build-error-debug"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 0.7 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                >
                  <code>
                    Try again or contact support if the problem persists.
                  </code>
                </motion.div>
              </motion.div>

              <motion.div
                className="token-build-btn-group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
              >
                <motion.button
                  className="token-build-btn token-build-btn-error"
                  whileHover={{ scale: 1.05, backgroundColor: "#ff2142" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowError(false)}
                >
                  Got it
                </motion.button>
                <motion.button
                  className="token-build-btn token-build-btn-retry"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowError(false);
                    // Maybe add retry functionality here
                  }}
                >
                  Try Again
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Confetti Effect */}
      {showConfetti && (
        <>
          <ReactConfetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={800}
            gravity={0.15}
            colors={["#1253ff", "#7da0ff", "#fff", "#ffb700", "#00d4ff"]}
            drawShape={(ctx) => {
              // Add custom cryptocurrency symbols
              const symbols = ["₿", "Ξ", "L", "◎", "⟠"];
              const symbol =
                symbols[Math.floor(Math.random() * symbols.length)];
              ctx.font = "24px sans-serif";
              ctx.fillText(symbol, 0, 0);
            }}
          />
          <ReactConfetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={100}
            gravity={0.2}
            confettiSource={{ x: 0, y: 0, w: windowSize.width, h: 0 }}
            colors={["#1253ff", "#7da0ff"]}
          />
        </>
      )}

      {/* Your existing form content */}
      <motion.div
        className="token-build-row"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="token-build-col">
          <div className="token-build-card">
            <div className="token-build-card-body">
              <motion.div
                className="token-build-text-center token-build-mb-5"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="token-build-heading">
                  Create Your Custom Token
                </h2>
                <p className="token-build-subheading">
                  Let our team build the perfect token for your project with
                  advanced features and security
                </p>

                {/* Progress indicator */}
                <div className="token-build-progress">
                  {[0, 1, 2, 3].map((step) => (
                    <div key={step} className="token-build-progress-step">
                      <motion.div
                        className="token-build-progress-dot"
                        initial={false}
                        animate={{
                          backgroundColor:
                            formStep >= step
                              ? "#1253ff"
                              : "rgba(255, 255, 255, 0.2)",
                          scale: formStep === step ? 1.2 : 1,
                        }}
                      />
                      {step < 3 && (
                        <div
                          className="token-build-progress-line"
                          style={{
                            backgroundColor:
                              formStep > step
                                ? "#1253ff"
                                : "rgba(255, 255, 255, 0.1)",
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="token-build-progress-labels">
                  <span className="token-build-progress-label">Your Info</span>
                  <span className="token-build-progress-label">
                    Token Basics
                  </span>
                  <span className="token-build-progress-label">Features</span>
                  <span className="token-build-progress-label">Finalize</span>
                </div>
              </motion.div>

              <form className="token-build-form" onSubmit={handleSubmit}>
                {/* Step 1: Personal Information */}
                {formStep === 0 && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.h4
                      variants={itemVariants}
                      className="token-build-section-title token-build-mb-4"
                    >
                      Your Information
                    </motion.h4>

                    <motion.div
                      variants={itemVariants}
                      className="token-build-form-group"
                    >
                      <label htmlFor="name" className="token-build-label">
                        Your Name
                      </label>
                      <input
                        type="text"
                        className="token-build-input"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your name"
                      />
                    </motion.div>

                    <motion.div
                      variants={itemVariants}
                      className="token-build-form-group"
                    >
                      <label htmlFor="email" className="token-build-label">
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="token-build-input"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email"
                      />
                    </motion.div>

                    <motion.div
                      variants={itemVariants}
                      className="token-build-text-center token-build-mt-4"
                    >
                      <button
                        type="button"
                        className="token-build-btn token-build-btn-primary"
                        onClick={nextStep}
                        disabled={!canProceed()}
                      >
                        Continue <span className="token-build-ml-2">→</span>
                      </button>
                    </motion.div>
                  </motion.div>
                )}

                {/* Step 2: Token Basic Information */}
                {formStep === 1 && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.h4
                      variants={itemVariants}
                      className="token-build-section-title token-build-mb-4"
                    >
                      Token Details
                    </motion.h4>

                    <div className="token-build-flex-row">
                      <motion.div
                        variants={itemVariants}
                        className="token-build-col-half token-build-form-group"
                      >
                        <label
                          htmlFor="tokenName"
                          className="token-build-label"
                        >
                          Token Name
                        </label>
                        <input
                          type="text"
                          className="token-build-input"
                          id="tokenName"
                          name="tokenName"
                          value={formData.tokenName}
                          onChange={handleChange}
                          placeholder="e.g. LockChain Token"
                        />
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        className="token-build-col-half token-build-form-group"
                      >
                        <label
                          htmlFor="tokenSymbol"
                          className="token-build-label"
                        >
                          Token Symbol
                        </label>
                        <input
                          type="text"
                          className="token-build-input"
                          id="tokenSymbol"
                          name="tokenSymbol"
                          value={formData.tokenSymbol}
                          onChange={handleChange}
                          placeholder="e.g. LOCK"
                          maxLength={10}
                        />
                      </motion.div>
                    </div>

                    <div className="token-build-flex-row">
                      <motion.div
                        variants={itemVariants}
                        className="token-build-col-half token-build-form-group"
                      >
                        <label
                          htmlFor="tokenSupply"
                          className="token-build-label"
                        >
                          Total Supply
                        </label>
                        <input
                          type="text"
                          className="token-build-input"
                          id="tokenSupply"
                          name="tokenSupply"
                          value={formData.tokenSupply}
                          onChange={handleChange}
                          placeholder="e.g. 1000000"
                        />
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        className="token-build-col-half token-build-form-group"
                      >
                        <label htmlFor="decimals" className="token-build-label">
                          Decimals
                        </label>
                        <select
                          className="token-build-select"
                          id="decimals"
                          name="decimals"
                          value={formData.decimals}
                          onChange={handleChange}
                        >
                          <option value="6">6 (Like USDC)</option>
                          <option value="8">8 (Like BTC)</option>
                          <option value="18">18 (Like ETH, Standard)</option>
                        </select>
                      </motion.div>
                    </div>

                    <div className="token-build-flex-row">
                      <motion.div
                        variants={itemVariants}
                        className="token-build-col-half token-build-form-group"
                      >
                        <label
                          htmlFor="blockchain"
                          className="token-build-label"
                        >
                          Blockchain
                        </label>
                        <select
                          className="token-build-select"
                          id="blockchain"
                          name="blockchain"
                          value={formData.blockchain}
                          onChange={handleChange}
                        >
                          {blockchainOptions.map((chain) => (
                            <option key={chain} value={chain}>
                              {chain}
                            </option>
                          ))}
                        </select>
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        className="token-build-col-half token-build-form-group"
                      >
                        <label
                          htmlFor="tokenType"
                          className="token-build-label"
                        >
                          Token Type
                        </label>
                        <select
                          className="token-build-select"
                          id="tokenType"
                          name="tokenType"
                          value={formData.tokenType}
                          onChange={handleChange}
                        >
                          <option value="ERC-20">ERC-20 (Standard)</option>
                          <option value="BEP-20">BEP-20 (BSC)</option>
                          <option value="Custom">Custom</option>
                        </select>
                      </motion.div>
                    </div>

                    <motion.div
                      variants={itemVariants}
                      className="token-build-flex-between token-build-mt-4"
                    >
                      <button
                        type="button"
                        className="token-build-btn token-build-btn-outline"
                        onClick={prevStep}
                      >
                        <span className="token-build-mr-2">←</span> Back
                      </button>
                      <button
                        type="button"
                        className="token-build-btn token-build-btn-primary"
                        onClick={nextStep}
                        disabled={!canProceed()}
                      >
                        Continue <span className="token-build-ml-2">→</span>
                      </button>
                    </motion.div>
                  </motion.div>
                )}

                {/* Step 3: Token Features */}
                {formStep === 2 && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.h4
                      variants={itemVariants}
                      className="token-build-section-title token-build-mb-4"
                    >
                      Token Features
                    </motion.h4>

                    <motion.p
                      variants={itemVariants}
                      className="token-build-subheading"
                    >
                      Select the features you would like to include in your
                      token:
                    </motion.p>

                    <motion.div
                      variants={itemVariants}
                      className="token-build-features-grid token-build-mb-4"
                    >
                      {featureOptions.map((feature) => (
                        <div
                          key={feature.id}
                          className="token-build-form-group"
                        >
                          <div
                            className={`token-build-feature-card ${
                              formData.features.includes(feature.id)
                                ? "token-build-feature-card-selected"
                                : ""
                            }`}
                            onClick={() => handleFeatureToggle(feature.id)}
                            style={{
                              border: formData.features.includes(feature.id)
                                ? "1px solid #1253ff"
                                : "1px solid rgba(255, 255, 255, 0.1)",
                              background: formData.features.includes(feature.id)
                                ? "rgba(18, 83, 255, 0.1)"
                                : "rgba(20, 20, 20, 0.8)",
                            }}
                          >
                            <div className="token-build-flex-center">
                              <div
                                className="token-build-feature-check"
                                style={{
                                  border: formData.features.includes(feature.id)
                                    ? "none"
                                    : "1px solid rgba(255, 255, 255, 0.3)",
                                  background: formData.features.includes(
                                    feature.id
                                  )
                                    ? "#1253ff"
                                    : "transparent",
                                }}
                              >
                                {formData.features.includes(feature.id) && (
                                  <span className="token-build-check-icon">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <div>
                                <h6 className="token-build-mb-1">
                                  {feature.label}
                                </h6>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>

                    <motion.div
                      variants={itemVariants}
                      className="token-build-form-group"
                    >
                      <label
                        htmlFor="description"
                        className="token-build-label"
                      >
                        Additional Requirements
                      </label>
                      <textarea
                        className="token-build-input token-build-textarea"
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Describe any additional features or requirements for your token..."
                      />
                    </motion.div>

                    <motion.div
                      variants={itemVariants}
                      className="token-build-flex-between token-build-mt-4"
                    >
                      <button
                        type="button"
                        className="token-build-btn token-build-btn-outline"
                        onClick={prevStep}
                      >
                        <span className="token-build-mr-2">←</span> Back
                      </button>
                      <button
                        type="button"
                        className="token-build-btn token-build-btn-primary"
                        onClick={nextStep}
                        disabled={!canProceed()}
                      >
                        Continue <span className="token-build-ml-2">→</span>
                      </button>
                    </motion.div>
                  </motion.div>
                )}

                {/* Step 4: Final Details and Submit */}
                {formStep === 3 && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.h4
                      variants={itemVariants}
                      className="token-build-section-title token-build-mb-4"
                    >
                      Finalize Your Request
                    </motion.h4>

                    <motion.div
                      variants={itemVariants}
                      className="token-build-flex-row"
                    >
                      <div className="token-build-col-half token-build-form-group">
                        <label htmlFor="budget" className="token-build-label">
                          Estimated Budget (Optional)
                        </label>
                        <select
                          className="token-build-select"
                          id="budget"
                          name="budget"
                          value={formData.budget}
                          onChange={handleChange}
                        >
                          <option value="">Select a budget range</option>
                          <option value="< $1,000">Less than $1,000</option>
                          <option value="$1,000 - $3,000">
                            $1,000 - $3,000
                          </option>
                          <option value="$3,000 - $5,000">
                            $3,000 - $5,000
                          </option>
                          <option value="$5,000 - $10,000">
                            $5,000 - $10,000
                          </option>
                          <option value="$10,000+">$10,000+</option>
                        </select>
                      </div>

                      <div className="token-build-col-half token-build-form-group">
                        <label
                          htmlFor="timeframe"
                          className="token-build-label"
                        >
                          Desired Timeframe
                        </label>
                        <select
                          className="token-build-select"
                          id="timeframe"
                          name="timeframe"
                          value={formData.timeframe}
                          onChange={handleChange}
                        >
                          <option value="ASAP">As soon as possible</option>
                          <option value="1-2 weeks">1-2 weeks</option>
                          <option value="3-4 weeks">3-4 weeks</option>
                          <option value="1-2 months">1-2 months</option>
                          <option value="Flexible">Flexible</option>
                        </select>
                      </div>
                    </motion.div>

                    <motion.div
                      variants={itemVariants}
                      className="token-build-summary token-build-mb-4"
                    >
                      <h5 className="token-build-summary-title">
                        Request Summary
                      </h5>
                      <div className="token-build-summary-row">
                        <div className="token-build-summary-col">
                          <p>
                            <strong>Token Name:</strong> {formData.tokenName}
                          </p>
                          <p>
                            <strong>Token Symbol:</strong>{" "}
                            {formData.tokenSymbol}
                          </p>
                          <p>
                            <strong>Total Supply:</strong>{" "}
                            {formData.tokenSupply}
                          </p>
                          <p>
                            <strong>Decimals:</strong> {formData.decimals}
                          </p>
                        </div>
                        <div className="token-build-summary-col">
                          <p>
                            <strong>Blockchain:</strong> {formData.blockchain}
                          </p>
                          <p>
                            <strong>Token Type:</strong> {formData.tokenType}
                          </p>
                          <p>
                            <strong>Features:</strong>{" "}
                            {formData.features.length > 0
                              ? formData.features
                                  .map(
                                    (f) =>
                                      featureOptions.find(
                                        (option) => option.id === f
                                      )?.label
                                  )
                                  .join(", ")
                              : "None selected"}
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      variants={itemVariants}
                      className="token-build-form-group token-build-mb-4"
                    >
                      <div className="token-build-checkbox-container">
                        <input
                          className="token-build-checkbox"
                          type="checkbox"
                          id="terms"
                          checked={formData.terms}
                          onChange={() =>
                            setFormData({ ...formData, terms: !formData.terms })
                          }
                        />
                        <label
                          className="token-build-checkbox-label"
                          htmlFor="terms"
                        >
                          I agree to be contacted by the LockChain team
                          regarding my token creation request
                        </label>
                      </div>
                    </motion.div>

                    <motion.div
                      variants={itemVariants}
                      className="token-build-flex-between"
                    >
                      <button
                        type="button"
                        className="token-build-btn token-build-btn-outline"
                        onClick={prevStep}
                      >
                        <span className="token-build-mr-2">←</span> Back
                      </button>
                      <button
                        type="submit"
                        className="token-build-btn token-build-btn-primary"
                        disabled={submitting || !formData.terms}
                      >
                        {submitting ? (
                          <span className="token-build-flex-center">
                            <ClipLoader
                              color="#ffffff"
                              size={16}
                              className="token-build-mr-2"
                            />
                            Submitting...
                          </span>
                        ) : (
                          <span>
                            Submit Request{" "}
                            <span className="token-build-ml-2">→</span>
                          </span>
                        )}
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </form>
            </div>
          </div>

          <motion.div
            className="token-build-text-center token-build-mt-4 token-build-mb-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="token-build-subheading">
              Need more information? Contact us at{" "}
              <a
                href="mailto:support@lockchain.com"
                style={{ color: "#1253ff" }}
              >
                support@lockchain.com
              </a>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateToken;
