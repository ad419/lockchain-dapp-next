import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { CopyToClipboard } from "react-copy-to-clipboard";
import styles from "../styles/welcome.module.css";
import WelcomeSlider from "./WelcomeSlider";
import "../styles/welcomeSlider.css";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";

const CONTRACT_ADDRESS = "0xB7403A562A8F2cD9d5115E1c59E247f305A010f0";
const MATCH_LINK =
  "https://matcha.xyz/tokens/base/0xb7403a562a8f2cd9d5115e1c59e247f305a010f0";
const LOCKSWAP_LINK = "/swap";

// Add or modify these constants at the top of your file (after existing imports)
const TEST_MODE = false; // Change to false for actual 9 PM EST launch
const TEST_DURATION = 10; // Shorter countdown for testing (seconds)
const ACTUAL_DURATION = 10 * 60; // 10 minutes in seconds

// Generate random stars for background
const generateStars = (count) => {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    opacity: Math.random() * 0.7 + 0.3,
    animationDuration: Math.random() * 10 + 10,
  }));
};

// Calculate time remaining until 11 PM EST
const getTimeUntilElevenPMEST = () => {
  const now = new Date();

  // Create a date object for 11 PM EST today
  const estTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const elevenPMEST = new Date(estTime);
  elevenPMEST.setHours(23, 0, 0, 0); // Set to 11 PM EST (23:00)

  // Convert back to local time
  const localElevenPM = new Date(elevenPMEST.toLocaleString("en-US"));

  // If it's already past 11 PM EST, set to 11 PM EST tomorrow
  if (now > localElevenPM) {
    elevenPMEST.setDate(elevenPMEST.getDate() + 1);
    const nextDayLocalElevenPM = new Date(elevenPMEST.toLocaleString("en-US"));
    return Math.floor((nextDayLocalElevenPM - now) / 1000); // seconds until 11 PM EST tomorrow
  }

  return Math.floor((localElevenPM - now) / 1000); // seconds until 11 PM EST today
};

// Calculate time remaining until 11 PM CEST
const getTimeUntilElevenPMCEST = () => {
  const now = new Date();

  // Create a date object for 11 PM CEST today
  const cestTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Paris" })
  );
  const elevenPMCEST = new Date(cestTime);
  elevenPMCEST.setHours(23, 0, 0, 0); // Set to 11 PM CEST (23:00)

  // Convert back to local time
  const localElevenPM = new Date(elevenPMCEST.toLocaleString("en-US"));

  // If it's already past 11 PM CEST, set to 11 PM CEST tomorrow
  if (now > localElevenPM) {
    elevenPMCEST.setDate(elevenPMCEST.getDate() + 1);
    const nextDayLocalElevenPM = new Date(elevenPMCEST.toLocaleString("en-US"));
    return Math.floor((nextDayLocalElevenPM - now) / 1000); // seconds until 11 PM CEST tomorrow
  }

  return Math.floor((localElevenPM - now) / 1000); // seconds until 11 PM CEST today
};

// Check if user is within the valid window (11 PM EST to 11:10 PM EST)
const isWithinValidTimeWindow = () => {
  if (TEST_MODE) return true; // Always valid in test mode

  const now = new Date();

  // Get current time in EST
  const estTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const elevenPMEST = new Date(estTime);
  elevenPMEST.setHours(23, 0, 0, 0); // Set to 11 PM EST (23:00)

  // Convert back to local time
  const localElevenPM = new Date(elevenPMEST.toLocaleString("en-US"));

  // If 11 PM EST is in the future, user is too early
  if (now < localElevenPM) return false;

  // Calculate 11:10 PM EST
  const tenMinutesAfterEST = new Date(elevenPMEST);
  tenMinutesAfterEST.setMinutes(elevenPMEST.getMinutes() + 10);

  // Convert to local time
  const localTenMinutesAfter = new Date(
    tenMinutesAfterEST.toLocaleString("en-US")
  );

  // If current time is after 11:10 PM EST, user is too late
  if (now > localTenMinutesAfter) return false;

  // User is within the valid window
  return true;
};

