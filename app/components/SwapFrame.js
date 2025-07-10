"use client";

import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers"; // Import ethers.js
import ethImg from "../images/eth.png";
import tokenImg from "../images/logo.png";
import routerABI from "../json/router.json";
import swapABI from "../json/swap.json";
import tokenABI from "../json/token.json";
import {
  formatPrice,
  getContract,
  getWeb3Contract,
} from "../hooks/contractHelper";
import {
  BUY_TAX,
  contract,
  DEFAULT_CHAIN,
  SELL_TAX,
  SUPPORTED_CHAIN,
} from "../hooks/constant";
import { useAccount, useNetwork } from "wagmi";
import Connect from "./Connect";
import { useEthersSigner } from "../hooks/useEthersProvider";
import { getWeb3 } from "../hooks/connectors";
import { toast } from "react-toastify";
import { zeroAddress } from "viem";
import ReferralShare from "./ReferralShare";
import { useSwapStats } from "../hooks/useAccount";
import LoadingModal from "./LoadingModal";
import Image from "next/image";
// Add these imports for animations
import { motion, AnimatePresence } from "framer-motion";
import ReactConfetti from "react-confetti";
// Import CSS for swap animations
import "../styles/SwapAnimations.css";
import "../styles/LoadingModal.css";

// Create a client component for the swap interface
function SwapInterface({ searchParams }) {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const [fromCurrency, setFromCurrency] = useState("ETH");
  const [toCurrency, setToCurrency] = useState("LOCKCHAIN");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [routerContract, setRouterContract] = useState(null);
  const signer = useEthersSigner();
  const [updater, setUpdater] = useState(1);
  const accStats = useSwapStats(updater);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Add these state variables to your component
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showErrorAnimation, setShowErrorAnimation] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  // Add these state variables to track polling
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef(null);
  const pollingTimeoutRef = useRef(null);

  // Handle component mounting
  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
      setInitialized(false);
    };
  }, []);

  // Initialize contracts and data
  useEffect(() => {
    if (!mounted) return;

    const initialize = async () => {
      try {
        // Ensure contract is loaded
        if (!contract || !contract[DEFAULT_CHAIN]) {
          throw new Error("Contract configuration not loaded");
        }

        // Initialize router contract
        const routerContractInstance = getWeb3Contract(
          routerABI,
          contract[DEFAULT_CHAIN].ROUTER_ADDRESS
        );

        if (!routerContractInstance) {
          throw new Error("Failed to initialize router contract");
        }

        setRouterContract(routerContractInstance);

        setInitialized(true);
      } catch (error) {
        console.error("Error during initialization:", error);
        setInitialized(false);
      }
    };

    initialize();
  }, [mounted, searchParams]);

  // Add this useEffect for handling window size
  useEffect(() => {
    if (!mounted) return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mounted]);

  // Add this useEffect for clearing animations after they play
  useEffect(() => {
    if (showSuccessAnimation) {
      const timer = setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 8000); // 8 seconds
      return () => clearTimeout(timer);
    }

    if (showErrorAnimation) {
      const timer = setTimeout(() => {
        setShowErrorAnimation(false);
      }, 6000); // 6 seconds
      return () => clearTimeout(timer);
    }
  }, [showSuccessAnimation, showErrorAnimation]);

  // Improved transaction polling function
  const pollTransactionStatus = async (
    txHash,
    maxAttempts = 60,
    interval = 3000
  ) => {
    let attempts = 0;
    setIsPolling(true);

    const poll = async () => {
      try {
        if (!mounted || attempts >= maxAttempts) {
          setIsPolling(false);
          if (attempts >= maxAttempts) {
            toast.dismiss();
            setErrorMessage(
              "Transaction verification timeout. Please check manually."
            );
            setShowErrorAnimation(true);
            setLoading(false);
          }
          return;
        }

        const web3 = getWeb3();
        const response = await web3.eth.getTransactionReceipt(txHash);

        if (response != null) {
          setIsPolling(false);
          clearTimeout(pollingTimeoutRef.current);

          if (response.status === true) {
            toast.dismiss();
            setShowSuccessAnimation(true);
            setLoading(false);
            setTimeout(() => {
              if (mounted) {
                setUpdater(Math.random());
              }
            }, 8500);
          } else if (response.status === false) {
            toast.dismiss();
            setErrorMessage(
              "Transaction failed. Please check the blockchain explorer for details."
            );
            setShowErrorAnimation(true);
            setLoading(false);
          }
        } else {
          attempts++;
          // Use recursive setTimeout instead of setInterval for better mobile support
          pollingTimeoutRef.current = setTimeout(poll, interval);
        }
      } catch (error) {
        console.error("Polling error:", error);
        attempts++;
        if (attempts < maxAttempts) {
          pollingTimeoutRef.current = setTimeout(poll, interval);
        } else {
          setIsPolling(false);
          toast.dismiss();
          setErrorMessage(
            "Network error while checking transaction. Please verify manually."
          );
          setShowErrorAnimation(true);
          setLoading(false);
        }
      }
    };

    // Start polling
    pollingTimeoutRef.current = setTimeout(poll, interval);
  };

  // Add cleanup effect
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
      setIsPolling(false);
    };
  }, []);

  // Add visibility change handler for mobile
  useEffect(() => {
    if (!mounted) return;

    const handleVisibilityChange = () => {
      if (document.hidden && isPolling) {
        // Page is hidden, stop polling to save resources
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
        }
      } else if (!document.hidden && isPolling && txHash) {
        // Page is visible again, resume polling
        pollTransactionStatus(txHash);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [mounted, isPolling, txHash]);

  const handleFromAmountChange = async (amount) => {
    if (!mounted || !initialized || !contract || !contract[DEFAULT_CHAIN])
      return;
    setFromAmount(amount);

    if (!isNaN(amount) && amount > 0 && routerContract) {
      try {
        // ethers v6 syntax - use parseUnits directly from ethers
        const amountIn = ethers.parseUnits(amount, 18);

        const path = [
          fromCurrency === "ETH"
            ? contract[DEFAULT_CHAIN].WETH
            : contract[DEFAULT_CHAIN].TOKEN_ADDRESS,
          toCurrency === "ETH"
            ? contract[DEFAULT_CHAIN].WETH
            : contract[DEFAULT_CHAIN].TOKEN_ADDRESS,
        ];

        const amounts = await routerContract.methods
          .getAmountsOut(amountIn, path)
          .call();

        // ethers v6 syntax - use formatUnits directly from ethers
        let outputAmount = ethers.formatUnits(amounts[1], 18);

        if (fromCurrency === "ETH") {
          outputAmount =
            parseFloat(outputAmount) -
            parseFloat((outputAmount * BUY_TAX) / 100);
        } else {
          outputAmount =
            parseFloat(outputAmount) -
            parseFloat((outputAmount * SELL_TAX) / 100);
        }

        setToAmount(outputAmount);
      } catch (error) {
        console.error("Error fetching output amount:", error);
        setToAmount("");
      }
    } else {
      setToAmount("");
    }
  };

  const toggleCurrency = () => {
    const newFromCurrency = toCurrency;
    const newToCurrency = fromCurrency;
    setFromCurrency(newFromCurrency);
    setToCurrency(newToCurrency);

    // Recalculate the exchange rate for the new pair
    // fetchExchangeRate(newFromCurrency, newToCurrency);

    // Swap the values in the input fields
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  // Updated handleSubmit function
  const handleSubmit = async () => {
    if (!mounted) return;

    if (address) {
      if (chain && chain.id && SUPPORTED_CHAIN.includes(chain.id)) {
        try {
          setLoading(true);
          setErrorMessage(""); // Clear previous errors

          let swapContract = getContract(
            swapABI,
            contract[chain.id].SWAP_ADDRESS,
            signer
          );
          let tx;

          let refAddr = "";
          if (searchParams?.get("ref")) {
            refAddr = searchParams.get("ref");
          }

          let referral = refAddr ? refAddr : zeroAddress;

          if (fromCurrency === "ETH") {
            tx = await swapContract.createBuy(referral, {
              from: address,
              // ethers v6 syntax - use parseEther directly from ethers
              value: ethers.parseEther(fromAmount.toString()),
            });
          } else {
            tx = await swapContract.createSell(
              // ethers v6 syntax - use parseEther directly from ethers
              ethers.parseEther(fromAmount.toString()),
              { from: address }
            );
          }

          // Save transaction hash
          setTxHash(tx.hash);

          // Show loading toast with transaction hash for mobile users
          toast.loading(
            <div>
              <div>Confirming transaction...</div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                TX: {tx.hash.substring(0, 10)}...
                {tx.hash.substring(tx.hash.length - 4)}
              </div>
            </div>,
            { autoClose: false }
          );

          // Start improved polling
          await pollTransactionStatus(tx.hash);
        } catch (err) {
          console.error("Transaction error:", err);
          setErrorMessage(err.reason || err.message || "Transaction failed");
          setShowErrorAnimation(true);
          toast.dismiss();
          setLoading(false);
        }
      } else {
        setErrorMessage("Please select Base Mainnet!");
        setShowErrorAnimation(true);
        setLoading(false);
      }
    } else {
      setErrorMessage("Please connect your wallet first!");
      setShowErrorAnimation(true);
      setLoading(false);
    }
  };

  // Updated handleApprove function with same improvements
  const handleApprove = async () => {
    if (!mounted) return;

    if (address) {
      if (chain && chain.id && SUPPORTED_CHAIN.includes(chain.id)) {
        try {
          setLoading(true);
          setErrorMessage("");

          let tokenContract = getContract(
            tokenABI,
            contract[chain.id].TOKEN_ADDRESS,
            signer
          );

          // ethers v6 syntax - use parseEther directly from ethers
          let amount = ethers.parseEther("10000000000000000000");

          let tx = await tokenContract.approve(
            contract[chain.id].SWAP_ADDRESS,
            amount,
            { from: address }
          );

          setTxHash(tx.hash);

          toast.loading(
            <div>
              <div>Confirming approval...</div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                TX: {tx.hash.substring(0, 10)}...
                {tx.hash.substring(tx.hash.length - 4)}
              </div>
            </div>,
            { autoClose: false }
          );

          await pollTransactionStatus(tx.hash);
        } catch (err) {
          console.error("Approval error:", err);
          setErrorMessage(err.reason || err.message || "Approval failed");
          setShowErrorAnimation(true);
          toast.dismiss();
          setLoading(false);
        }
      } else {
        setErrorMessage("Please select Base Mainnet!");
        setShowErrorAnimation(true);
        setLoading(false);
      }
    } else {
      setErrorMessage("Please connect your wallet first!");
      setShowErrorAnimation(true);
      setLoading(false);
    }
  };

  const handleMaxButton = () => {
    if (!mounted) return;
    if (fromCurrency === "ETH") {
      handleFromAmountChange(accStats.eth_balance);
    } else {
      handleFromAmountChange(accStats.token_balance);
    }
  };

  if (!mounted || !initialized) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "100vh" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const fromdollarValue =
    fromCurrency === "ETH"
      ? (fromAmount * accStats.eth_price).toFixed(2)
      : (fromAmount * accStats.token_price).toFixed(2);

  const todollarValue =
    toCurrency === "ETH"
      ? (toAmount * accStats.eth_price).toFixed(2)
      : (toAmount * accStats.token_price).toFixed(2);
  //eth balance - accStats.eth_balance
  //token balance - accStats.token_balance
  //eth price - accStats.eth_price
  //token token_price - accStats.token_price

  return (
    <div
      className="default-height bg-primary-gradient"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(at 53% 34%, rgba(19, 83, 255, 0.1) -84%, rgba(20, 20, 20, 0.6) 63%)",
      }}
    >
      <div className="jumps-prevent" style={{ paddingTop: "104px" }}></div>
      <div
        className="main-content side-content pt-0"
        style={{ minHeight: "calc(100vh - 64px)" }}
      >
        <div className="main-container container-fluid">
          <div className="inner-body">
            <div className="page-header">
              <div>
                <h2
                  style={{
                    color: "white",
                    marginTop: "-60px",
                  }}
                  className="main-content-title tx-24 mg-b-5"
                >
                  Welcome To Account
                </h2>
              </div>
            </div>
            <div className="row justify-content-center">
              <div className="col-md-8 col-lg-6">
                {/* From Card */}
                <div
                  style={{
                    backgroundColor: "transparent",
                  }}
                  className="card mb-3 shadow-sm"
                >
                  <div className="card-body swap-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div
                          style={{
                            color: "white !important",
                          }}
                        >
                          From
                        </div>
                        <input
                          style={{
                            color: "white",
                          }}
                          inputMode="decimal"
                          className="form-control p-0 w-100 bg-transparent text-start fs-4 placeholder-opacity-50 border-0"
                          placeholder="0.0"
                          autoComplete="off"
                          type="text"
                          value={fromAmount}
                          onChange={(e) =>
                            handleFromAmountChange(e.target.value)
                          }
                        />
                        <div
                          style={{
                            color: "white",
                          }}
                        >
                          ${fromdollarValue}
                        </div>
                      </div>
                      <div className="text-end text-center">
                        <div className="gap-2">
                          <Image
                            src={fromCurrency === "ETH" ? ethImg : tokenImg}
                            alt={fromCurrency}
                            width="24"
                            className="mx-2"
                          />
                          <span
                            style={{
                              color: "white",
                            }}
                            className="fw-bold"
                          >
                            {fromCurrency}
                          </span>
                          <div className="text-muted mt-2">
                            Balance:{" "}
                            {address
                              ? fromCurrency === "ETH"
                                ? formatPrice(accStats.eth_balance, 18)
                                : formatPrice(accStats.token_balance, 18)
                              : 0}
                            <span
                              onClick={() => handleMaxButton()}
                              className="badge bg-primary mx-2"
                              style={{ cursor: "pointer" }}
                            >
                              Max
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center my-3">
                  <div className="swap-icon d-inline-block">
                    <div
                      onClick={toggleCurrency}
                      className="css-175oi2r"
                      style={{
                        display: "flex",
                        flexBasis: "auto",
                        boxSizing: "border-box",
                        position: "relative",
                        minHeight: "0px",
                        minWidth: "0px",
                        flexShrink: "0",
                        flexDirection: "column",
                        cursor: "pointer",
                        alignItems: "center",
                        alignSelf: "center",
                        backgroundColor: "#131814",
                        borderColor: "#142a63",
                        borderRadius: "16px",
                        borderWidth: "4px",
                        justifyContent: "center",
                        padding: "8px",
                        borderStyle: "solid",
                        transform: "scale(1)",
                        opacity: "1",
                      }}
                    >
                      <div
                        style={{
                          color: "white",
                        }}
                        className="_display-flex _alignItems-center _flexBasis-auto _boxSizing-border-box _position-relative _minHeight-0px _minWidth-0px _flexShrink-0 _flexDirection-column _justifyContent-center _pt-t-space-spa94665587 _pr-t-space-spa94665587 _pb-t-space-spa94665587 _pl-t-space-spa94665587"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="24"
                          height="24"
                          stroke="currentColor"
                          stroke-width="2"
                          fill="none"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          class="css-i6dzq1"
                        >
                          <polyline points="17 1 21 5 17 9"></polyline>
                          <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                          <polyline points="7 23 3 19 7 15"></polyline>
                          <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* To Card */}
                <div
                  style={{
                    backgroundColor: "transparent",
                  }}
                  className="card mb-4 shadow-sm"
                >
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div
                          style={{
                            color: "white",
                          }}
                          className=""
                        >
                          To
                        </div>
                        <input
                          inputMode="decimal"
                          className="form-control p-0 w-100 bg-transparent text-start fs-4 text-white placeholder-opacity-50 border-0"
                          placeholder="0.0"
                          autoComplete="off"
                          type="text"
                          value={toAmount}
                          readOnly
                        />
                        <div
                          style={{
                            color: "white",
                          }}
                          className=""
                        >
                          ${todollarValue}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="gap-2">
                          <Image
                            src={toCurrency === "ETH" ? ethImg : tokenImg}
                            alt={toCurrency}
                            width="24"
                            className="mx-2"
                          />
                          <span style={{ color: "white" }} className="fw-bold">
                            {toCurrency}
                          </span>
                          <div className="text-muted mt-2">
                            Balance:{" "}
                            {address
                              ? toCurrency === "ETH"
                                ? formatPrice(accStats.eth_balance)
                                : formatPrice(accStats.token_balance)
                              : 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* <div className="d-flex justify-content-around mb-3">
                                        <span>1 {fromCurrency} = {exchangeRate} {toCurrency}</span>
                                    </div> */}
                {address ? (
                  fromCurrency === "LOCKCHAIN" &&
                  parseFloat(accStats.allowence) < parseFloat(fromAmount) ? (
                    <button
                      onClick={() => handleApprove()}
                      disabled={loading}
                      type="button"
                      className="btn btn-primary btn-connect btn-icon-text w-100 radius"
                    >
                      {loading ? "Loading..." : "Approve"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubmit()}
                      disabled={loading}
                      type="button"
                      className="btn btn-primary btn-connect btn-icon-text w-100 radius"
                    >
                      {loading ? "Loading..." : "Swap Now"}
                    </button>
                  )
                ) : (
                  <Connect className=" w-100 radius" />
                )}
              </div>
            </div>
            <ReferralShare />
            <LoadingModal
              show={loading}
              message="Please wait while we process your request..."
            />

            {/* Success Animation Overlay */}
            <AnimatePresence>
              {showSuccessAnimation && (
                <motion.div
                  className="swap-animation-overlay swap-success-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Confetti Effect */}
                  <ReactConfetti
                    width={windowSize.width}
                    height={windowSize.height}
                    recycle={false}
                    numberOfPieces={500}
                    gravity={0.15}
                    colors={[
                      "#1253ff",
                      "#7da0ff",
                      "#25c26e",
                      "#43f6ff",
                      "#fff",
                    ]}
                  />

                  <motion.div
                    className="swap-success-modal"
                    initial={{ scale: 0.8, y: 30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ type: "spring", damping: 15, delay: 0.3 }}
                  >
                    {/* Token Exchange Animation */}
                    <motion.div
                      className="swap-token-exchange"
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: 360 }}
                      transition={{ duration: 3, repeat: 1, repeatDelay: 1 }}
                    >
                      <motion.div
                        className="swap-token-from"
                        initial={{ x: 0 }}
                        animate={{ x: [0, -20, 60], scale: [1, 0.9, 1] }}
                        transition={{
                          duration: 1.5,
                          times: [0, 0.5, 1],
                          delay: 0.5,
                        }}
                      >
                        <Image
                          src={fromCurrency === "ETH" ? ethImg : tokenImg}
                          alt={fromCurrency}
                          width="30"
                          height="30"
                        />
                      </motion.div>

                      <motion.div
                        className="swap-success-arrow"
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.2, 1] }}
                        transition={{ duration: 0.6, delay: 1 }}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M16.6666 5L7.49998 14.1667L3.33331 10"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <motion.div
                          className="swap-success-glow"
                          animate={{
                            opacity: [0, 0.8, 0],
                            scale: [1, 1.5, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatType: "loop",
                          }}
                        />
                      </motion.div>

                      <motion.div
                        className="swap-token-to"
                        initial={{ x: 0 }}
                        animate={{ x: [0, 20, -60], scale: [1, 0.9, 1] }}
                        transition={{
                          duration: 1.5,
                          times: [0, 0.5, 1],
                          delay: 0.5,
                        }}
                      >
                        <Image
                          src={toCurrency === "ETH" ? ethImg : tokenImg}
                          alt={toCurrency}
                          width="30"
                          height="30"
                        />
                      </motion.div>
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      Swap Successful!
                    </motion.h2>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                    >
                      <div className="swap-amount-badge">
                        {fromAmount} {fromCurrency} →{" "}
                        {parseFloat(toAmount).toFixed(6)} {toCurrency}
                      </div>

                      <p className="mt-3">
                        Your transaction has been successfully processed and
                        confirmed on the blockchain.
                      </p>

                      <div className="swap-success-hash">
                        TX Hash: {txHash.substring(0, 20)}...
                        {txHash.substring(txHash.length - 4)}
                      </div>

                      <motion.a
                        href={`https://basescan.org/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="swap-success-btn"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span className="swap-success-btn-shine"></span>
                        View on Explorer
                      </motion.a>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Animation Overlay */}
            <AnimatePresence>
              {showErrorAnimation && (
                <motion.div
                  className="swap-animation-overlay swap-error-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="swap-glitch"></div>
                  <div className="swap-digital-lines">
                    <div className="swap-digital-line"></div>
                    <div className="swap-digital-line"></div>
                    <div className="swap-digital-line"></div>
                  </div>

                  <motion.div
                    className="swap-error-modal"
                    initial={{ scale: 0.8, y: 30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                  >
                    <motion.div
                      className="swap-error-icon"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: [0, -5, 10, -10, 5, 0] }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                    >
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <motion.circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="#eb3b5a"
                          strokeWidth="2"
                          fill="none"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.8 }}
                        />
                        <motion.path
                          d="M15 9l-6 6M9 9l6 6"
                          stroke="#eb3b5a"
                          strokeWidth="2"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, delay: 0.5 }}
                        />
                      </svg>
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      style={{ color: "#eb3b5a" }}
                    >
                      Transaction Failed
                    </motion.h2>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      <p>
                        We couldn't complete your{" "}
                        {fromCurrency === "ETH" ? "buy" : "sell"} transaction.
                      </p>

                      <div className="swap-error-details">
                        <span>Error: {errorMessage}</span>
                      </div>

                      <motion.button
                        className="swap-error-btn"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowErrorAnimation(false)}
                      >
                        Try Again
                      </motion.button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SwapFrame({ searchParams }) {
  return <SwapInterface searchParams={searchParams} />;
}
