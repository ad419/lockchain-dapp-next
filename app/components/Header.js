"use client";

import { ethers } from "ethers";
import React, { useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useNetwork, useAccount } from "wagmi";
import { Context } from "../context/context";
import { DEFAULT_CHAIN, SUPPORTED_CHAIN, contract } from "../hooks/constant";
import gldnTextImg from "../images/gldn-logotype.png";
import { IoStatsChartSharp } from "react-icons/io5";
import { FaChartColumn } from "react-icons/fa6";
import {
  default as lconImg,
  default as lconLight,
  default as logoImg,
  default as logoLight,
} from "../images/logo.png";
import Connect from "./Connect";
import ConfettiLinear from "./IconConfetti";
import styles from "../styles/header.module.css";
import { signIn, signOut, useSession } from "next-auth/react";
import ClipLoader from "react-spinners/ClipLoader";
import { useToast } from "../context/ToastContext";
import { useWalletClaim } from "../context/WalletClaimContext";

export default function Header() {
  const context = useContext(Context);

  // Return early if context is not yet available
  if (!context?.mounted) {
    return null;
  }

  const { darkMode, setDarkMode } = context;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { chain } = useNetwork();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [web3, setWeb3] = useState(null);
  const dropdownRef = useRef(null);
  const { data: session, status } = useSession();
  const { address, isConnected } = useAccount();
  const { showToast } = useToast();
  const {
    hasClaimedWallet,
    isClaiming,
    claimWallet: contextClaimWallet,
    checkWalletClaim, // Add this
  } = useWalletClaim();
  const { clearCache } = useWalletClaim();

  // Add this state at the top of your component
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Add this function to toggle the mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  useEffect(() => {
    // Fix the Web3Provider initialization
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        // For ethers v5
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        setWeb3(provider);
      } catch (error) {
        try {
          // For ethers v6 (fallback)
          const provider = new ethers.BrowserProvider(window.ethereum);
          setWeb3(provider);
        } catch (v6Error) {
          console.error(
            "Failed to initialize ethers provider:",
            error,
            v6Error
          );
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup function
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Add this effect near the top of your component
  useEffect(() => {
    // When session changes (login/logout), recheck wallet claim status
    const checkClaim = async () => {
      if (session && address) {
        await checkWalletClaim(true); // Force refresh on session change
      }
    };

    checkClaim();
  }, [session, address, checkWalletClaim]);

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setDropdownOpen(false);
    }
  };

  const switchNetwork = async (network) => {
    if (!web3) {
      console.error("Web3 not initialized.");
      return;
    }

    try {
      await web3.send("wallet_switchEthereumChain", [
        { chainId: "0x" + network.toString(16) },
      ]);
      // Perform additional tasks if needed after switching the network
    } catch (error) {
      console.error("Error switching network:", error);
      // If the error indicates that the network is not available, try adding it
      if (error.code === 4902) {
        try {
          await web3.send("wallet_addEthereumChain", [
            {
              chainId: "0x" + network.toString(16),
              chainName: contract[network]
                ? contract[network].name
                : contract[DEFAULT_CHAIN].name, // Replace with your network name
              nativeCurrency: {
                name: contract[network]
                  ? contract[network].symbol
                  : contract[DEFAULT_CHAIN].symbol,
                symbol: contract[network]
                  ? contract[network].symbol
                  : contract[DEFAULT_CHAIN].name,
                decimals: 18,
              },
              rpcUrls: [
                contract[network]
                  ? contract[network].rpc
                  : contract[DEFAULT_CHAIN].rpc,
              ], // Replace with your RPC endpoint
            },
          ]);
          console.log(`Added network ${network}`);
          // Retry switching network after adding it
          await switchNetwork(network);
        } catch (addError) {
          console.error("Error adding network:", addError);
        }
      }
    }
  };

  // Update the CSS in your Header.js component

  // Add these styles to your header.module.css file or inline styles
  const mobileMenuStyles = {
    mobileMenuContainer: {
      position: "fixed",
      top: "60px", // Adjust based on your header height
      right: "0",
      width: "100%",
      maxWidth: "300px",
      backgroundColor: "rgba(8, 15, 40, 0.95)", // Darker background matching app theme
      backdropFilter: "blur(10px)",
      borderRadius: "0 0 0 16px",
      boxShadow: "0 8px 20px rgba(0, 0, 0, 0.5)",
      zIndex: 1000,
      padding: "15px",
      transform: "translateX(100%)",
      transition: "transform 0.3s ease-in-out",
      borderLeft: "1px solid rgba(79, 188, 255, 0.3)", // Blue accent matching your app
      borderBottom: "1px solid rgba(79, 188, 255, 0.3)",
    },
    mobileMenuVisible: {
      transform: "translateX(0)",
    },
    mobileMenuItem: {
      display: "flex",
      alignItems: "center",
      padding: "12px 15px",
      borderRadius: "8px",
      marginBottom: "8px",
      background: "rgba(18, 30, 60, 0.5)", // Slightly lighter than background
      transition: "all 0.2s ease",
      cursor: "pointer",
      color: "#ffffff", // Ensure text is white for visibility
    },
    mobileMenuItemActive: {
      background: "rgba(79, 188, 255, 0.3)", // Use your blue accent color
      boxShadow: "0 0 15px rgba(79, 188, 255, 0.15)",
    },
    mobileMenuIcon: {
      marginRight: "12px",
      opacity: 0.9, // Increased from 0.8 for better visibility
    },
    mobileMenuText: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#ffffff", // Explicitly white text for visibility
    },
    divider: {
      height: "1px",
      backgroundColor: "rgba(79, 188, 255, 0.2)", // Use blue accent for dividers
      margin: "10px 0",
    },
    closeButton: {
      position: "absolute",
      top: "10px",
      right: "10px",
      background: "transparent",
      border: "none",
      color: "#4FBCFF", // Blue accent color
      fontSize: "20px",
      cursor: "pointer",
    },
    sectionTitle: {
      fontSize: "12px",
      color: "#4FBCFF", // Blue accent color
      fontWeight: "600",
      marginBottom: "8px",
      letterSpacing: "0.5px",
    },
  };

  const username = session?.user?.name
    ? session.user.name.replace(/\s+/g, "").toLowerCase()
    : "user";

  const handleClaimWallet = async () => {
    if (!isConnected) {
      showToast("Please connect your wallet first", "error");
      return;
    }

    if (!session?.user?.name) {
      showToast("Please login with X first", "error");
      return;
    }

    // Add this check before trying to claim
    if (hasClaimedWallet) {
      showToast("This wallet has already been claimed", "info");
      return;
    }

    try {
      // First verify if the wallet is already claimed
      await checkWalletClaim(true); // Force a fresh check

      // If after the fresh check it's already claimed, stop here
      if (hasClaimedWallet) {
        showToast("This wallet has already been claimed", "info");
        return;
      }

      const result = await contextClaimWallet();
      if (result.success) {
        showToast(
          "Wallet claimed successfully! Please wait until everything will be initialized",
          "success"
        );
      } else {
        showToast(result.error || "Failed to claim wallet", "error");
      }
    } catch (error) {
      console.error("Error claiming wallet:", error);
      showToast("An error occurred while claiming wallet", "error");
    }
  };

  const handleLogin = async () => {
    try {
      await signIn("twitter", {
        redirect: false,
      });
    } catch (error) {
      console.error("Login error:", error);
      showToast("Error logging in with Twitter", "error");
    }
  };

  const handleLogout = async () => {
    try {
      // 1. Show a loading toast
      showToast("Logging out...", "info");

      // 2. Clear client-side cache first
      clearCache();

      // 3. Clear the Redis cache for this specific wallet if connected
      if (session?.user) {
        try {
          await fetch(`/api/clear-cache`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "walletClaim",
              walletAddress: address || "",
            }),
          });

          console.log("Redis cache cleared before logout");
        } catch (err) {
          console.warn("Cache clearing error:", err);
        }
      }

      // 4. Sign out from Next-Auth
      await signOut({
        callbackUrl: window.location.origin,
        redirect: false,
      });

      // 5. Force refresh the wallet claim state by calling the context method
      if (checkWalletClaim) {
        checkWalletClaim(true); // Pass true to force a refresh
      }

      // 6. Show success message
      showToast("Logged out successfully", "success");
    } catch (error) {
      console.error("Logout error:", error);
      showToast("Error logging out", "error");
    }
  };

  const renderAuthButton = () => {
    if (status === "loading") {
      return <div>Loading...</div>;
    }

    if (session?.user) {
      return (
        <button onClick={handleLogout}>Logout ({session.user.name})</button>
      );
    }

    return <button onClick={handleLogin}>Login with X</button>;
  };

  return (
    <React.Fragment>
      <div className={`main-header side-header sticky ${styles.mainHeader}`}>
        <div className="main-container container-fluid">
          <div className="main-header-left">
            <a
              className="main-header-menu-icon"
              href="#sec"
              id="mainSidebarToggle"
              style={{
                color: "white",
              }}
            >
              <span
                style={{
                  color: "white",
                }}
              ></span>
            </a>
            <div className="hor-logo">
              <Link href="/" className="main-logo">
                <Image
                  src={logoImg}
                  className="header-brand-img desktop-logo"
                  height={37}
                  width={100}
                  alt="logo"
                />
                <Image
                  src={logoLight}
                  className="header-brand-img desktop-logo-dark"
                  alt="logo"
                  height={37}
                  width={134}
                />
                <Image
                  src={gldnTextImg}
                  className="header-brand-img"
                  alt="logo"
                  height={37}
                  width={100}
                />
              </Link>
            </div>
          </div>
          <div className="main-header-center">
            <div className="responsive-logo">
              {darkMode ? (
                <Link href="/">
                  <div className="d-flex justify-content-center align-items-center">
                    <Image
                      src={logoLight}
                      className="mobile-logo"
                      alt="logo"
                      width={30}
                    />
                    <p className="mx-2 text-white desktop-logo m-0">
                      LockChain
                    </p>
                  </div>
                </Link>
              ) : (
                <Link href="/">
                  <Image
                    src={logoImg}
                    className="mobile-logo"
                    alt="logo"
                    width={30}
                  />
                  <p className="mx-2 text-white desktop-logo m-0">LockChain</p>
                </Link>
              )}
            </div>
          </div>
          <div className={`main-header-right ${styles.headerRight}`}>
            <button
              className="navbar-toggler navresponsive-toggler"
              type="button"
              onClick={toggleMobileMenu}
              aria-label="Toggle navigation"
              style={{
                border: "none",
                background: "transparent",
              }}
            >
              <i
                style={{
                  color: "white",
                }}
                className="fe fe-more-vertical header-icons navbar-toggler-icon"
              ></i>
            </button>
            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  zIndex: 999,
                }}
                onClick={toggleMobileMenu}
              />
            )}

            {/* Mobile Menu */}
            <div
              style={{
                ...mobileMenuStyles.mobileMenuContainer,
                ...(mobileMenuOpen ? mobileMenuStyles.mobileMenuVisible : {}),
              }}
            >
              <button
                style={mobileMenuStyles.closeButton}
                onClick={toggleMobileMenu}
              >
                ×
              </button>

              <h4
                style={{
                  color: "#4FBCFF",
                  marginBottom: "15px",
                  fontSize: "16px",
                }}
              >
                LOCKCHAIN
              </h4>

              {/* Network Selector */}
              <div style={{ marginBottom: "15px" }}>
                <p style={mobileMenuStyles.sectionTitle}>SELECT NETWORK</p>

                {chain && chain.id && SUPPORTED_CHAIN.includes(chain.id) ? (
                  <div
                    style={mobileMenuStyles.mobileMenuItem}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Image
                      height={20}
                      width={20}
                      src={contract[chain.id].img}
                      alt={contract[chain.id].symbol}
                      style={mobileMenuStyles.mobileMenuIcon}
                    />
                    <span style={mobileMenuStyles.mobileMenuText}>
                      {contract[chain.id].name}
                    </span>
                  </div>
                ) : (
                  <div
                    style={mobileMenuStyles.mobileMenuItem}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Image
                      height={20}
                      width={20}
                      src={contract[DEFAULT_CHAIN].img}
                      alt={contract[DEFAULT_CHAIN].symbol}
                      style={mobileMenuStyles.mobileMenuIcon}
                    />
                    <span style={mobileMenuStyles.mobileMenuText}>
                      {contract[DEFAULT_CHAIN].name}
                    </span>
                  </div>
                )}

                {/* Network Options */}
                <div style={{ marginTop: "8px", paddingLeft: "8px" }}>
                  {SUPPORTED_CHAIN &&
                    SUPPORTED_CHAIN.map((row, key) => {
                      return (
                        contract[row] && (
                          <div
                            key={key}
                            style={{
                              ...mobileMenuStyles.mobileMenuItem,
                              background:
                                chain && chain.id === row
                                  ? "rgba(18, 83, 255, 0.2)"
                                  : "transparent",
                            }}
                            onClick={() => {
                              switchNetwork(row);
                              setMobileMenuOpen(false);
                            }}
                          >
                            <Image
                              height={18}
                              width={18}
                              src={contract[row].img}
                              alt={contract[row].symbol}
                              style={mobileMenuStyles.mobileMenuIcon}
                            />
                            <span style={mobileMenuStyles.mobileMenuText}>
                              {contract[row].name}
                            </span>
                          </div>
                        )
                      );
                    })}
                </div>
              </div>

              <div style={mobileMenuStyles.divider}></div>

              {/* User Authentication Section */}
              <div style={{ marginBottom: "15px" }}>
                <p style={mobileMenuStyles.sectionTitle}>ACCOUNT</p>

                {status === "loading" ? (
                  <div style={mobileMenuStyles.mobileMenuItem}>
                    <ClipLoader color="#ffffff" size={16} className="me-2" />
                    <span style={mobileMenuStyles.mobileMenuText}>
                      Loading...
                    </span>
                  </div>
                ) : session ? (
                  <>
                    <Link
                      href={`/profile/${username}`}
                      style={{
                        ...mobileMenuStyles.mobileMenuItem,
                        textDecoration: "none",
                        color: "white",
                      }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Image
                        src={session.user.profileImage || session.user.image}
                        alt={session.user.name}
                        className="rounded-circle me-2"
                        width={24}
                        height={24}
                        style={mobileMenuStyles.mobileMenuIcon}
                      />
                      <span style={mobileMenuStyles.mobileMenuText}>
                        {session.user.name}
                      </span>
                    </Link>

                    <div
                      style={mobileMenuStyles.mobileMenuItem}
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <svg
                        style={{
                          ...mobileMenuStyles.mobileMenuIcon,
                          height: "16px",
                          width: "16px",
                        }}
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                      >
                        <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48z" />
                      </svg>
                      <span style={mobileMenuStyles.mobileMenuText}>
                        Logout
                      </span>
                    </div>

                    {!hasClaimedWallet && isConnected && session ? (
                      <div
                        style={{
                          ...mobileMenuStyles.mobileMenuItem,
                          background:
                            "linear-gradient(135deg, #1253ff 0%, #4FBCFF 100%)",
                          boxShadow: "0 0 10px rgba(18, 83, 255, 0.3)",
                        }}
                        onClick={handleClaimWallet}
                      >
                        {isClaiming ? (
                          <ClipLoader
                            color="#ffffff"
                            size={16}
                            className="me-2"
                          />
                        ) : (
                          <svg
                            style={{
                              ...mobileMenuStyles.mobileMenuIcon,
                              height: "16px",
                              width: "16px",
                              filter:
                                "drop-shadow(0 0 2px rgba(255, 255, 255, 0.5))",
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                            />
                          </svg>
                        )}
                        <span
                          style={{
                            ...mobileMenuStyles.mobileMenuText,
                            fontWeight: "600",
                          }}
                        >
                          {isClaiming ? "Claiming..." : "Claim Wallet"}
                        </span>
                      </div>
                    ) : hasClaimedWallet && isConnected && session ? (
                      <div
                        style={{
                          ...mobileMenuStyles.mobileMenuItem,
                          background: "#10B981",
                          opacity: 0.9,
                        }}
                      >
                        <svg
                          style={{
                            ...mobileMenuStyles.mobileMenuIcon,
                            height: "16px",
                            width: "16px",
                          }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span style={mobileMenuStyles.mobileMenuText}>
                          Wallet Claimed
                        </span>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div
                    style={{
                      ...mobileMenuStyles.mobileMenuItem,
                      background:
                        "linear-gradient(135deg, #1253ff 0%, #4FBCFF 100%)", // Gradient blue
                      boxShadow: "0 0 10px rgba(18, 83, 255, 0.3)",
                    }}
                    onClick={() => {
                      handleLogin();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <svg
                      style={{
                        ...mobileMenuStyles.mobileMenuIcon,
                        height: "16px",
                        width: "16px",
                        filter: "drop-shadow(0 0 2px rgba(255, 255, 255, 0.5))",
                      }}
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 512 512"
                    >
                      <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48z" />
                    </svg>
                    <span
                      style={{
                        ...mobileMenuStyles.mobileMenuText,
                        fontWeight: "600",
                      }}
                    >
                      Login with X
                    </span>
                  </div>
                )}
              </div>

              <div style={mobileMenuStyles.divider}></div>

              {/* Wallet Connection */}
              <div style={{ marginBottom: "15px" }}>
                <p style={mobileMenuStyles.sectionTitle}>WALLET</p>
                <div
                  style={{
                    padding: "0 15px",
                    width: "100%",
                  }}
                >
                  <Connect
                    onComplete={() => setMobileMenuOpen(false)}
                    style={{
                      width: "100%",
                      margin: "0",
                      padding: "12px 15px",
                    }}
                  />
                </div>
              </div>
            </div>
            <div
              className={`navbar navbar-expand-lg nav nav-item navbar-nav-right responsive-navbar navbar-dark ${styles.navbarContainer}`}
            >
              <div
                className="header-element ms-3 d-lg-block d-none my-auto mx-3"
                ref={dropdownRef}
              >
                <div className="dropdown my-auto">
                  {chain && chain.id && SUPPORTED_CHAIN.includes(chain.id) ? (
                    <a
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      aria-label="anchor"
                      href="#sec"
                      className="btn ripple btn-primary text-white btn-rounded header-dashboards-button text-start d-flex align-items-center justify-content-between show"
                      data-bs-toggle="dropdown"
                      aria-expanded="true"
                    >
                      <Image
                        height={24}
                        width={24}
                        src={contract[chain.id].img}
                        alt={contract[chain.id].symbol}
                      />
                      <span className="mx-2">{contract[chain.id].name}</span>
                    </a>
                  ) : (
                    <a
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      aria-label="anchor"
                      href="#sec"
                      className="btn ripple btn-primary btn-rounded header-dashboards-button text-start d-flex align-items-center justify-content-between show"
                      data-bs-toggle="dropdown"
                      aria-expanded="true"
                      style={{ color: "white" }}
                    >
                      <Image
                        height={24}
                        width={24}
                        src={contract[DEFAULT_CHAIN].img}
                        alt={contract[DEFAULT_CHAIN].symbol}
                      />
                      {contract[DEFAULT_CHAIN].name}
                      <i className="ri-arrow-down-s-line align-middle ms-1 d-inline-block float-end"></i>
                    </a>
                  )}
                  <ul
                    className={`dropdown-menu dashboard-dropdown ${
                      dropdownOpen ? "show" : "none"
                    }`}
                    role="menu"
                    style={{
                      position: "absolute",
                      inset: "0px auto auto 0px",
                      margin: "0px",
                      transform: "translate3d(0px, 40.5px, 0px)",
                      background: "transparent",
                    }}
                    data-popper-placement="bottom-start"
                  >
                    {SUPPORTED_CHAIN &&
                      SUPPORTED_CHAIN.map((row, key) => {
                        return (
                          contract[row] && (
                            <li
                              style={{
                                background: "transparent !important",
                                color: "white",
                              }}
                              key={key}
                              onClick={() => switchNetwork(row)}
                            >
                              <a
                                style={{
                                  background: "transparent !important",
                                  color: "white",
                                }}
                                className="dropdown-item dashboards-dropdown-item text-white"
                                href="#sec"
                              >
                                <Image
                                  height={24}
                                  width={24}
                                  src={contract[row].img}
                                  alt={contract[row].symbol}
                                />{" "}
                                {contract[row].name}
                              </a>
                            </li>
                          )
                        );
                      })}
                  </ul>
                </div>
              </div>
              <div
                className="collapse navbar-collapse"
                id="navbarSupportedContent-4"
                style={{
                  background: "transparent",
                }}
              >
                <div className="d-flex order-lg-2 ms-auto justify-content-end align-items-center">
                  {/* Twitter/X Login Button */}
                  <div className="dropdown me-3">
                    {status === "loading" ? (
                      <div
                        className="btn btn-primary btn-rounded d-flex align-items-center"
                        style={{ minWidth: "120px", justifyContent: "center" }}
                      >
                        <ClipLoader
                          color="#ffffff"
                          size={16}
                          className="me-2"
                        />
                        Loading...
                      </div>
                    ) : session ? (
                      <div className="d-flex align-items-center">
                        <Link href={`/profile/${username}`}>
                          <Image
                            src={
                              session.user.profileImage || session.user.image
                            }
                            alt={session.user.name}
                            className="rounded-circle me-2"
                            width={32}
                            height={32}
                          />
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="btn btn-outline-primary btn-rounded d-flex align-items-center me-2"
                          style={{
                            background: "transparent",
                            border: "1px solid #1253ff",
                            color: "#fff",
                          }}
                        >
                          <svg
                            className="me-2"
                            style={{ height: "16px", width: "16px" }}
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 512 512"
                          >
                            <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48z" />
                          </svg>
                          Logout
                        </button>
                        {!hasClaimedWallet && isConnected && session ? (
                          <button
                            onClick={handleClaimWallet}
                            disabled={isClaiming}
                            className="btn btn-primary btn-rounded d-flex align-items-center"
                            style={{
                              background: "#1253ff",
                              border: "none",
                              color: "#fff",
                            }}
                          >
                            {isClaiming ? (
                              <ClipLoader
                                color="#ffffff"
                                size={16}
                                className="me-2"
                              />
                            ) : (
                              <svg
                                className="me-2"
                                style={{ height: "16px", width: "16px" }}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                                />
                              </svg>
                            )}
                            {isClaiming ? "Claiming..." : "Claim Wallet"}
                          </button>
                        ) : hasClaimedWallet && isConnected && session ? (
                          <button
                            disabled
                            className="btn btn-success btn-rounded d-flex align-items-center"
                            style={{
                              background: "#10B981",
                              border: "none",
                              color: "#fff",
                              opacity: 0.9,
                            }}
                          >
                            <svg
                              className="me-2"
                              style={{ height: "16px", width: "16px" }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Wallet Claimed
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <button
                        onClick={handleLogin}
                        className="btn btn-primary btn-rounded d-flex align-items-center"
                        style={{
                          background: "#1253ff",
                          border: "none",
                          color: "#fff",
                        }}
                      >
                        <svg
                          className="me-2"
                          style={{ height: "16px", width: "16px" }}
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 512 512"
                        >
                          <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48z" />
                        </svg>
                        Login with X
                      </button>
                    )}
                  </div>
                  {/* Existing Connect Wallet Button */}
                  <div className="dropdown d-none d-lg-block">
                    <Connect />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className="sticky"
        style={{
          background:
            "radial-gradient(at 53% 34%, rgba(0, 128, 0, 0.3) -84%, #141414 63%)",
        }}
      >
        <div
          className="main-menu main-sidebar main-sidebar-sticky side-menu is-expanded ps ps--active-y "
          style={{
            background:
              "radial-gradient(at 53% 34%, #1253ff -84%, #141414 63%)",
            backdropFilter: "blur(1px)",
          }}
        >
          <div className="main-sidebar-header main-container-1 active">
            <div className="sidemenu-logo">
              <Link href="/" className="main-logo">
                <div className="d-flex align-items-center">
                  <Image
                    src={logoLight}
                    className="header-brand-img desktop-logo ml-4"
                    alt="logo"
                    width={30}
                    height={30}
                    style={{
                      maxWidth: "40px",
                      height: "auto",
                      objectFit: "contain",
                    }}
                    priority
                  />
                  <p className="mx-2 text-white desktop-logo m-0 fs-25">
                    LOCKCHAIN
                  </p>
                </div>
                <Image
                  src={lconLight}
                  className="header-brand-img icon-logo"
                  alt="logo"
                  width={30}
                  height={30}
                  style={{
                    maxWidth: "30px",
                    height: "auto",
                    objectFit: "contain",
                  }}
                  priority
                />
                <Image
                  src={logoImg}
                  className="header-brand-img desktop-logo theme-logo"
                  alt="logo"
                  width={40}
                  height={40}
                  style={{
                    maxWidth: "40px",
                    height: "auto",
                    objectFit: "contain",
                  }}
                  priority
                />
                <Image
                  src={lconImg}
                  className="header-brand-img icon-logo theme-logo"
                  alt="logo"
                  width={30}
                  height={30}
                  style={{
                    maxWidth: "30px",
                    height: "auto",
                    objectFit: "contain",
                  }}
                  priority
                />
              </Link>
            </div>
            <div className="main-sidebar-body main-body-1">
              <div
                className="slide-left disabled active d-none"
                id="slide-left"
              >
                <i className="fe fe-chevron-left"></i>
              </div>
              <ul className="menu-nav nav">
                <li className="nav-header active">
                  <span
                    style={{
                      color: "#fff",
                    }}
                    className="nav-label"
                  >
                    Dashboard
                  </span>
                </li>
                <li className={`nav-item ${pathname === "/" ? "active" : ""}`}>
                  <Link href="/" className="nav-link">
                    <i className="ti-home sidemenu-icon menu-icon"></i>
                    <span className="sidemenu-label">Dashboard</span>
                    <i className="angle fe fe-chevron-right"></i>
                  </Link>
                </li>
                <li className="nav-header active">
                  <span
                    style={{
                      color: "#fff",
                    }}
                    className="nav-label"
                  >
                    Account
                  </span>
                </li>
                <li
                  className={`nav-item ${
                    pathname === "/account" ? "active" : ""
                  }`}
                >
                  <Link href="/account" className="nav-link">
                    <i className="ti-user sidemenu-icon menu-icon"></i>
                    <span className="sidemenu-label">Account</span>
                    <i className="angle fe fe-chevron-right"></i>
                  </Link>
                </li>

                <li className="nav-header active">
                  <span
                    style={{
                      color: "#fff",
                    }}
                    className="nav-label"
                  >
                    Swap
                  </span>
                </li>
                <li
                  className={`nav-item ${pathname === "/swap" ? "active" : ""}`}
                >
                  <Link href="/swap" className="nav-link">
                    <i className="si si-layers sidemenu-icon menu-icon"></i>
                    <span className="sidemenu-label">LockSwap</span>
                    <i className="angle fe fe-chevron-right"></i>
                  </Link>
                </li>

                {/* Add Create Token Link here */}
                <li
                  className={`nav-item ${
                    pathname === "/create-token" ? "active" : ""
                  }`}
                >
                  <Link href="/create-token" className="nav-link">
                    <i className="ti-plus sidemenu-icon menu-icon"></i>
                    <span className="sidemenu-label">Create Token</span>
                    <i className="angle fe fe-chevron-right"></i>
                  </Link>
                </li>

                <li className="nav-header active">
                  <span
                    style={{
                      color: "#fff",
                    }}
                    className="nav-label"
                  >
                    Chart & Docs
                  </span>
                </li>
                <li className="nav-item">
                  <a
                    className="nav-link"
                    rel="noreferrer"
                    target="_blank"
                    href=" https://grass-3.gitbook.io/lockchain-whitepaper"
                  >
                    <i className="ti-receipt sidemenu-icon menu-icon"></i>
                    <span className="sidemenu-label">Whitepaper</span>
                    <i className="angle fe fe-chevron-right"></i>
                  </a>
                </li>
                <li
                  className={`nav-item ${
                    pathname === "/calculate-profit" ? "active" : ""
                  }`}
                  style={{
                    marginLeft: "9px",
                  }}
                >
                  <Link
                    style={{
                      padding: "5px",
                      display: "flex",
                      alignItems: "center",
                    }}
                    href="/calculate-profit"
                    className="nav-link"
                  >
                    <div
                      style={{
                        backgroundColor:
                          pathname === "/calculate-profit" && "#7DA0FF",
                        borderRadius: pathname === "/calculate-profit" && "50%",
                        width: pathname === "/calculate-profit" && "35px",
                        height: pathname === "/calculate-profit" && "35px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <FaChartColumn
                        size={19}
                        color={
                          pathname === "/calculate-profit" ? "#fff" : "#d1d1d1"
                        }
                        style={{
                          position: "relative",
                          opacity:
                            pathname === "/calculate-profit" ? "1" : "0.5",
                        }}
                        className="menu-icon"
                      />
                    </div>
                    <span
                      style={{
                        marginLeft: "10px",
                      }}
                      className="sidemenu-label"
                    >
                      Speculator
                    </span>
                    <i className="angle fe fe-chevron-right"></i>
                  </Link>
                </li>
                <li
                  style={{
                    marginTop: "10px",
                    marginLeft: "9px",
                  }}
                  className={`nav-item ${
                    pathname === "/leaderboard" ? "active" : ""
                  }`}
                >
                  <Link
                    style={{
                      padding: "5px",
                      display: "flex",
                      alignItems: "center",
                    }}
                    href="/leaderboard"
                    className="nav-link"
                  >
                    <div
                      style={{
                        backgroundColor:
                          pathname === "/leaderboard" && "#7DA0FF",
                        borderRadius: pathname === "/leaderboard" && "50%",
                        width: pathname === "/leaderboard" && "35px",
                        height: pathname === "/leaderboard" && "35px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <IoStatsChartSharp
                        size={19}
                        color={pathname === "/leaderboard" ? "#fff" : "#d1d1d1"}
                        className="menu-icon"
                        style={{
                          opacity: pathname === "/leaderboard" ? "1" : "0.5",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        marginLeft: "10px",
                      }}
                      className="sidemenu-label"
                    >
                      Leaderboard
                    </span>
                    <i className="angle fe fe-chevron-right"></i>
                  </Link>
                </li>
                <li className="nav-header active">
                  <span
                    style={{
                      color: "#fff",
                    }}
                    className="nav-label"
                  >
                    Socials
                  </span>
                </li>
                <li className="nav-item">
                  <a
                    className="nav-link"
                    rel="noreferrer"
                    target="_blank"
                    href="https://t.me/lockchainportal"
                  >
                    <i className="si si-paper-plane sidemenu-icon menu-icon"></i>
                    <span className="sidemenu-label">Telegram</span>
                    <i className="angle fe fe-chevron-right"></i>
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link" href="https://x.com/LockChainAi">
                    <svg
                      style={{ height: "20px", width: "34px" }}
                      fill="#fff6"
                      className="sidemenu-icon menu-icon"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 512 512"
                    >
                      <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48z" />
                    </svg>
                    <span className="sidemenu-label">X</span>
                    <i className="angle fe fe-chevron-right"></i>
                  </a>
                </li>
                <li className="nav-header active">
                  <span className="nav-label">Socials</span>
                  <span className="nav-label">Give away</span>
                </li>
                <li
                  className={`nav-item ${
                    pathname === "/air-drop" ? "active" : ""
                  }`}
                >
                  <Link href="/air-drop" className="nav-link">
                    <i className="ti-gift sidemenu-icon menu-icon"></i>
                    <span className="sidemenu-label">Air Drop</span>
                    <i className="angle fe fe-chevron-right"></i>
                  </Link>
                </li>
              </ul>
              <div className="slide-right" id="slide-right">
                <i className="fe fe-chevron-right"></i>
              </div>
            </div>
          </div>
          <div className="ps__rail-x" style={{ left: "0px", top: "0px" }}>
            <div
              className="ps__thumb-x"
              tabIndex="0"
              style={{ left: "0px", width: "0px" }}
            ></div>
          </div>
          <div
            className="ps__rail-y"
            style={{ top: "0px", height: "269px", right: "0px" }}
          >
            <div
              className="ps__thumb-y"
              tabIndex="0"
              style={{ top: "0px", height: "77px" }}
            ></div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