export default function Welcome({ onComplete }) {
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);
  const screenShakeControls = useAnimation(); // For controlling screen shake animation
  const [shakingElements, setShakingElements] = useState(false);

  // Determine if countdown should be shown based on time
  const [isValidUser, setIsValidUser] = useState(false);
  const [waitingForNinePM, setWaitingForNinePM] = useState(false);
  const [timeUntilStart, setTimeUntilStart] = useState(0);

  // For countdown timer
  const [timeLeft, setTimeLeft] = useState(
    TEST_MODE ? TEST_DURATION : ACTUAL_DURATION
  );

  const [copied, setCopied] = useState(false);
  const [showCopiedNotification, setShowCopiedNotification] = useState(false);
  const [stars] = useState(() => generateStars(50));
  const [floatingParticles] = useState(() =>
    Array.from({ length: 20 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20 + 20,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.5 + 0.3,
    }))
  );

  // Ref for digital rain effect
  const canvasRef = useRef(null);

  // For contract reveal and confetti effects
  const [countdownComplete, setCountdownComplete] = useState(false);
  const [showContractInfo, setShowContractInfo] = useState(false);
  const [showSecondConfetti, setShowSecondConfetti] = useState(false);
  const contractRevealControls = useAnimation();

  // Add this new state and effect to handle the active users count

  // Add these to your existing state declarations:
  const [activeUsers, setActiveUsers] = useState(136); // Starting with a lower number
  const [usersTrend, setUsersTrend] = useState("up"); // Default trend is up as we're growing
  const [lastUserChange, setLastUserChange] = useState(0); // Track last change for animation

  // Check if user is within valid time window
  useEffect(() => {
    if (TEST_MODE) {
      // Test mode - always valid
      setIsValidUser(true);
    } else {
      // Check if user is in valid time window
      const valid = isWithinValidTimeWindow();
      setIsValidUser(valid);

      if (!valid) {
        const now = new Date();

        // Get current time in CEST
        const cestTime = new Date(
          now.toLocaleString("en-US", { timeZone: "Europe/Paris" })
        );
        const elevenPMCEST = new Date(cestTime);
        elevenPMCEST.setHours(23, 0, 0, 0); // Set to 11 PM CEST (23:00)

        // Convert back to local time
        const localElevenPM = new Date(elevenPMCEST.toLocaleString("en-US"));

        if (now < localElevenPM) {
          // If it's before 11 PM CEST, show countdown until 11 PM CEST
          setWaitingForNinePM(true);
          setTimeUntilStart(getTimeUntilElevenPMCEST());
        } else {
          // User arrived too late
          // Skip welcome screen after a brief message
          setTimeout(() => {
            onComplete();
          }, 3000);
        }
      }
    }
  }, [onComplete]);

  // Countdown to 9 PM if needed
  useEffect(() => {
    if (!waitingForNinePM) return;

    const timer = setInterval(() => {
      const remaining = getTimeUntilElevenPMCEST();
      setTimeUntilStart(remaining);

      if (remaining <= 1) {
        clearInterval(timer);
        setWaitingForNinePM(false);
        setIsValidUser(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [waitingForNinePM]);

  // Digital rain effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Digital rain characters
    const chars = "01".split("");
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = [];

    // Initialize drops
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.floor(Math.random() * -100);
    }

    // Draw function
    const draw = () => {
      // Semi-transparent black background to create trail effect
      ctx.fillStyle = "rgba(0, 3, 15, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(79, 188, 255, 0.3)"; // Light blue color
      ctx.font = `${fontSize}px monospace`;

      // Loop through drops
      for (let i = 0; i < drops.length; i++) {
        // Random character
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reset drop when it reaches bottom or randomly
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.98) {
          drops[i] = 0;
        }

        // Move drops down
        drops[i]++;
      }
    };

    // Animate
    const interval = setInterval(draw, 70);

    return () => clearInterval(interval);
  }, []);

  // Handle window resize for canvas
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 10-minute countdown timer - only active if user is valid
  useEffect(() => {
    if (!isValidUser) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);

          // Mark countdown as complete
          setCountdownComplete(true);

          // First stage: Screen shake and first confetti
          setShakingElements(true);
          setShowConfetti(true);
          screenShakeControls.start({
            x: [0, -15, 15, -12, 12, -8, 8, -5, 5, -2, 2, 0],
            transition: { duration: 1.2, ease: "easeInOut" },
          });

          // Second stage: Reveal contract info with animation
          setTimeout(() => {
            setShowContractInfo(true);
            contractRevealControls.start({
              opacity: [0, 1],
              y: [30, 0],
              transition: { duration: 0.8, ease: "easeOut" },
            });

            // Third stage: Second confetti burst
            setTimeout(() => {
              setShowSecondConfetti(true);
            }, 800);

            // Final stage: Auto-transition to dashboard after longer delay
            setTimeout(() => {
              onComplete();
            }, 8000);
          }, 1500);

          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isValidUser, onComplete, screenShakeControls, contractRevealControls]);

  // Final countdown animation effect
  useEffect(() => {
    // Add special animation when countdown is near the end
    if (timeLeft <= 10 && timeLeft > 0) {
      const countdownEl = document.querySelector(`.${styles.countdownTimer}`);
      if (countdownEl) {
        // Add pulsating effect with inline style
        countdownEl.style.animation = "pulse 0.75s infinite alternate";
        countdownEl.style.boxShadow =
          "0 0 30px rgba(79, 188, 255, 0.9), inset 0 0 15px rgba(0, 0, 0, 0.3)";
      }
    } else {
      const countdownEl = document.querySelector(`.${styles.countdownTimer}`);
      if (countdownEl) {
        countdownEl.style.animation = "";
        countdownEl.style.boxShadow = "";
      }
    }
  }, [timeLeft]);

  // Add this effect after your other useEffects
  useEffect(() => {
    // Update user count at regular intervals to show growth
    const interval = setInterval(() => {
      // Generate a number around 10 with small variations (8-12 range)
      const baseIncrease = 10;
      const variation = Math.floor(Math.random() * 5) - 2; // Random number between -2 and +2
      const increase = baseIncrease + variation;

      // Very occasionally show a small decrease to make it look natural (10% chance)
      const shouldDecrease = Math.random() < 0.1;
      const change = shouldDecrease ? -Math.floor(Math.random() * 3) : increase;

      // Update the count with a cap at 2100 to keep it realistic
      setActiveUsers((prevCount) => {
        const newCount = prevCount + change;
        if (newCount > 2100) return 2100; // Cap at 2100
        return newCount;
      });

      // Set trend direction for animation
      setUsersTrend(change >= 0 ? "up" : "down");
      setLastUserChange(change);
    }, 2500 + Math.random() * 1000); // Random interval between 2.5-3.5 seconds

    return () => clearInterval(interval);
  }, []);

  // Format time as MM:SS or HH:MM:SS
  const formatTime = (seconds) => {
    // For times over an hour, use HH:MM:SS format
    if (seconds > 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      // Format as MM:SS
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
  };

  // Handle external link clicks with redirection to dashboard
  const handleExternalLinkClick = () => {
    // Create notification
    const notification = document.createElement("div");
    notification.textContent = "Redirecting to dashboard...";
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.85);
      color: #4FBCFF;
      padding: 20px 30px;
      border-radius: 8px;
      box-shadow: 0 0 30px rgba(79, 188, 255, 0.5);
      z-index: 9999;
      font-size: 18px;
      font-weight: 500;
    `;
    document.body.appendChild(notification);

    // Redirect after a brief delay
    setTimeout(() => {
      document.body.removeChild(notification);
      onComplete();
    }, 1500);
  };

  // filepath: d:\codes\lockchain-dapp-next\app\components\Welcome.js
  // Add this component after your imports

  // TypewriterText component for text animation
  const TypewriterText = ({ text, delay = 0.05, startDelay = 0 }) => {
    const [displayedText, setDisplayedText] = useState("");
    const textRef = useRef(text);

    useEffect(() => {
      let timeout;
      let currentIndex = 0;

      const animateText = () => {
        if (currentIndex <= textRef.current.length) {
          setDisplayedText(textRef.current.substring(0, currentIndex));
          currentIndex++;
          timeout = setTimeout(animateText, delay * 1000);
        }
      };

      // Start animation after the start delay
      const initialTimeout = setTimeout(() => {
        animateText();
      }, startDelay * 1000);

      return () => {
        clearTimeout(timeout);
        clearTimeout(initialTimeout);
      };
    }, [delay, startDelay]);

    return <span>{displayedText}</span>;
  };

  // Handle copy animation
  const handleCopy = () => {
    setCopied(true);
    setShowCopiedNotification(true);

    // Short delay to show "copied" message before redirecting
    setTimeout(() => {
      setCopied(false);
      setShowCopiedNotification(false);
      handleExternalLinkClick(); // Reuse the same redirect logic
    }, 2000);
  };

  // Skip countdown for testing
  const skipCountdown = () => {
    // Mark countdown as complete
    setCountdownComplete(true);

    // Trigger screen shake and first confetti
    setShakingElements(true);
    setShowConfetti(true);
    screenShakeControls.start({
      x: [0, -15, 15, -12, 12, -8, 8, -5, 5, -2, 2, 0],
      transition: { duration: 1.2, ease: "easeInOut" },
    });

    // Show contract info after a delay
    setTimeout(() => {
      setShowContractInfo(true);
      contractRevealControls.start({
        opacity: [0, 1],
        y: [30, 0],
        transition: { duration: 0.8, ease: "easeOut" },
      });

      // Second confetti
      setTimeout(() => {
        setShowSecondConfetti(true);
      }, 800);

      // Auto-transition after a longer delay
      setTimeout(() => {
        onComplete();
      }, 8000);
    }, 1500);
  };

  // Define styles for shaking elements
  const getShakingStyle = (baseStyle = {}) => {
    if (!shakingElements) return baseStyle;

    return {
      ...baseStyle,
      animation: "glitch 0.3s cubic-bezier(.25,.46,.45,.94) both",
      animationIterationCount: "3",
    };
  };

  // Define keyframes for glitch and pulse animations (since we can't add them to CSS file)
  const glitchKeyframes = `
    @keyframes glitch {
      0% { transform: translate(0); }
      20% { transform: translate(-2px, 2px); }
      40% { transform: translate(-2px, -2px); }
      60% { transform: translate(2px, 2px); }
      80% { transform: translate(2px, -2px); }
      100% { transform: translate(0); }
    }
  `;

  const pulseKeyframes = `
    @keyframes pulse {
      from {
        transform: scale(1);
        box-shadow: 0 0 20px rgba(79, 188, 255, 0.6), inset 0 0 10px rgba(0, 0, 0, 0.3);
      }
      to {
        transform: scale(1.05);
        box-shadow: 0 0 30px rgba(79, 188, 255, 0.9), inset 0 0 15px rgba(0, 0, 0, 0.3);
      }
    }
  `;

  return (
    <motion.div
      className={styles.welcomeFullScreen}
      animate={screenShakeControls}
      style={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Add keyframes for animations */}
      <style
        dangerouslySetInnerHTML={{ __html: glitchKeyframes + pulseKeyframes }}
      />

      {/* Confetti animation */}
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={350} // More confetti pieces
          gravity={0.2} // Slower falling for extended effect
          recycle={false}
          colors={[
            "#4FBCFF",
            "#5366FA",
            "#2196F3",
            "#00BCD4",
            "#FFFFFF",
            "#FFC107",
            "#FF5722",
            "#8BC34A",
            "#9C27B0",
          ]} // More colors
          tweenDuration={8000} // Longer animation
          opacity={0.9}
        />
      )}

      {/* Add second confetti - different colors and pattern */}
      {showSecondConfetti && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={250}
          gravity={0.15}
          recycle={false}
          colors={[
            "#FF5722",
            "#8BC34A",
            "#9C27B0",
            "#FF9800",
            "#FFEB3B",
            "#E91E63",
          ]}
          tweenDuration={8000}
          opacity={0.9}
          initialVelocityY={-3}
        />
      )}

      {/* Digital Rain Canvas Background */}
      <canvas
        ref={canvasRef}
        className={styles.digitalRainCanvas}
        style={
          shakingElements
            ? {
                filter: "brightness(1.3) contrast(1.1)",
                transition: "filter 0.5s ease",
              }
            : {}
        }
      ></canvas>

      {/* Background Elements */}
      <div className={styles.backgroundElements}>
        {/* Background elements - unchanged */}
        <div className={styles.darkOverlay}></div>
        <div
          className={`${styles.glowOrb} ${styles.glowOrbPrimary}`}
          style={
            shakingElements
              ? {
                  opacity: 0.9,
                  filter: "blur(80px)",
                  transform: "scale(1.2)",
                  transition: "all 0.8s ease",
                }
              : {}
          }
        ></div>
        <div
          className={`${styles.glowOrb} ${styles.glowOrbSecondary}`}
          style={
            shakingElements
              ? {
                  opacity: 9,
                  filter: "blur(100px)",
                  transform: "scale(1.3)",
                  transition: "all 0.8s ease",
                }
              : {}
          }
        ></div>

        {/* Star Field */}
        {stars.map((star, index) => (
          <motion.div
            key={`star-${index}`}
            className={styles.star}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: shakingElements ? star.opacity * 2 : star.opacity,
              transition: "opacity 0.8s ease",
            }}
            animate={{
              opacity: shakingElements
                ? [star.opacity * 2, star.opacity * 3, star.opacity * 2]
                : [star.opacity, star.opacity * 1.5, star.opacity],
              scale: shakingElements ? [1, 1.5, 1] : [1, 1.2, 1],
            }}
            transition={{
              duration: shakingElements
                ? star.animationDuration * 0.7
                : star.animationDuration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Rest of components unchanged */}
      </div>

      <div className={styles.welcomeContainer} style={getShakingStyle()}>
        {/* Different content based on state - unchanged */}
        {waitingForNinePM ? (
          // Waiting for 9 PM Screen - unchanged
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={styles.welcomeCard}
            style={getShakingStyle()}
          >
            <motion.div
              className={styles.logoSection}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className={styles.logoContainer}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <motion.div
                  animate={{ rotateY: [0, 360] }}
                  transition={{
                    repeat: Infinity,
                    duration: 20,
                    ease: "linear",
                  }}
                  className={styles.logoWrapper}
                >
                  <Image
                    src="https://i.ibb.co/fY6cgSpf/logo.png"
                    alt="LockChain Logo"
                    width={60}
                    height={60}
                    className={styles.logo}
                  />
                </motion.div>
                <div className={styles.logoGlow}></div>
              </motion.div>

              <motion.h1
                className={styles.welcomeTitle}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Welcome to LockChain
              </motion.h1>
            </motion.div>

            <motion.div
              className={styles.countdownContainer}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <motion.div className={styles.countdownLabel}>
                Event begins in
              </motion.div>
              <motion.div
                className={styles.countdownTimer}
                animate={{
                  boxShadow: [
                    "0 0 15px rgba(79, 188, 255, 0.4)",
                    "0 0 25px rgba(79, 188, 255, 0.8)",
                    "0 0 15px rgba(79, 188, 255, 0.4)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className={styles.countdownDigits}>
                  {formatTime(timeUntilStart)}
                </div>
                <motion.div
                  className={styles.countdownProgress}
                  initial={{ width: "100%" }}
                  animate={{ width: `0%` }}
                  transition={{
                    duration: timeUntilStart,
                    ease: "linear",
                  }}
                ></motion.div>
              </motion.div>
            </motion.div>

            <motion.div
              className={styles.waitingMessage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <p>Please wait for the official launch time at 9 PM.</p>
              <p>The screen will automatically update when the event begins.</p>
            </motion.div>
          </motion.div>
        ) : !isValidUser ? (
          // Too Late Message
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={styles.welcomeCard}
            style={getShakingStyle()}
          >
            <motion.div
              className={styles.logoSection}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.h1
                className={styles.welcomeTitle}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Welcome to LockChain
              </motion.h1>
            </motion.div>

            <motion.div
              className={styles.lateMessage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <h2>Event Already Started</h2>
              <p>
                You've arrived after the countdown window has closed.
                Redirecting you to the main application...
              </p>
              <div className={styles.loadingIndicator}></div>
            </motion.div>
          </motion.div>
        ) : (
          // Normal Welcome with Countdown
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 15,
              delay: 0.3,
            }}
            className={styles.welcomeCard}
            style={getShakingStyle({
              boxShadow: shakingElements
                ? "0 0 40px rgba(79, 188, 255, 0.9), 0 0 60px rgba(83, 102, 250, 0.6)"
                : undefined,
              transition: "box-shadow 0.5s ease",
            })}
          >
            {/* Lock Animation Effect */}
            <div className={styles.lockAnimation}>
              <motion.div
                className={styles.lockIconContainer}
                initial={{ scale: 0 }}
                animate={{
                  scale: [0, 1.2, 1],
                  rotate: [0, 15, -15, 10, -10, 5, -5, 0],
                }}
                transition={{ duration: 1.5, delay: 0.5 }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={styles.lockIcon}
                >
                  <motion.path
                    d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: 0.8 }}
                  />
                  <motion.path
                    d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: 1 }}
                  />
                </svg>
                <motion.div
                  className={styles.lockPulse}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0.8, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                />
              </motion.div>
            </div>

            {/* Logo Section */}
            <motion.div
              className={styles.logoSection}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <motion.div
                className={styles.logoContainer}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.6,
                }}
              >
                <motion.div
                  animate={{ rotateY: [0, 360] }}
                  transition={{
                    repeat: Infinity,
                    duration: 20,
                    ease: "linear",
                  }}
                  className={styles.logoWrapper}
                >
                  <Image
                    src="https://i.ibb.co/fY6cgSpf/logo.png" // Use local image for reliability
                    alt="LockChain Logo"
                    width={60} // Increased from 50
                    height={60} // Increased from 50
                    className={styles.logo}
                  />
                </motion.div>
                <div className={styles.logoGlow}></div>
              </motion.div>

              <motion.h1
                className={styles.welcomeTitle}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                Welcome to LockChain
              </motion.h1>
            </motion.div>

            {/* Countdown Timer with Enhanced Effects */}
            <motion.div
              className={styles.countdownContainer}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.5 }}
            >
              <motion.div
                className={styles.countdownLabel}
                animate={{
                  textShadow: [
                    "0 0 10px rgba(79, 188, 255, 0.2)",
                    "0 0 15px rgba(79, 188, 255, 0.6)",
                    "0 0 10px rgba(79, 188, 255, 0.2)",
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {TEST_MODE
                  ? "Test mode - Access unlocks in"
                  : "Access unlocks in"}
              </motion.div>
              <motion.div
                className={styles.countdownTimer}
                animate={{
                  boxShadow: [
                    "0 0 15px rgba(79, 188, 255, 0.4)",
                    "0 0 25px rgba(79, 188, 255, 0.8)",
                    "0 0 15px rgba(79, 188, 255, 0.4)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className={styles.countdownDigits}>
                  {formatTime(timeLeft)}
                </div>
                <motion.div
                  className={styles.countdownProgress}
                  initial={{ width: "100%" }}
                  animate={{
                    width: `${
                      (timeLeft /
                        (TEST_MODE ? TEST_DURATION : ACTUAL_DURATION)) *
                      100
                    }%`,
                  }}
                  transition={{ duration: 0.5 }}
                ></motion.div>
              </motion.div>
            </motion.div>

            {/* Active Users Counter */}
            {!countdownComplete && (
              <motion.div
                className={styles.activeUsersContainer}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                style={{
                  background: "rgba(8, 15, 40, 0.5)",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  marginTop: "15px",
                  marginBottom: "15px",
                  border: "1px solid rgba(79, 188, 255, 0.2)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Background pulse effect */}
                <motion.div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background:
                      "radial-gradient(circle at center, rgba(79, 188, 255, 0.15), transparent 70%)",
                    zIndex: 0,
                  }}
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: "rgba(79, 188, 255, 0.8)",
                        boxShadow: "0 0 10px rgba(79, 188, 255, 0.8)",
                        paddingBottom: "12px",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "rgba(255, 255, 255, 0.9)",
                      }}
                    >
                      Active Users Waiting
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <motion.div
                      animate={{
                        y: usersTrend === "up" ? [-3, 0] : [3, 0],
                        opacity: [0.7, 1],
                      }}
                      transition={{ duration: 0.4 }}
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      {usersTrend === "up" ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12 5L12 19"
                            stroke="rgba(100, 220, 100, 0.8)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M19 12L12 5L5 12"
                            stroke="rgba(100, 220, 100, 0.8)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12 19L12 5"
                            stroke="rgba(255, 100, 100, 0.8)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M5 12L12 19L19 12"
                            stroke="rgba(255, 100, 100, 0.8)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </motion.div>

                    <motion.span
                      style={{
                        fontSize: "18px",
                        fontWeight: "700",
                        fontFamily: "monospace",
                        color:
                          usersTrend === "up"
                            ? "rgba(100, 220, 100, 1)"
                            : "rgba(255, 100, 100, 1)",
                        textShadow:
                          usersTrend === "up"
                            ? "0 0 8px rgba(100, 220, 100, 0.5)"
                            : "0 0 8px rgba(255, 100, 100, 0.5)",
                        transition: "color 0.3s ease",
                      }}
                      key={activeUsers} // Force re-render on change
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {activeUsers.toLocaleString()}
                    </motion.span>
                  </div>
                </div>

                {/* Bottom activity indicator */}
                <motion.div
                  style={{
                    width: "100%",
                    height: "2px",
                    background:
                      "linear-gradient(to right, transparent, rgba(79, 188, 255, 0.5), transparent)",
                    marginTop: "12px",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <motion.div
                    style={{
                      position: "absolute",
                      height: "100%",
                      width: "30%",
                      background: "rgba(79, 188, 255, 0.8)",
                      boxShadow: "0 0 8px rgba(79, 188, 255, 0.8)",
                    }}
                    animate={{
                      left: ["0%", "70%", "0%"],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>

                {/* Last update message */}
                <div
                  style={{
                    fontSize: "11px",
                    opacity: 0.7,
                    textAlign: "center",
                    marginTop: "8px",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {lastUserChange > 0 ? (
                    <motion.span
                      key={`up-${activeUsers}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.7 }}
                      transition={{ duration: 0.5 }}
                    >
                      {lastUserChange} new users joined
                    </motion.span>
                  ) : lastUserChange < 0 ? (
                    <motion.span
                      key={`down-${activeUsers}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.7 }}
                      transition={{ duration: 0.5 }}
                    >
                      {Math.abs(lastUserChange)} users left queue
                    </motion.span>
                  ) : (
                    <span>Monitoring activity...</span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Slider Section - only shown during countdown */}
            {!countdownComplete && (
              <motion.div
                className={styles.sliderContainer}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.5 }}
              >
                <WelcomeSlider />
              </motion.div>
            )}

            {/* Contract Information - hidden during countdown, revealed after */}
            {countdownComplete ? (
              <motion.div
                className={styles.contractLinksSection}
                initial={{ opacity: 0, y: 30 }}
                animate={contractRevealControls}
                style={{
                  background: "rgba(8, 15, 40, 0.8)",
                  boxShadow: "0 0 30px rgba(79, 188, 255, 0.3)",
                  padding: "18px",
                  borderRadius: "12px",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(79, 188, 255, 0.3)",
                  marginTop: "20px",
                  maxHeight: "60vh",
                  overflowY: "auto",
                  msOverflowStyle: "none",
                  scrollbarWidth: "none",
                  position: "relative",
                }}
              >
                {/* Hide scrollbar */}
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                  .${styles.contractLinksSection}::-webkit-scrollbar {
                    display: none;
                  }
                `,
                  }}
                />

                {/* Animated decorative elements */}
                <motion.div
                  style={{
                    position: "absolute",
                    top: "10px",
                    left: "10px",
                    width: "40px",
                    height: "40px",
                    borderTop: "2px solid rgba(79, 188, 255, 0.5)",
                    borderLeft: "2px solid rgba(79, 188, 255, 0.5)",
                    borderTopLeftRadius: "8px",
                    zIndex: 1,
                  }}
                  animate={{
                    opacity: [0.2, 0.8, 0.2],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                <motion.div
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    right: "10px",
                    width: "40px",
                    height: "40px",
                    borderBottom: "2px solid rgba(79, 188, 255, 0.5)",
                    borderRight: "2px solid rgba(79, 188, 255, 0.5)",
                    borderBottomRightRadius: "8px",
                    zIndex: 1,
                  }}
                  animate={{
                    opacity: [0.2, 0.8, 0.2],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1.5,
                  }}
                />

                {/* Pulsing circles in background */}
                <motion.div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "10%",
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(79, 188, 255, 0.15), transparent 70%)",
                    zIndex: 0,
                  }}
                  animate={{
                    scale: [1, 1.5, 1],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                <motion.div
                  style={{
                    position: "absolute",
                    bottom: "20%",
                    right: "15%",
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(83, 102, 250, 0.15), transparent 70%)",
                    zIndex: 0,
                  }}
                  animate={{
                    scale: [1, 1.3, 1],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2,
                  }}
                />

                {/* Access Granted Header with animated underline */}
                <motion.div
                  style={{
                    position: "relative",
                    textAlign: "center",
                    marginBottom: "15px",
                    zIndex: 2,
                  }}
                >
                  <motion.h2
                    style={{
                      fontSize: "24px",
                      textAlign: "center",
                      color: "#4FBCFF",
                      marginBottom: "8px",
                      textShadow: "0 0 10px rgba(79, 188, 255, 0.8)",
                      display: "inline-block",
                    }}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    Access Granted
                  </motion.h2>

                  <motion.div
                    style={{
                      height: "2px",
                      background:
                        "linear-gradient(90deg, transparent, rgba(79, 188, 255, 0.8), transparent)",
                      width: "150px",
                      margin: "0 auto",
                    }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                  />
                </motion.div>

                {/* Success message with typewriter effect */}
                <motion.div
                  style={{
                    textAlign: "center",
                    marginBottom: "12px",
                    fontSize: "14px",
                    position: "relative",
                    zIndex: 2,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                  >
                    <TypewriterText
                      text="Your access to LockChain has been unlocked!"
                      delay={0.04}
                      startDelay={0.7}
                    />
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.7, duration: 0.5 }}
                  >
                    <TypewriterText
                      text="Contract details are now available below."
                      delay={0.04}
                      startDelay={1.7}
                    />
                  </motion.p>
                </motion.div>

                <motion.div
                  className={styles.contractLinks}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  style={{ zIndex: 2, position: "relative" }}
                >
                  {/* Section title with animated border */}
                  <motion.div
                    style={{ position: "relative", marginBottom: "12px" }}
                  >
                    <h3
                      className={styles.sectionTitle}
                      style={{
                        fontSize: "16px",
                        textAlign: "center",
                        color: "#4FBCFF",
                      }}
                    >
                      Contract Information
                    </h3>
                    <motion.div
                      style={{
                        position: "absolute",
                        bottom: "-4px",
                        left: "50%",
                        width: "50px",
                        height: "2px",
                        background: "rgba(79, 188, 255, 0.6)",
                        transform: "translateX(-50%)",
                      }}
                      animate={{
                        width: ["0%", "80%", "50%"],
                        opacity: [0, 1, 0.7],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                    />
                  </motion.div>

                  {/* Contract address container with hover effect */}
                  <motion.div
                    className={styles.addressContainer}
                    style={{
                      background: "rgba(8, 15, 40, 0.6)",
                      padding: "14px",
                      borderRadius: "10px",
                      marginBottom: "15px",
                      border: "1px solid rgba(79, 188, 255, 0.2)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                    whileHover={{
                      boxShadow: "0 0 15px rgba(79, 188, 255, 0.3)",
                      borderColor: "rgba(79, 188, 255, 0.5)",
                      transition: { duration: 0.3 },
                    }}
                  >
                    {/* Background glow effect that animates on hover */}
                    <motion.div
                      style={{
                        position: "absolute",
                        top: "0",
                        left: "0",
                        width: "100%",
                        height: "100%",
                        background:
                          "radial-gradient(circle at center, rgba(79, 188, 255, 0.15), transparent 70%)",
                        opacity: 0,
                        zIndex: 0,
                      }}
                      animate={{
                        opacity: [0, 0.5, 0],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />

                    <div
                      className={styles.contractAddressWrapper}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      {/* Address with monospace font and subtle animation */}
                      <motion.span
                        className={styles.contractAddress}
                        style={{
                          fontSize: "12px", // Increase font size
                          wordBreak: "break-all",
                          fontFamily: "monospace",
                          background: "rgba(0, 10, 30, 0.4)",
                          padding: "8px",
                          borderRadius: "6px",
                          border: "1px solid rgba(79, 188, 255, 0.1)",
                          display: "block",
                          textAlign: "center",
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9, duration: 0.5 }}
                      >
                        {/* Format contract address to be more readable */}
                        {CONTRACT_ADDRESS.slice(0, 6)}...
                        {CONTRACT_ADDRESS.slice(-4)}
                        <motion.span
                          style={{
                            fontSize: "10px",
                            opacity: 0.7,
                            display: "block",
                            marginTop: "4px",
                          }}
                        >
                          Click "Copy" for full address
                        </motion.span>
                      </motion.span>

                      {/* Copy button with improved hover effects and animation */}
                      <CopyToClipboard
                        text={CONTRACT_ADDRESS}
                        onCopy={handleCopy}
                      >
                        <motion.button
                          className={styles.copyButton}
                          whileHover={{
                            scale: 1.05,
                            boxShadow: "0 0 15px rgba(79, 188, 255, 0.5)",
                          }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            alignSelf: "center",
                            padding: "12px 20px",
                            fontSize: "14px",
                            borderRadius: "24px",
                            background:
                              "linear-gradient(135deg, rgba(8, 15, 40, 0.8), rgba(26, 39, 67, 0.8))",
                            border: "1px solid rgba(79, 188, 255, 0.4)",
                            color: "white",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px",
                            transition: "all 0.3s ease",
                            minWidth: "140px",
                            width: "fit-content",
                            margin: "6px auto",
                            position: "relative",
                            overflow: "hidden",
                          }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.1, duration: 0.5 }}
                        >
                          {/* Animated background effect */}
                          <motion.div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background:
                                "radial-gradient(circle at center, rgba(79, 188, 255, 0.15), transparent 70%)",
                              zIndex: 0,
                            }}
                            animate={{
                              opacity: [0.2, 0.4, 0.2],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          />

                          {/* Animated border effect */}
                          <motion.div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              borderRadius: "24px",
                              border: "1px solid rgba(79, 188, 255, 0)",
                              zIndex: 0,
                            }}
                            animate={{
                              boxShadow: [
                                "0 0 8px rgba(79, 188, 255, 0.3)",
                                "0 0 16px rgba(79, 188, 255, 0.5)",
                                "0 0 8px rgba(79, 188, 255, 0.3)",
                              ],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          />

                          {/* Button content */}
                          <motion.span
                            className={styles.buttonIcon}
                            animate={
                              copied
                                ? { rotate: [0, 360], scale: [1, 1.2, 1] }
                                : { rotate: copied ? 360 : 0 }
                            }
                            transition={{ duration: copied ? 0.4 : 0 }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "20px",
                              height: "20px",
                              background: copied
                                ? "rgba(46, 213, 115, 0.2)"
                                : "rgba(79, 188, 255, 0.2)",
                              borderRadius: "50%",
                              borderRadius: "50%",
                              padding: "3px",
                              position: "relative",
                              zIndex: 2,
                            }}
                          >
                            {copied ? (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M20 6L9 17L4 12"
                                  stroke="#2ED573"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M8 5H6C4.89543 5 4 5.89543 4 7V19C4 20.1046 4.89543 21 6 21H16C17.1046 21 18 20.1046 18 19V7C18 5.89543 17.1046 5 16 5H14M8 5V3C8 1.89543 8.89543 1 10 1H14C15.1046 1 16 1.89543 16 3V5M8 5H14M8 5V7M14 5V7"
                                  stroke="#4FBCFF"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </motion.span>

                          {/* Button text with glowing effect */}
                          <motion.span
                            style={{
                              position: "relative",
                              zIndex: 2,
                              fontWeight: "500",
                              letterSpacing: "0.5px",
                              textShadow: copied
                                ? "0 0 8px rgba(46, 213, 115, 0.5)"
                                : "0 0 8px rgba(79, 188, 255, 0.5)",
                              color: copied ? "#2ED573" : "#4FBCFF",
                              transition:
                                "color 0.3s ease, text-shadow 0.3s ease",
                            }}
                            animate={copied ? { y: [0, -3, 0] } : { y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            {copied ? "Copied!" : "Copy Address"}
                          </motion.span>

                          {/* Animated dots for "loading" effect when copied */}
                          {copied && (
                            <motion.div
                              style={{
                                position: "absolute",
                                bottom: "5px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                display: "flex",
                                gap: "4px",
                                zIndex: 2,
                              }}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <motion.span
                                style={{
                                  width: "4px",
                                  height: "4px",
                                  borderRadius: "50%",
                                  background: "#2ED573",
                                }}
                                animate={{ scale: [0.8, 1.2, 0.8] }}
                                transition={{
                                  duration: 0.6,
                                  repeat: Infinity,
                                  delay: 0,
                                }}
                              />
                              <motion.span
                                style={{
                                  width: "4px",
                                  height: "4px",
                                  borderRadius: "50%",
                                  background: "#2ED573",
                                }}
                                animate={{ scale: [0.8, 1.2, 0.8] }}
                                transition={{
                                  duration: 0.6,
                                  repeat: Infinity,
                                  delay: 0.2,
                                }}
                              />
                              <motion.span
                                style={{
                                  width: "4px",
                                  height: "4px",
                                  borderRadius: "50%",
                                  background: "#2ED573",
                                }}
                                animate={{ scale: [0.8, 1.2, 0.8] }}
                                transition={{
                                  duration: 0.6,
                                  repeat: Infinity,
                                  delay: 0.4,
                                }}
                              />
                            </motion.div>
                          )}

                          {/* Button shine effect */}
                          <motion.div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "30px",
                              height: "100%",
                              background:
                                "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)",
                              zIndex: 1,
                              transform: "skewX(-15deg) translateX(-40px)",
                            }}
                            animate={{
                              x: copied ? ["-100%", "200%"] : ["-100%", "200%"],
                            }}
                            transition={{
                              duration: copied ? 0.8 : 2.5,
                              repeat: Infinity,
                              repeatDelay: copied ? 0 : 3,
                            }}
                          />
                        </motion.button>
                      </CopyToClipboard>
                    </div>
                  </motion.div>

                  {/* Platform links with hover effects */}
                  <motion.div
                    className={styles.platformLinks}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      position: "relative",
                      zIndex: 1,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.3, duration: 0.5 }}
                  >
                    <motion.a
                      href={MATCH_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.platformLink}
                      whileHover={{
                        scale: 1.05,
                        boxShadow: "0 0 20px rgba(79, 188, 255, 0.6)",
                        backgroundColor: "rgba(79, 188, 255, 0.4)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(MATCH_LINK, "_blank");
                        handleExternalLinkClick();
                      }}
                      style={{
                        padding: "10px 16px",
                        fontSize: "14px",
                        borderRadius: "24px",
                        background: "rgba(79, 188, 255, 0.2)",
                        border: "1px solid rgba(79, 188, 255, 0.4)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        textDecoration: "none",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <motion.span
                        className={styles.platformIcon}
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          repeatDelay: 2,
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M15 3H21V9"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M10 14L21 3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </motion.span>
                      <span>Matcha</span>
                    </motion.a>

                    <motion.a
                      href={LOCKSWAP_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.platformLink}
                      whileHover={{
                        scale: 1.05,
                        boxShadow: "0 0 20px rgba(79, 188, 255, 0.6)",
                        backgroundColor: "rgba(79, 188, 255, 0.4)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(LOCKSWAP_LINK, "_blank");
                        handleExternalLinkClick();
                      }}
                      style={{
                        padding: "10px 16px",
                        fontSize: "14px",
                        borderRadius: "24px",
                        background: "rgba(79, 188, 255, 0.2)",
                        border: "1px solid rgba(79, 188, 255, 0.4)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        textDecoration: "none",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <motion.span
                        className={styles.platformIcon}
                        animate={{ rotate: [0, -5, 5, 0] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          repeatDelay: 3,
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M19 12H5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 19L5 12L12 5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </motion.span>
                      <span>LockSwap</span>
                    </motion.a>
                  </motion.div>

                  {/* Enter dashboard button with enhanced animation */}
                  <motion.button
                    onClick={onComplete}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 1.5, duration: 0.5 }}
                    whileHover={{
                      scale: 1.03,
                      boxShadow: "0 0 25px rgba(79, 188, 255, 0.8)",
                      y: -2,
                    }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      marginTop: "20px",
                      padding: "12px 20px",
                      background:
                        "linear-gradient(135deg, rgba(79, 188, 255, 0.7), rgba(83, 102, 250, 0.7))",
                      border: "none",
                      borderRadius: "24px",
                      color: "white",
                      fontSize: "15px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      display: "block",
                      width: "100%",
                      maxWidth: "280px",
                      margin: "20px auto 0",
                      boxShadow: "0 0 15px rgba(79, 188, 255, 0.4)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Button shine effect */}
                    <motion.div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        background:
                          "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
                        transform: "translateX(-100%)",
                      }}
                      animate={{
                        translateX: ["-100%", "100%"],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatDelay: 3,
                      }}
                    />

                    <span
                      style={{
                        position: "relative",
                        zIndex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                    >
                      <span>Enter Dashboard</span>
                      <motion.span
                        animate={{ x: [0, 3, 0] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          repeatDelay: 1.5,
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M5 12H19"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 5L19 12L12 19"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </motion.span>
                    </span>
                  </motion.button>
                </motion.div>
              </motion.div>
            ) : (
              // Original contract section that shows during countdown
              <motion.div
                className={styles.contractLinksSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4, duration: 0.5 }}
              >
                {/* Original contract content here */}
                <div className={styles.contractLinks}>
                  {/* Existing contract content */}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
