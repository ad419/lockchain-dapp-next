"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount, useDisconnect } from "wagmi";
import { ethers } from "ethers";
import "../styles/Profile.css";
import { LuClipboard } from "react-icons/lu";
import { LuClipboardCheck } from "react-icons/lu";
import { contract, DEFAULT_CHAIN } from "../hooks/constant";
import tokenAbi from "../json/token.json";
import Web3 from "web3";
import { signOut } from "next-auth/react";
import DisconnectModal from './DisconnectModal';

export default function Profile() {
  const { data: session, status } = useSession(); // Add status from useSession
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [balance, setBalance] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [showProfile, setShowProfile] = useState(true);

  // Add loading spinner component
  const LoadingSpinner = () => (
    <div style={{ paddingTop: "100px" }} className="profile-container">
      <div className="profile-card">
        <div className="loading-spinner">
          <div className="spinner"></div>
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

        const tokenBalanceRaw = await tokenContract.methods.balanceOf(address).call();
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

  useEffect(() => {
    const fetchVisibility = async () => {
      if (address) {
        const response = await fetch(`/api/profile-visibility?address=${address}`);
        const data = await response.json();
        setShowProfile(data.showProfile);
      }
    };
    fetchVisibility();
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

  const handleDisconnectWallet = () => {
    setModalType('wallet');
    setShowModal(true);
  };

  const handleDisconnectTwitter = () => {
    setModalType('twitter');
    setShowModal(true);
  };

  const handleConfirmDisconnect = async () => {
    if (modalType === 'wallet') {
      disconnect();
    } else if (modalType === 'twitter') {
      await signOut({ redirect: false });
    }
    setShowModal(false);
  };

  const handleToggleVisibility = async () => {
    try {
      const response = await fetch('/api/profile-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address: address,
          showProfile: !showProfile 
        })
      });

      if (response.ok) {
        setShowProfile(!showProfile);
      }
    } catch (error) {
      console.error('Error toggling profile visibility:', error);
    }
  };

  // Show loading state while checking session
  if (status === "loading") {
    return <LoadingSpinner />;
  }

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

  const username = session?.user?.username || session?.user?.name?.split('@')[0] || "User";

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
            <h1 className="profile-name">
              {session.user.name?.includes('@') 
                ? session.user.name.split('@')[0] 
                : session.user.name}
            </h1>
            <p className="profile-username">@{username}</p>
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
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: copied ? '#00ff00' : '#1253ff'
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
              <div className="stat-box">
                <h4>ETH Balance</h4>
                <p className="balance">
                  {loading ? "Loading..." : `${parseFloat(balance).toFixed(4)} ETH`}
                </p>
              </div>
              <div className="stat-box">
                <h4>LockChain Balance</h4>
                <p className="balance">
                  {loading ? "Loading..." : 
                    tokenBalance ? `${parseFloat(tokenBalance).toFixed(2)} LOCKCHAIN` : "0 LOCKCHAIN"}
                </p>
              </div>
            </>
          )}

          <div className="stat-box">
            <h4>X Profile Visibility</h4>
            <div className="visibility-toggle">
              <button 
                onClick={handleToggleVisibility}
                className={`toggle-button ${showProfile ? 'visible' : 'hidden'}`}
              >
                {showProfile ? 'Visible on Leaderboard' : 'Hidden from Leaderboard'}
              </button>
            </div>
          </div>
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

          <div className="disconnect-actions">
            {isConnected && (
              <button 
                onClick={handleDisconnectWallet}
                className="disconnect-button wallet"
              >
                Disconnect Wallet
              </button>
            )}
            {session && (
              <button 
                onClick={handleDisconnectTwitter}
                className="disconnect-button twitter"
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