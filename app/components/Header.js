"use client";

import { ethers } from "ethers";
import React, { useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useNetwork } from "wagmi";
import { Context } from "../context/context";
import { DEFAULT_CHAIN, SUPPORTED_CHAIN, contract } from "../hooks/constant";
import gldnTextImg from "../images/gldn-logotype.png";
import { IoStatsChartSharp } from "react-icons/io5";
import { FaChartColumn } from "react-icons/fa6";
// import { CgMenuLeftAlt } from "react-icons/cg";
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
  const [dropdownOpen, setDropdownOpen] = useState(false); // Add this line
  const [web3, setWeb3] = useState(null); // Add this line if not present
  const dropdownRef = useRef(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    // Check if MetaMask is installed and enabled
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setWeb3(provider);
    }

    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup function to remove event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    console.log("Session status:", status);
    console.log("Session data:", session);
  }, [session, status]);

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
      console.log(`Switched to network ${network}`);
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

  const handleSignIn = async () => {
    try {
      console.log("Starting sign in process...");
      const result = await signIn("twitter", {
        callbackUrl: "/",
        redirect: true,
        state: Math.random().toString(36).substring(7),
      });
      console.log("Sign in result:", result);
    } catch (error) {
      console.error("Sign in error:", error);
      alert("Failed to sign in with Twitter. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      console.log("Starting sign out process...");
      document.cookie =
        "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      await signOut({ redirect: false });
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
      alert("Failed to sign out. Please try again.");
    }
  };

  console.log(session);

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
              data-bs-toggle="collapse"
              data-bs-target="#navbarSupportedContent-4"
              aria-controls="navbarSupportedContent-4"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <i
                style={{
                  color: "white",
                }}
                className="fe fe-more-vertical header-icons navbar-toggler-icon"
              ></i>
            </button>
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
                        <Link href={`/profile/${session.user.username}`}>
                          <Image
                            src={session.user.image}
                            alt={session.user.name}
                            className="rounded-circle me-2"
                            width={32}
                            height={32}
                          />
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="btn btn-outline-primary btn-rounded d-flex align-items-center"
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
                      </div>
                    ) : (
                      <button
                        onClick={handleSignIn}
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
                  <div className="dropdown">
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
                      Calcuate Profit
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
                {/* <li className="nav-item">
                  <a
                    className="nav-link"
                    rel="noreferrer"
                    target="_blank"
                    href={SIDEBAR_TOKEN_LINK}
                  >
                    <i className="ti-receipt sidemenu-icon menu-icon"></i>
                    <span className="sidemenu-label">LockChain Contract</span>
                    <i className="angle fe fe-chevron-right"></i>
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className="nav-link"
                    rel="noreferrer"
                    target="_blank"
                    href={SIDEBAR_CHART_LINK}
                  >
                    <i className="ti-receipt sidemenu-icon menu-icon"></i>
                    <span className="sidemenu-label">LockChain Chart</span>
                    <i className="angle fe fe-chevron-right"></i>
                  </a>
                </li> */}
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
                <li className="nav-item">
                  <Link href="/tickets" className="nav-link">
                    <ConfettiLinear />
                    <span className="sidemenu-label">Claim Airdrop</span>
                    <i className="angle fe fe-chevron-right"></i>
                  </Link>
                </li>
                {/* <li className="nav-item">
                                    <a className="nav-link" target="_self" href="hmailto:water@bluarctic.xyz">
                                        <span className="shape1"></span>
                                        <span className="shape2"></span>
                                        <i className="si si-envelope-open sidemenu-icon menu-icon"></i>
                                        <span className="sidemenu-label">Email</span>
                                        <i className="angle fe fe-chevron-right"></i>
                                    </a>
                                </li> */}
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
