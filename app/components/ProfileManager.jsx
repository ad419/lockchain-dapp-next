"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import "../styles/Profile.css";

export default function Profile() {
  const { data: session } = useSession();
  const { address, isConnected } = useAccount();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!address) return;
      
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const balance = await provider.getBalance(address);
        setBalance(ethers.utils.formatEther(balance));
      } catch (error) {
        console.error("Error fetching balance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [address]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (!session) {
    return (
      <div style={{ paddingTop: "100px" }} className="profile-container">
        <div className="profile-card">
          <div className="profile-error">
            Please sign in to view your profile
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "100px" }} className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {!imageError ? (
              <Image
                src={session.user.image}
                alt={session.user.name}
                width={120}
                height={120}
                className="avatar-image"
                onError={() => setImageError(true)}
                priority
              />
            ) : (
              <div className="avatar-fallback">
                {session.user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{session.user.name}</h1>
            <p className="profile-username">@{session.user.username}</p>
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat-box">
            <h4>Wallet Status</h4>
            <p className={isConnected ? "connected" : "disconnected"}>
              {isConnected ? "Connected" : "Disconnected"}
            </p>
          </div>
          
          {isConnected && (
            <div className="stat-box">
              <h4>Wallet Address</h4>
              <div className="wallet-address-container">
                <p className="wallet-address">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
                <button 
                  onClick={copyToClipboard}
                  className="copy-button"
                  title="Copy to clipboard"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {isConnected && (
            <div className="stat-box">
              <h4>Balance</h4>
              <p className="balance">
                {loading ? "Loading..." : `${parseFloat(balance).toFixed(4)} ETH`}
              </p>
            </div>
          )}
        </div>

        <div className="profile-actions">
          <Link href="/account" className="action-button">
            <i className="ti-user"></i>
            Account Settings
          </Link>
          <Link href="/swap" className="action-button">
            <i className="si si-layers"></i>
            LockSwap
          </Link>
          <Link href="/leaderboard" className="action-button">
            <i className="ti-bar-chart"></i>
            View Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
} 