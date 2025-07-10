"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { useAccount, useContractWrite, useWaitForTransaction } from "wagmi";
import { useToast } from "../context/ToastContext";
import {
  loadCSVData,
  // saveUserProgress,
  // loadUserProgress,
  generateWeeklyAllocations,
} from "../utils/csvManager";
import {
  getUserClaimedWeeks,
  recordClaim,
  hasUserClaimedWeek,
} from "../utils/firebase";
import { useSignMessage } from "wagmi";

const LOCKCHAIN_CONTRACT_ADDRESS = "0x12A1527a3D2ED4084B85602490d945ee9CEEdc53";

// Update ABI to use standard ERC20 transfer
const LOCKCHAIN_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

const AirDrop = () => {
  const { address, isConnected } = useAccount();
  const { showToast } = useToast();
  const { signMessageAsync } = useSignMessage();

  // State variables
  const [claimedWeeks, setClaimedWeeks] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [particles, setParticles] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentWeek, setCurrentWeek] = useState(1);
  const [totalClaimed, setTotalClaimed] = useState(0);
  const [gasEstimate, setGasEstimate] = useState(null);
  const [airdropData, setAirdropData] = useState({});
  const [weeklyAllocations, setWeeklyAllocations] = useState([]);
  const [userAirdropData, setUserAirdropData] = useState(null);
  const [isClaimingReward, setIsClaimingReward] = useState(false);

  const containerRef = useRef(null);
  const weeksPerPage = isMobile ? 6 : 12;

  // Mouse tracking values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  // Load CSV data on component mount
  useEffect(() => {
    const loadData = async () => {
      const data = await loadCSVData();
      setAirdropData(data);
    };
    loadData();
  }, []);

  // Load user data when wallet connects (No auth required)
  useEffect(() => {
    const loadUserData = async () => {
      if (isConnected && address && Object.keys(airdropData).length > 0) {
        // ✅ CHANGE: Get userData object instead of just userTotal
        const userData = airdropData[address.toLowerCase()];
        if (userData) {
          // Load claimed weeks from Firebase (wallet-based)
          const claimedWeekData = await getUserClaimedWeeks(address);
          const claimedWeekNumbers = claimedWeekData.map((claim) => claim.week);

          // ✅ CHANGE: Pass userData object to generateWeeklyAllocations
          const allocations = generateWeeklyAllocations(userData);

          // Update unlock status based on current time
          const processedAllocations = allocations.map((allocation) => ({
            ...allocation,
            isUnlocked: new Date() >= new Date(allocation.unlockDate),
          }));

          // ✅ CHANGE: Set total allocation (not weekly amount)
          setUserAirdropData(userData.totalAllocation);
          setWeeklyAllocations(processedAllocations);
          setClaimedWeeks(claimedWeekNumbers);

          // ✅ CHANGE: Calculate total claimed correctly
          const claimed = claimedWeekNumbers.length * userData.weeklyAmount;
          setTotalClaimed(claimed);
        } else {
          setUserAirdropData(null);
          setWeeklyAllocations([]);
          setClaimedWeeks([]);
          setTotalClaimed(0);
        }
      }
    };

    loadUserData();
  }, [isConnected, address, airdropData]); // Removed user dependency

  // Detect mobile device and window width
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setIsMobile(width <= 768 || "ontouchstart" in window);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Calculate current week
  useEffect(() => {
    const startDate = new Date("2025-07-09");
    const now = new Date();
    const diffTime = Math.abs(now - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const calculatedWeek = Math.min(Math.ceil(diffDays / 7), 52);
    setCurrentWeek(calculatedWeek);
  }, []);

  // Mouse tracking effect
  useEffect(() => {
    if (!isMobile) {
      const container = containerRef.current;
      const handleMouseMove = (e) => {
        if (container) {
          const rect = container.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          mouseX.set(x * 0.1);
          mouseY.set(y * 0.1);
        }
      };

      if (container) {
        container.addEventListener("mousemove", handleMouseMove);
      }

      return () => container?.removeEventListener("mousemove", handleMouseMove);
    }
  }, [mouseX, mouseY, isMobile]);

  // Generate floating particles
  useEffect(() => {
    const newParticles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
  }, []);

  // Replace your mock contract hooks with real ones
  const {
    data: transferData,
    isLoading: isTransferLoading,
    write: transferTokens,
  } = useContractWrite({
    address: LOCKCHAIN_CONTRACT_ADDRESS,
    abi: LOCKCHAIN_ABI,
    functionName: "transfer",
  });

  // Update your handleClaimReward function with proper database verification

  const handleClaimReward = async (weekNumber = null) => {
    if (!isConnected || !address) {
      showToast("Please connect your wallet first", "error");
      return;
    }

    if (weekNumber && weeklyAllocations.length > 0) {
      try {
        const reward = weeklyAllocations.find((r) => r.week === weekNumber);
        if (!reward || !reward.isUnlocked) {
          showToast("This reward is not available for claiming", "error");
          return;
        }

        // ✅ ALWAYS check database first (most reliable)
        showToast("Verifying claim eligibility...", "info");
        const alreadyClaimed = await hasUserClaimedWeek(address, weekNumber);
        if (alreadyClaimed) {
          showToast("This week has already been claimed", "error");
          // Refresh all claims from database
          await refreshClaimsFromDatabase();
          return;
        }

        // Check local state as secondary check
        if (claimedWeeks.includes(weekNumber)) {
          showToast("This week has already been claimed", "error");
          return;
        }

        const confirmed = window.confirm(
          `Claim Week ${weekNumber} reward (${reward.amount.toFixed(
            4
          )} $LOCK tokens)?\n\nTokens will be automatically transferred to your wallet.`
        );

        if (!confirmed) return;

        setIsClaimingReward(true);
        showToast("Preparing claim...", "info");

        const timestamp = Date.now();
        const message = `Claim Week ${weekNumber} - ${reward.amount} LOCK tokens - ${timestamp}`;

        showToast("Please sign the message to verify ownership...", "info");
        const signature = await signMessageAsync({ message });

        showToast("Processing automatic transfer...", "info");

        const response = await fetch("/api/airdrop/auto-transfer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userAddress: address,
            weekNumber: weekNumber,
            amount: reward.amount,
            tokenContract: LOCKCHAIN_CONTRACT_ADDRESS,
            signature: signature,
            timestamp: timestamp,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          if (
            result.error === "ALREADY_CLAIMED" ||
            result.message?.includes("already claimed")
          ) {
            showToast("This week has already been claimed", "error");
            // Refresh claims from database
            await refreshClaimsFromDatabase();
            return;
          }
          throw new Error(result.message || "Transfer failed");
        }

        // ✅ IMMEDIATELY record in database FIRST
        showToast("Recording claim...", "info");
        try {
          await recordClaim(
            address,
            weekNumber,
            reward.amount,
            result.txHash,
            signature,
            timestamp
          );
          console.log("Claim recorded in Firebase successfully");

          // ✅ THEN refresh from database to update UI
          await refreshClaimsFromDatabase();
        } catch (recordError) {
          console.error("Failed to record claim in Firebase:", recordError);
          // If database recording fails, still update local state
          setClaimedWeeks((prev) => [...prev, weekNumber]);

          // ✅ CHANGE: Calculate total claimed correctly
          const userData = airdropData[address.toLowerCase()];
          if (userData) {
            const newTotalClaimed =
              (claimedWeeks.length + 1) * userData.weeklyAmount;
            setTotalClaimed(newTotalClaimed);
          }

          showToast(
            "Transfer successful but failed to record. Contact support.",
            "warning"
          );
        }

        showToast(`Tokens transferred! TX: ${result.txHash}`, "success");
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 3000);
      } catch (error) {
        console.error("Claim failed:", error);
        if (error.message.includes("User rejected")) {
          showToast("Signature cancelled by user", "error");
        } else {
          showToast(
            error.message || "Claim failed. Please try again.",
            "error"
          );
        }
      } finally {
        setIsClaimingReward(false);
      }
    }
  };

  // ✅ Add this helper function to refresh claims from database
  const refreshClaimsFromDatabase = async () => {
    if (!address) return;

    try {
      const claimedWeekData = await getUserClaimedWeeks(address);
      const claimedWeekNumbers = claimedWeekData.map((claim) => claim.week);
      setClaimedWeeks(claimedWeekNumbers);

      // ✅ CHANGE: Calculate total claimed correctly using userData
      const userData = airdropData[address.toLowerCase()];
      if (userData) {
        const claimed = claimedWeekNumbers.length * userData.weeklyAmount;
        setTotalClaimed(claimed);
      }

      console.log("Claims refreshed from database:", claimedWeekNumbers);
    } catch (error) {
      console.error("Failed to refresh claims from database:", error);
    }
  };

  // ✅ Update your refreshClaimStatus function
  const refreshClaimStatus = async () => {
    if (!address) return;

    try {
      showToast("Refreshing claim status...", "info");
      await refreshClaimsFromDatabase();
      showToast("Claim status refreshed", "success");
    } catch (error) {
      console.error("Failed to refresh claim status:", error);
      showToast("Failed to refresh status", "error");
    }
  };

  // Add this function to your component

  // Add a refresh button near your filter buttons (optional)
  {
    /* <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={refreshClaimStatus}
    style={{
      padding: "0.5rem 1rem",
      borderRadius: "8px",
      border: "none",
      background: "rgba(139, 92, 246, 0.8)",
      color: "white",
      fontSize: isMobile ? "0.8rem" : "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
    }}
  >
    🔄 Refresh
  </motion.button>; */
  }

  // Add these missing variable calculations for your stats cards
  const userData = airdropData[address?.toLowerCase()];
  const totalAllocated = userData ? userData.totalAllocation : 0; // ✅ Total over 52 weeks
  const remainingAmount = totalAllocated - totalClaimed;
  const progressPercentage =
    totalAllocated > 0 ? Math.round((totalClaimed / totalAllocated) * 100) : 0;

  // Filter and pagination logic
  const filteredRewards = weeklyAllocations.filter((reward) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "available")
      return reward.isUnlocked && !claimedWeeks.includes(reward.week);
    if (filterStatus === "claimed") return claimedWeeks.includes(reward.week);
    if (filterStatus === "locked") return !reward.isUnlocked;
    return true;
  });

  const totalPages = Math.ceil(filteredRewards.length / weeksPerPage);
  const paginatedRewards = filteredRewards.slice(
    (currentPage - 1) * weeksPerPage,
    currentPage * weeksPerPage
  );

  // Helper function to get responsive container styles
  const getContainerStyles = () => {
    let marginLeft = 0;
    let maxWidth = "1200px";
    let padding = isMobile ? "1rem" : "2rem";

    // Apply sidebar margin based on screen size (same as CalculatePage)
    if (windowWidth > 1629) {
      marginLeft = 0;
      maxWidth = "1200px";
    } else if (windowWidth > 1400) {
      marginLeft = "280px";
      maxWidth = "900px";
    } else if (windowWidth > 1200) {
      marginLeft = "280px";
      maxWidth = "800px";
    } else if (windowWidth > 1100) {
      marginLeft = "250px";
      maxWidth = "700px";
    } else if (windowWidth <= 991) {
      marginLeft = 0; // Sidebar closed on mobile
      maxWidth = "100%";
      padding = isMobile ? "0.5rem" : "1rem";
    }

    return {
      maxWidth,
      margin: "0 auto",
      marginLeft,
      padding,
      width: "100%",
      boxSizing: "border-box",
    };
  };

  // Update the main container div and content wrapper in your return statement
  return (
    <div
      ref={containerRef}
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        position: "relative",
        overflow: "hidden",
        width: "100%",
        // ✅ Responsive margin for sidebar (same as CalculatePage)
        marginLeft:
          windowWidth > 1629
            ? 0
            : windowWidth > 1400
            ? "30px"
            : windowWidth > 1200
            ? "40px"
            : windowWidth > 1100
            ? "40px"
            : windowWidth <= 991
            ? 0
            : "100px",
        transition: "all 0.3s ease",
        marginTop: isMobile ? "0" : "60px",
        boxSizing: "border-box",
      }}
    >
      {/* Interactive Background Effects - Desktop Only */}
      {!isMobile && (
        <>
          <motion.div
            style={{
              position: "absolute",
              width: "600px",
              height: "600px",
              background:
                "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
              borderRadius: "50%",
              filter: "blur(40px)",
              zIndex: 1,
              x: springX,
              y: springY,
              left: "20%",
              top: "20%",
            }}
          />
          <motion.div
            style={{
              position: "absolute",
              width: "400px",
              height: "400px",
              background:
                "radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)",
              borderRadius: "50%",
              filter: "blur(30px)",
              zIndex: 1,
              x: springX * -0.5,
              y: springY * -0.5,
              right: "20%",
              bottom: "20%",
            }}
          />
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.1,
              zIndex: 1,
              backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: "50px 50px",
              x: springX * 0.1,
              y: springY * 0.1,
            }}
          />
        </>
      )}

      {/* Floating Particles */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            style={{
              position: "absolute",
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: "rgba(59, 130, 246, 0.4)",
              borderRadius: "50%",
              opacity: 0.3,
              x: !isMobile ? springX * (0.02 * particle.id) : 0,
              y: !isMobile ? springY * (0.02 * particle.id) : 0,
            }}
            animate={{
              y: [-10, 10, -10],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Main Content Container with responsive styles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={{
          position: "relative",
          zIndex: 2,
          // ✅ Responsive container styles (same logic as CalculatePage)
          maxWidth:
            windowWidth > 1629
              ? "1200px"
              : windowWidth > 1400
              ? "900px"
              : windowWidth > 1200
              ? "800px"
              : windowWidth > 1100
              ? "700px"
              : windowWidth <= 991
              ? "100%"
              : "800px",
          margin: "0 auto",
          padding:
            windowWidth <= 768
              ? "0.5rem"
              : windowWidth <= 991
              ? "1rem"
              : isMobile
              ? "1rem"
              : "2rem",
          marginTop: isMobile ? "0" : "60px",
          x: !isMobile ? springX * 0.02 : 0,
          y: !isMobile ? springY * 0.02 : 0,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <motion.div
          style={{
            textAlign: "center",
            marginBottom: isMobile ? "2rem" : "3rem",
            padding: isMobile ? "0 0.5rem" : "0 1rem",
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1
            style={{
              fontSize: isMobile
                ? "1.5rem"
                : windowWidth <= 1024
                ? "2rem"
                : "2.5rem",
              fontWeight: "700",
              color: "#3b82f6",
              marginBottom: "0.5rem",
              letterSpacing: "-0.025em",
              wordWrap: "break-word",
            }}
          >
            LockChain Token Airdrop
          </h1>
          <p
            style={{
              fontSize: isMobile
                ? "0.9rem"
                : windowWidth <= 1024
                ? "1rem"
                : "1.1rem",
              color: "#94a3b8",
              maxWidth: "600px",
              margin: "0 auto",
              padding: isMobile ? "0 1rem" : "0",
              marginBottom: "1rem",
              lineHeight: "1.5",
            }}
          >
            Claim your allocated $LOCK tokens weekly over 52 weeks
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.5rem 1rem",
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "20px",
              fontSize: isMobile
                ? "0.7rem"
                : windowWidth <= 1024
                ? "0.8rem"
                : "0.9rem",
              fontWeight: "600",
              color: "#3b82f6",
              margin: isMobile ? "0 0.5rem" : "0",
            }}
          >
            📅 Current Week: {currentWeek} of 52
          </div>
        </motion.div>

        {/* Connection Status Banner */}
        {!isConnected && (
          <motion.div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "12px",
              padding: "1rem",
              marginBottom: "2rem",
              textAlign: "center",
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3
              style={{
                color: "#ef4444",
                fontSize: "1.1rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
              }}
            >
              ⚠️ Wallet Not Connected
            </h3>
            <p style={{ color: "#fca5a5", fontSize: "0.9rem" }}>
              Connect your wallet to view and claim your $LOCK token allocation
            </p>
          </motion.div>
        )}

        {/* No Allocation Banner */}
        {isConnected && !userAirdropData && (
          <motion.div
            style={{
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "12px",
              padding: "1rem",
              marginBottom: "2rem",
              textAlign: "center",
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3
              style={{
                color: "#f59e0b",
                fontSize: "1.1rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
              }}
            >
              📋 No Airdrop Allocation
            </h3>
            <p style={{ color: "#fbbf24", fontSize: "0.9rem" }}>
              Your wallet address is not eligible for the LockChain airdrop
            </p>
            <p
              style={{
                color: "#92400e",
                fontSize: "0.8rem",
                marginTop: "0.5rem",
              }}
            >
              Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </motion.div>
        )}

        {/* Stats Cards Grid - Only show if user has allocation */}
        {userAirdropData && (
          <motion.div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : windowWidth <= 1024
                ? "repeat(auto-fit, minmax(200px, 1fr))"
                : "repeat(auto-fit, minmax(250px, 1fr))",
              gap: isMobile ? "1rem" : "1.5rem",
              marginBottom: isMobile ? "2rem" : "3rem",
              padding: isMobile ? "0 0.5rem" : "0",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Total Allocation */}
            <motion.div
              whileHover={!isMobile ? { y: -5, scale: 1.02 } : {}}
              style={{
                background: "rgba(30, 41, 59, 0.8)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "16px",
                padding: isMobile
                  ? "0.8rem"
                  : windowWidth <= 1024
                  ? "1rem"
                  : "1.5rem",
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    width: isMobile ? "35px" : "40px",
                    height: isMobile ? "35px" : "40px",
                    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: "1rem",
                  }}
                >
                  <span style={{ fontSize: isMobile ? "1.2rem" : "1.5rem" }}>
                    🎯
                  </span>
                </div>
                <h3
                  style={{
                    color: "#e2e8f0",
                    fontSize: isMobile ? "1rem" : "1.1rem",
                    fontWeight: "600",
                  }}
                >
                  Total Allocation
                </h3>
              </div>
              <div style={{ marginBottom: "0.5rem" }}>
                <span
                  style={{
                    fontSize: isMobile ? "2rem" : "2.5rem",
                    fontWeight: "800",
                    color: "#3b82f6",
                  }}
                >
                  {totalAllocated.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: isMobile ? "0.9rem" : "1rem",
                }}
              >
                $LOCK Tokens
              </div>
            </motion.div>

            {/* Total Claimed */}
            <motion.div
              whileHover={!isMobile ? { y: -5, scale: 1.02 } : {}}
              style={{
                background: "rgba(30, 41, 59, 0.8)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "16px",
                padding: isMobile
                  ? "0.8rem"
                  : windowWidth <= 1024
                  ? "1rem"
                  : "1.5rem",
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    width: isMobile ? "35px" : "40px",
                    height: isMobile ? "35px" : "40px",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: "1rem",
                  }}
                >
                  <span style={{ fontSize: isMobile ? "1.2rem" : "1.5rem" }}>
                    💰
                  </span>
                </div>
                <h3
                  style={{
                    color: "#e2e8f0",
                    fontSize: isMobile ? "1rem" : "1.1rem",
                    fontWeight: "600",
                  }}
                >
                  Total Claimed
                </h3>
              </div>
              <div style={{ marginBottom: "0.5rem" }}>
                <span
                  style={{
                    fontSize: isMobile ? "2rem" : "2.5rem",
                    fontWeight: "800",
                    color: "#10b981",
                  }}
                >
                  {totalClaimed.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: isMobile ? "0.9rem" : "1rem",
                  marginBottom: "1rem",
                }}
              >
                $LOCK Tokens
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  background: "rgba(71, 85, 105, 0.3)",
                  borderRadius: "10px",
                  overflow: "hidden",
                  height: "8px",
                  marginBottom: "0.5rem",
                }}
              >
                <motion.div
                  style={{
                    height: "100%",
                    background: "linear-gradient(90deg, #10b981, #059669)",
                    borderRadius: "10px",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: isMobile ? "0.7rem" : "0.8rem",
                  color: "#64748b",
                }}
              >
                <span>{progressPercentage}% Claimed</span>
                <span>{claimedWeeks.length} of 52 weeks</span>
              </div>
            </motion.div>

            {/* Remaining Amount */}
            <motion.div
              whileHover={!isMobile ? { y: -5, scale: 1.02 } : {}}
              style={{
                background: "rgba(30, 41, 59, 0.8)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                borderRadius: "16px",
                padding: isMobile
                  ? "0.8rem"
                  : windowWidth <= 1024
                  ? "1rem"
                  : "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    width: isMobile ? "35px" : "40px",
                    height: isMobile ? "35px" : "40px",
                    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: "1rem",
                  }}
                >
                  <span style={{ fontSize: isMobile ? "1.2rem" : "1.5rem" }}>
                    📊
                  </span>
                </div>
                <h3
                  style={{
                    color: "#e2e8f0",
                    fontSize: isMobile ? "1rem" : "1.1rem",
                    fontWeight: "600",
                  }}
                >
                  Remaining
                </h3>
              </div>
              <div style={{ marginBottom: "0.5rem" }}>
                <span
                  style={{
                    fontSize: isMobile ? "2rem" : "2.5rem",
                    fontWeight: "800",
                    color: "#8b5cf6",
                  }}
                >
                  {remainingAmount.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: isMobile ? "0.9rem" : "1rem",
                }}
              >
                $LOCK Tokens
              </div>
            </motion.div>

            {/* Wallet Status */}
            <motion.div
              whileHover={!isMobile ? { y: -5, scale: 1.02 } : {}}
              style={{
                background: "rgba(30, 41, 59, 0.8)",
                backdropFilter: "blur(10px)",
                border: `1px solid ${
                  isConnected
                    ? "rgba(16, 185, 129, 0.3)"
                    : "rgba(239, 68, 68, 0.3)"
                }`,
                borderRadius: "16px",
                padding: isMobile
                  ? "0.8rem"
                  : windowWidth <= 1024
                  ? "1rem"
                  : "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    width: isMobile ? "35px" : "40px",
                    height: isMobile ? "35px" : "40px",
                    background: isConnected
                      ? "linear-gradient(135deg, #10b981, #059669)"
                      : "linear-gradient(135deg, #ef4444, #dc2626)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: "1rem",
                  }}
                >
                  <span style={{ fontSize: isMobile ? "1.2rem" : "1.5rem" }}>
                    {isConnected ? "✅" : "⚠️"}
                  </span>
                </div>
                <h3
                  style={{
                    color: "#e2e8f0",
                    fontSize: isMobile ? "1rem" : "1.1rem",
                    fontWeight: "600",
                  }}
                >
                  Wallet Status
                </h3>
              </div>
              <div
                style={{
                  padding: "0.5rem 1rem",
                  background: isConnected
                    ? "rgba(16, 185, 129, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                  border: `1px solid ${
                    isConnected
                      ? "rgba(16, 185, 129, 0.3)"
                      : "rgba(239, 68, 68, 0.3)"
                  }`,
                  borderRadius: "8px",
                  fontSize: isMobile ? "0.8rem" : "0.9rem",
                  fontWeight: "600",
                  color: isConnected ? "#10b981" : "#ef4444",
                  textAlign: "center",
                }}
              >
                {isConnected ? "Connected & Eligible" : "Not Connected"}
              </div>
              {address && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: isMobile ? "0.7rem" : "0.8rem",
                    color: "#64748b",
                    textAlign: "center",
                    wordBreak: "break-all",
                  }}
                >
                  {`${address.slice(0, 6)}...${address.slice(-4)}`}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Vesting Status - Only show if user has allocation */}
        {userAirdropData && (
          <motion.div
            style={{
              background: "rgba(30, 41, 59, 0.8)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "16px",
              padding: isMobile ? "1.5rem" : "2rem",
              marginBottom: isMobile ? "2rem" : "3rem",
              textAlign: "center",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h3
              style={{
                color: "#3b82f6",
                fontSize: isMobile ? "1.3rem" : "1.5rem",
                fontWeight: "700",
                marginBottom: "1rem",
              }}
            >
              Vesting Status 📈
            </h3>

            <p
              style={{
                color: "#94a3b8",
                fontSize: isMobile ? "0.9rem" : "1rem",
                marginBottom: "1rem",
              }}
            >
              You have tokens ready to claim
            </p>
            <motion.button
              whileHover={{ scale: !isMobile ? 1.05 : 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClaimReward}
              disabled={isClaimingReward}
              style={{
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                border: "none",
                borderRadius: "12px",
                color: "white",
                fontSize: isMobile ? "1rem" : "1.2rem",
                fontWeight: "700",
                padding: isMobile ? "0.8rem 2rem" : "1rem 3rem",
                cursor: isClaimingReward ? "not-allowed" : "pointer",
                boxShadow: "0 10px 30px rgba(59, 130, 246, 0.3)",
                opacity: isClaimingReward ? 0.7 : 1,
              }}
            >
              {isClaimingReward ? "Claiming..." : "Claim Now! 🚀"}
            </motion.button>

            {/* <div
              style={{
                marginTop: "1rem",
                fontSize: isMobile ? "0.8rem" : "0.9rem",
                color: "#64748b",
              }}
            >
              You have 3 active vesting schedules
            </div> */}
          </motion.div>
        )}

        {/* Filter and Search Section - Only show if user has allocation */}
        {userAirdropData && weeklyAllocations.length > 0 && (
          <motion.div
            style={{
              background: "rgba(30, 41, 59, 0.8)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "16px",
              padding: isMobile
                ? "0.8rem"
                : windowWidth <= 1024
                ? "1rem"
                : "1.5rem",
              marginBottom: isMobile ? "2rem" : "3rem",
              margin: isMobile ? "0 0.5rem 2rem 0.5rem" : "0 0 3rem 0",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                flexDirection:
                  isMobile || windowWidth <= 1024 ? "column" : "row",
                gap: isMobile ? "1rem" : windowWidth <= 1024 ? "0.5rem" : "0",
              }}
            >
              <h3
                style={{
                  color: "#3b82f6",
                  fontSize: isMobile
                    ? "1rem"
                    : windowWidth <= 1024
                    ? "1.1rem"
                    : "1.3rem",
                  fontWeight: "700",
                  margin: 0,
                  textAlign: isMobile ? "center" : "left",
                }}
              >
                Weekly Allocations
              </h3>
              {/* Filter Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  justifyContent: isMobile ? "center" : "flex-end",
                  alignItems: "center",
                }}
              >
                {[
                  { key: "all", label: "All", icon: "📋" },
                  { key: "available", label: "Available", icon: "🟢" },
                  { key: "claimed", label: "Claimed", icon: "✅" },
                  { key: "locked", label: "Locked", icon: "🔒" },
                ].map((filter) => (
                  <motion.button
                    key={filter.key}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setFilterStatus(filter.key);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "8px",
                      border: "none",
                      background:
                        filterStatus === filter.key
                          ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                          : "rgba(51, 65, 85, 0.8)",
                      color: filterStatus === filter.key ? "white" : "#94a3b8",
                      fontSize: isMobile ? "0.8rem" : "0.9rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {filter.icon} {filter.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Results count */}
            <p
              style={{
                color: "#64748b",
                fontSize: isMobile ? "0.8rem" : "0.9rem",
                margin: "0 0 1rem 0",
                textAlign: isMobile ? "center" : "left",
              }}
            >
              Showing {paginatedRewards.length} of {filteredRewards.length}{" "}
              weeks
            </p>
          </motion.div>
        )}

        {/* Weekly Rewards Grid - Only show if user has allocation */}
        {userAirdropData && weeklyAllocations.length > 0 && (
          <motion.div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : windowWidth <= 1024
                ? "repeat(auto-fill, minmax(280px, 1fr))"
                : "repeat(auto-fill, minmax(300px, 1fr))",
              gap: isMobile ? "1rem" : "1.5rem",
              marginBottom: isMobile ? "2rem" : "3rem",
              padding: isMobile ? "0 0.5rem" : "0",
            }}
            layout
          >
            <AnimatePresence mode="popLayout">
              {paginatedRewards.map((reward) => {
                // More robust checking
                const isClaimed = claimedWeeks.includes(reward.week);
                const isAvailable =
                  reward.isUnlocked && isConnected && !isClaimed;
                const now = new Date();

                // Ensure unlockDate is a Date object
                const unlockDate =
                  reward.unlockDate instanceof Date
                    ? reward.unlockDate
                    : new Date(reward.unlockDate);

                const daysUntilUnlock = Math.ceil(
                  (unlockDate - now) / (1000 * 60 * 60 * 24)
                );

                return (
                  <motion.div
                    key={reward.week}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={
                      !isMobile && isAvailable ? { y: -5, scale: 1.02 } : {}
                    }
                    style={{
                      background: isClaimed
                        ? "rgba(16, 185, 129, 0.1)"
                        : isAvailable
                        ? "rgba(59, 130, 246, 0.1)"
                        : "rgba(51, 65, 85, 0.5)",
                      border: isClaimed
                        ? "1px solid rgba(16, 185, 129, 0.3)"
                        : isAvailable
                        ? "1px solid rgba(59, 130, 246, 0.3)"
                        : "1px solid rgba(71, 85, 105, 0.5)",
                      borderRadius: "16px",
                      padding: isMobile
                        ? "0.8rem"
                        : windowWidth <= 1024
                        ? "1rem"
                        : "1.5rem",
                      position: "relative",
                      overflow: "hidden",
                      minWidth: 0,
                      boxSizing: "border-box",
                    }}
                  >
                    {/* Current week indicator */}
                    {reward.week === currentWeek && reward.isUnlocked && (
                      <div
                        style={{
                          position: "absolute",
                          top: "0.5rem",
                          left: "0.5rem",
                          background:
                            "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                          color: "white",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "8px",
                          fontSize: "0.7rem",
                          fontWeight: "600",
                        }}
                      >
                        📅 CURRENT
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1rem",
                        marginTop:
                          reward.week === currentWeek && reward.isUnlocked
                            ? "1.5rem"
                            : "0",
                      }}
                    >
                      <h3
                        style={{
                          color: "#e2e8f0",
                          fontSize: isMobile ? "1.1rem" : "1.2rem",
                          fontWeight: "700",
                        }}
                      >
                        Week {reward.week}
                      </h3>
                      <div
                        style={{
                          padding: "0.3rem 0.8rem",
                          borderRadius: "20px",
                          fontSize: isMobile ? "0.7rem" : "0.8rem",
                          fontWeight: "600",
                          background: isClaimed
                            ? "rgba(16, 185, 129, 0.2)"
                            : isAvailable
                            ? "rgba(59, 130, 246, 0.2)"
                            : "rgba(71, 85, 105, 0.3)",
                          color: isClaimed
                            ? "#10b981"
                            : isAvailable
                            ? "#3b82f6"
                            : "#94a3b8",
                        }}
                      >
                        {isClaimed
                          ? "CLAIMED"
                          : isAvailable
                          ? "AVAILABLE"
                          : "LOCKED"}
                      </div>
                    </div>

                    <div style={{ marginBottom: "1.5rem" }}>
                      <div
                        style={{
                          fontSize: isMobile ? "1.8rem" : "2.2rem",
                          fontWeight: "800",
                          color: isClaimed
                            ? "#10b981"
                            : isAvailable
                            ? "#3b82f6"
                            : "#64748b",
                          marginBottom: "0.3rem",
                        }}
                      >
                        {reward.amount.toFixed(4)}
                      </div>
                      <div
                        style={{
                          color: "#94a3b8",
                          fontSize: isMobile ? "0.9rem" : "1rem",
                          fontWeight: "600",
                        }}
                      >
                        $LOCK TOKENS
                      </div>
                    </div>

                    {/* Updated button logic */}
                    {isAvailable && (
                      <motion.button
                        whileHover={{ scale: !isMobile ? 1.05 : 1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleClaimReward(reward.week)}
                        disabled={isClaimingReward}
                        style={{
                          width: "100%",
                          padding: "0.8rem",
                          background:
                            "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                          border: "none",
                          borderRadius: "10px",
                          color: "white",
                          fontSize: isMobile ? "0.9rem" : "1rem",
                          fontWeight: "600",
                          cursor: isClaimingReward ? "not-allowed" : "pointer",
                          opacity: isClaimingReward ? 0.7 : 1,
                        }}
                      >
                        {isClaimingReward ? "Claiming..." : "Claim Reward"}
                      </motion.button>
                    )}

                    {isClaimed && (
                      <div
                        style={{
                          width: "100%",
                          padding: "0.8rem",
                          background: "rgba(16, 185, 129, 0.2)",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          borderRadius: "10px",
                          color: "#10b981",
                          fontSize: isMobile ? "0.9rem" : "1rem",
                          fontWeight: "600",
                          textAlign: "center",
                        }}
                      >
                        ✅ Claimed
                      </div>
                    )}

                    {!isAvailable && !isClaimed && (
                      <div
                        style={{
                          width: "100%",
                          padding: "0.8rem",
                          background: "rgba(71, 85, 105, 0.3)",
                          border: "1px dashed rgba(71, 85, 105, 0.5)",
                          borderRadius: "10px",
                          color: "#64748b",
                          fontSize: isMobile ? "0.9rem" : "1rem",
                          fontWeight: "600",
                          textAlign: "center",
                        }}
                      >
                        {!isConnected && reward.isUnlocked ? (
                          <>
                            🔓 Connect Wallet
                            <div
                              style={{
                                fontSize: "0.7rem",
                                marginTop: "0.2rem",
                                opacity: 0.7,
                              }}
                            >
                              Unlocked & Ready to Claim
                            </div>
                          </>
                        ) : !reward.isUnlocked ? (
                          <>
                            🔒 Unlocks in{" "}
                            {daysUntilUnlock > 0
                              ? `${daysUntilUnlock} days`
                              : "Soon"}
                            <div
                              style={{
                                fontSize: "0.7rem",
                                marginTop: "0.2rem",
                                opacity: 0.7,
                              }}
                            >
                              {unlockDate.toLocaleDateString("en-US", {
                                weekday: "short",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                              {daysUntilUnlock === 0 && " (Today!)"}
                              {daysUntilUnlock === 1 && " (Tomorrow)"}
                            </div>
                          </>
                        ) : (
                          <>
                            ⚠️ Wallet Required
                            <div
                              style={{
                                fontSize: "0.7rem",
                                marginTop: "0.2rem",
                                opacity: 0.7,
                              }}
                            >
                              Connect to claim rewards
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Pagination - Only show if user has allocation */}
        {userAirdropData && totalPages > 1 && (
          <motion.div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: isMobile ? "2rem" : "3rem",
              padding: isMobile ? "0 0.5rem" : "0",
              flexWrap: "wrap",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={{
                padding: "0.5rem 1rem",
                background: "rgba(51, 65, 85, 0.8)",
                border: "1px solid rgba(71, 85, 105, 0.5)",
                borderRadius: "8px",
                color: currentPage === 1 ? "#64748b" : "#e2e8f0",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: isMobile ? "0.8rem" : "0.9rem",
              }}
            >
              Previous
            </motion.button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <motion.button
                key={page}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage(page)}
                style={{
                  padding: "0.5rem 0.8rem",
                  background:
                    currentPage === page
                      ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                      : "rgba(51, 65, 85, 0.8)",
                  border: "1px solid rgba(71, 85, 105, 0.5)",
                  borderRadius: "8px",
                  color: currentPage === page ? "white" : "#e2e8f0",
                  cursor: "pointer",
                  fontSize: isMobile ? "0.8rem" : "0.9rem",
                }}
              >
                {page}
              </motion.button>
            ))}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              style={{
                padding: "0.5rem 1rem",
                background: "rgba(51, 65, 85, 0.8)",
                border: "1px solid rgba(71, 85, 105, 0.5)",
                borderRadius: "8px",
                color: currentPage === totalPages ? "#64748b" : "#e2e8f0",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontSize: isMobile ? "0.8rem" : "0.9rem",
              }}
            >
              Next
            </motion.button>
          </motion.div>
        )}
      </motion.div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
              padding: "1rem",
            }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              style={{
                background: "linear-gradient(135deg, #0f172a, #1e293b)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "20px",
                padding: "2rem",
                textAlign: "center",
                maxWidth: "400px",
                width: "100%",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                }}
              >
                <span style={{ fontSize: "2rem" }}>🎉</span>
              </div>
              <h3
                style={{
                  color: "#10b981",
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  marginBottom: "0.5rem",
                }}
              >
                Reward Claimed!
              </h3>
              <p style={{ color: "#94a3b8", marginBottom: "1rem" }}>
                Your $LOCK tokens have been successfully claimed and will be
                transferred to your wallet.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSuccessModal(false)}
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none",
                  borderRadius: "10px",
                  color: "white",
                  fontSize: "1rem",
                  fontWeight: "600",
                  padding: "0.8rem 2rem",
                  cursor: "pointer",
                }}
              >
                Continue
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AirDrop;
