"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image"; // Rename to avoid conflict
import Link from "next/link";
import { useAccount, useDisconnect } from "wagmi";
import { useSession, signOut } from "next-auth/react";
import { ethers } from "ethers";
import "../styles/Profile.css";
import { LuClipboard, LuClipboardCheck } from "react-icons/lu";
import { contract, DEFAULT_CHAIN } from "../hooks/constant";
import tokenAbi from "../json/token.json";
import Web3 from "web3";
import DisconnectModal from "./DisconnectModal";
import { useToast } from "../context/ToastContext";
import { useWalletClaim } from "../context/WalletClaimContext";

// Add this function before your ProfileManager component
const generateWalletColor = (walletAddress) => {
  if (!walletAddress) return "rgb(64, 63, 173)";

  const hash = walletAddress.slice(-6);
  const r = parseInt(hash.slice(0, 2), 16);
  const g = parseInt(hash.slice(2, 4), 16);
  const b = parseInt(hash.slice(4, 6), 16);

  return `rgb(${r}, ${g}, ${b})`;
};

export default function ProfileManager() {
  // Keep the same export name
  // Add useToast hook
  const { showToast } = useToast();

  const { data: session, status } = useSession();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [balance, setBalance] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);

  const { showProfile, toggleProfileVisibility, isToggling } = useWalletClaim();

  // Add loading spinner component with renamed classes
  const LoadingSpinner = () => (
    <div style={{ paddingTop: "100px" }} className="mgr-profile-container">
      <div className="mgr-profile-card">
        <div className="mgr-loading-spinner">
          <div className="mgr-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    const fetchBalances = async () => {
      if (!address) return;

      try {
        // Fetch ETH balance
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const ethBalance = await provider.getBalance(address);
        setBalance(ethers.utils.formatEther(ethBalance));

        // Fetch LockChain balance
        const web3 = new Web3(window.ethereum);
        const tokenContract = new web3.eth.Contract(
          tokenAbi,
          contract[DEFAULT_CHAIN].TOKEN_ADDRESS
        );

        const tokenBalanceRaw = await tokenContract.methods
          .balanceOf(address)
          .call();
        const decimals = await tokenContract.methods.decimals().call();
        const formattedBalance = tokenBalanceRaw / Math.pow(10, decimals);
        setTokenBalance(formattedBalance);
      } catch (error) {
        console.error("Error fetching balances:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [address]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleDisconnectWallet = () => {
    setModalType("wallet");
    setShowModal(true);
  };

  const handleDisconnectTwitter = () => {
    setModalType("twitter");
    setShowModal(true);
  };

  const handleConfirmDisconnect = async () => {
    if (modalType === "wallet") {
      disconnect();
    } else if (modalType === "twitter") {
      await signOut({ redirect: false });
    }
    setShowModal(false);
  };

  const handleToggleVisibility = async () => {
    try {
      // Use the context function for optimistic updates
      const result = await toggleProfileVisibility();

      if (result.success) {
        showToast(
          `Profile ${result.showProfile ? "visible" : "hidden"} on leaderboard`,
          "success"
        );
      } else {
        showToast(result.error || "Failed to update visibility", "error");
      }
    } catch (error) {
      console.error("Error toggling profile visibility:", error);
      showToast("Failed to update visibility settings", "error");
    }
  };

  // Show loading state while checking session
  if (status === "loading") {
    return <LoadingSpinner />;
  }

  if (!session) {
    return (
      <div style={{ paddingTop: "100px" }} className="mgr-profile-container">
        <div className="mgr-profile-card">
          <div className="mgr-profile-error">
            Please sign in to view your profile
          </div>
        </div>
      </div>
    );
  }

  const username =
    session?.user?.username || session?.user?.name?.split("@")[0] || "User";

  return (
    <div style={{ paddingTop: "100px" }} className="mgr-profile-container">
      <div className="mgr-profile-card">
        <div className="mgr-profile-header">
          <div className="mgr-profile-avatar">
            {!imageError ? (
              <Image
                src={session.user.profileImage || session.user.image}
                alt={session.user.name}
                width={120}
                height={120}
                className="mgr-avatar-image"
                onError={() => setImageError(true)}
                priority
              />
            ) : (
              <div className="mgr-avatar-fallback">
                {session.user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="mgr-profile-info">
            <h1 className="mgr-profile-name">
              {session.user.name?.includes("@")
                ? session.user.name.split("@")[0]
                : session.user.name}
            </h1>
            <p className="mgr-profile-username">@{username}</p>
          </div>
        </div>

        <div className="mgr-profile-stats">
          <div className="mgr-stat-box">
            <h4>Wallet Status</h4>
            <p className={isConnected ? "mgr-connected" : "mgr-disconnected"}>
              {isConnected ? "Connected" : "Disconnected"}
            </p>
          </div>

          {isConnected && (
            <div className="mgr-stat-box">
              <h4>Wallet Address</h4>
              <div className="mgr-wallet-address-container">
                <p className="mgr-wallet-address">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
                <button
                  onClick={copyToClipboard}
                  className="mgr-copy-button"
                  title="Copy to clipboard"
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "4px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: copied ? "#00ff00" : "#1253ff",
                  }}
                >
                  {copied ? (
                    <>
                      <LuClipboardCheck size={16} />
                    </>
                  ) : (
                    <>
                      <LuClipboard size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {isConnected && (
            <>
              <div className="mgr-stat-box">
                <h4>ETH Balance</h4>
                <p className="mgr-balance">
                  {loading
                    ? "Loading..."
                    : `${parseFloat(balance).toFixed(4)} ETH`}
                </p>
              </div>
              <div className="mgr-stat-box">
                <h4>LockChain Balance</h4>
                <p className="mgr-balance">
                  {loading
                    ? "Loading..."
                    : tokenBalance
                    ? `${parseFloat(tokenBalance).toFixed(2)} LOCKCHAIN`
                    : "0 LOCKCHAIN"}
                </p>
              </div>
            </>
          )}

          <div className="mgr-stat-box">
            <h4>X Profile Visibility</h4>
            <div className="mgr-visibility-toggle">
              <button
                onClick={handleToggleVisibility}
                disabled={isToggling}
                className={`mgr-toggle-button ${
                  showProfile ? "mgr-visible" : "mgr-hidden"
                }`}
              >
                {isToggling ? (
                  <>
                    <span
                      className="spinner"
                      style={{
                        display: "inline-block",
                        width: "12px",
                        height: "12px",
                        border: "2px solid rgba(255, 255, 255, 0.3)",
                        borderTop: "2px solid #fff",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        marginRight: "8px",
                      }}
                    ></span>
                    Updating...
                  </>
                ) : showProfile ? (
                  "Visible on Leaderboard"
                ) : (
                  "Hidden from Leaderboard"
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mgr-profile-actions">
          <Link href="/account" className="mgr-action-button">
            <i className="ti-user"></i>
            Account Settings
          </Link>
          <Link href="/swap" className="mgr-action-button">
            <i className="si si-layers"></i>
            LockSwap
          </Link>
          <Link href="/leaderboard" className="mgr-action-button">
            <i className="ti-bar-chart"></i>
            View Leaderboard
          </Link>

          <div className="mgr-disconnect-actions">
            {isConnected && (
              <button
                onClick={handleDisconnectWallet}
                className="mgr-disconnect-button mgr-wallet"
              >
                Disconnect Wallet
              </button>
            )}
            {session && (
              <button
                onClick={handleDisconnectTwitter}
                className="mgr-disconnect-button mgr-twitter"
              >
                Disconnect X Account
              </button>
            )}
          </div>

          <DisconnectModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onConfirm={handleConfirmDisconnect}
            type={modalType}
          />
        </div>
      </div>
    </div>
  );
}
