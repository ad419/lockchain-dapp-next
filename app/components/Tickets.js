"use client";
import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  limit,
  addDoc,
} from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../styles/Tickets.css";

// Update all toast calls with this configuration
const toastConfig = {
  position: "bottom-right",
  autoClose: 4000,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "dark",
  style: {
    borderRadius: "10px",
    background: "#333",
    color: "#fff",
  },
};

const Tickets = () => {
  const [walletId, setWalletId] = useState("");
  const [prizeCode, setPrizeCode] = useState("");
  const [walletError, setWalletError] = useState("");
  const [errorKey, setErrorKey] = useState(0);
  const [contactInfo, setContactInfo] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [contactError, setContactError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [claimedPrize, setClaimedPrize] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [db, setDb] = useState(null);

  // Load Firebase safely
  useEffect(() => {
    const loadFirebase = async () => {
      try {
        // Import the firebase instance that's already initialized
        const { db } = await import("../lib/firebase");
        setDb(db);
        setFirebaseReady(true);
      } catch (error) {
        console.error("Error loading Firebase:", error);
        toast.error(
          "Error connecting to server. Please try again later.",
          toastConfig
        );
      }
    };

    loadFirebase();
  }, []);

  // Success Modal Component
  const SuccessModal = ({ prize, onClose }) => {
    const getMessage = (prize) => {
      const telegramLink = (
        <a
          href="https://t.me/+A953v5-XuH9mMmIy"
          target="_blank"
          rel="noopener noreferrer"
          className="telegram-link"
        >
          https://t.me/lockchainportal
        </a>
      );

      switch (prize) {
        case 100:
          return {
            title: "$100 Winner (Ultra Rare)",
            message: (
              <>
                Jackpot! 🔥 You've won $100 in $LockChain tokens! More rewards
                could be airdropped on this card in the future—keep it safe!
                <br />
                <br />
                📩 Join our TG to get launch updates: {telegramLink}
              </>
            ),
          };
        case 50:
          return {
            title: "🎉 $50 Winner (Rare)",
            message: (
              <>
                Big win! $50 in $LockChain tokens is yours! More rewards could
                be airdropped on this card in the future—keep it safe!
                <br />
                <br />
                📩 Join our TG to get launch updates: {telegramLink}
              </>
            ),
          };
        case 10:
          return {
            title: "🚀 $10 Winner (Common)",
            message: (
              <>
                You're in! 💎 $10 in $LockChain tokens is now yours! More
                rewards could be airdropped on this card in the future—keep it
                safe!
                <br />
                <br />
                📩 Join our TG to get launch updates: {telegramLink}
              </>
            ),
          };
        case 5:
          return {
            title: "🔒 $5 Winner (Very Common)",
            message: (
              <>
                Nice! $5 in $LockChain tokens secured! More rewards could be
                airdropped on this card in the future—keep it safe!
                <br />
                <br />
                📩 Join our TG to get launch updates: {telegramLink}
              </>
            ),
          };
        default:
          return {
            title: "😔 0 Tokens (No Airdrop)",
            message: (
              <>
                Not this time… but don't toss your Lucky Card! It could still
                unlock rewards in the future for early holders.
                <br />
                <br />
                📩 Join our TG to get launch updates: {telegramLink}
              </>
            ),
          };
      }
    };

    const result = getMessage(prize);

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>{result.title}</h2>
          <div className="message-content">{result.message}</div>
          <button className="close-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  };

  // Validation functions
  const isValidWalletAddress = (address) => {
    const walletRegex = /^(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})$/;
    return walletRegex.test(address);
  };

  const detectContactType = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const twitterRegex = /^[@]?([a-zA-Z0-9_]{1,15})$/;

    if (emailRegex.test(value)) return "email";
    if (twitterRegex.test(value)) return "twitter";
    return null;
  };

  const handleContactChange = (e) => {
    const value = e.target.value;
    setContactInfo(value);

    if (value && !detectContactType(value)) {
      setContactError("Please enter a valid email or X/Twitter handle");
    } else {
      setContactError("");
    }
  };

  const handleWalletChange = (e) => {
    const value = e.target.value;
    setWalletId(value);

    if (!value || !isValidWalletAddress(value)) {
      setWalletError(
        "Please enter Base instead of Ethereum wallet address (0x followed by 40 hexadecimal characters)"
      );
      setErrorKey((prev) => prev + 1);
      setIsVerified(false); // Reset verification on invalid wallet
    } else {
      setWalletError("");
      // Check verification when wallet is valid
      if (value && prizeCode) {
        setIsVerified(true);
      }
    }
  };

  // Add prize code change handler
  const handlePrizeCodeChange = (e) => {
    const value = e.target.value;
    setPrizeCode(value);

    // Reset verification if code is empty
    if (!value) {
      setIsVerified(false);
      return;
    }

    // Check verification when prize code is entered
    if (value && walletId && isValidWalletAddress(walletId)) {
      setIsVerified(true);
    }
  };

  // Add this before the handleSubmit function
  const checkWalletClaims = async (walletAddress) => {
    if (!db) return false;

    try {
      const claimsRef = collection(db, "claims");
      const q = query(
        claimsRef,
        where("walletId", "==", walletAddress),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast.error("This wallet has already claimed a prize", toastConfig);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking wallet claims:", error);
      toast.error(
        "Error checking wallet status. Please try again.",
        toastConfig
      );
      return false;
    }
  };

  // Update the handleSubmit function
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!firebaseReady || !db) {
      toast.error(
        "Server connection not ready. Please try again.",
        toastConfig
      );
      return;
    }

    if (!isValidWalletAddress(walletId)) {
      toast.error("Invalid wallet address", toastConfig);
      return;
    }

    setIsLoading(true);
    try {
      const hasExistingClaim = await checkWalletClaims(walletId);
      if (hasExistingClaim) {
        setIsLoading(false);
        return;
      }

      const ticketsRef = collection(db, "tickets");
      const q = query(
        ticketsRef,
        where("ticketNumber", "==", prizeCode),
        where("claimed", "==", false)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Instead of showing error toast, show $5 prize modal
        setClaimedPrize(5);
        setShowSuccessModal(true);

        // Create a claim record for the $5 prize
        const claimsRef = collection(db, "claims");
        await addDoc(claimsRef, {
          ticketId: "non-existent",
          walletId: walletId,
          prizeCode: prizeCode,
          prize: 5,
          claimedAt: new Date().toISOString(),
          contactInfo: contactInfo
            ? {
                type: detectContactType(contactInfo),
                value: contactInfo,
              }
            : null,
        });

        // Reset form
        setWalletId("");
        setPrizeCode("");
        setContactInfo("");
        setIsVerified(false);
        setIsLoading(false);
        return;
      }

      const ticketDoc = querySnapshot.docs[0];
      const ticketData = ticketDoc.data();

      // Update the ticket
      await updateDoc(doc(db, "tickets", ticketDoc.id), {
        claimed: true,
        claimedBy: walletId,
        claimedAt: new Date().toISOString(),
        status: "passive",
        contactInfo: contactInfo
          ? {
              type: detectContactType(contactInfo),
              value: contactInfo,
            }
          : null,
      });

      // Create claim record in claims collection
      const claimsRef = collection(db, "claims");
      await addDoc(claimsRef, {
        ticketId: ticketDoc.id,
        walletId: walletId,
        prizeCode: prizeCode,
        prize: ticketData.prize,
        claimedAt: new Date().toISOString(),
        contactInfo: contactInfo
          ? {
              type: detectContactType(contactInfo),
              value: contactInfo,
            }
          : null,
      });

      // Instead of alert, show success modal and trigger confetti
      setClaimedPrize(ticketData.prize);
      setShowSuccessModal(true);

      // Reset form
      setWalletId("");
      setPrizeCode("");
      setContactInfo("");
      setIsVerified(false);
    } catch (error) {
      console.error("Error claiming ticket:", error);
      toast.error("Error claiming ticket. Please try again.", toastConfig);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading indicator while Firebase initializes
  if (!firebaseReady) {
    return (
      <div className="tickets-container-bg">
        <div className="tickets-container">
          <h2>Loading...</h2>
          <div className="loader-container">
            <div className="loader"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tickets-container-bg">
      <div className="tickets-container">
        <h2>Check Your Ticket</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="labbel_text" htmlFor="walletId">
              Wallet Address
            </label>
            <input
              type="text"
              id="walletId"
              value={walletId}
              onChange={handleWalletChange}
              placeholder="Enter your wallet Address"
              required
              className={walletError ? "error" : ""}
            />
            {walletError && (
              <span key={errorKey} className="error-message">
                {walletError}
              </span>
            )}
          </div>
          <div className="input-group">
            <label className="labbel_text" htmlFor="prizeCode">
              Unique Code
            </label>
            <input
              type="text"
              id="prizeCode"
              value={prizeCode}
              onChange={handlePrizeCodeChange}
              placeholder="Enter unique Code"
              required
            />
          </div>

          {isVerified && (
            <div
              className={`input-group contact-section ${
                isVerified ? "visible" : ""
              }`}
            >
              <label className="labbel_text">Stay in touch (Optional)</label>
              <div className="contact-input-wrapper">
                <input
                  type="text"
                  value={contactInfo}
                  onChange={handleContactChange}
                  placeholder="(X username / Email) "
                  className={`contact-input ${contactError ? "error" : ""} ${
                    contactInfo && detectContactType(contactInfo)
                      ? `contact-type-${detectContactType(contactInfo)}`
                      : ""
                  }`}
                />
                {contactInfo && !contactError && (
                  <span className="contact-type-indicator">
                    {detectContactType(contactInfo) === "email" ? "✉️" : "𝕏"}
                  </span>
                )}
              </div>
              {contactError && (
                <span className="error-message">{contactError}</span>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={
              !!walletError || (contactInfo && !!contactError) || isLoading
            }
            className={isLoading ? "loading" : ""}
          >
            {isLoading ? (
              <div className="loader-container">
                <div className="loader"></div>
                <span>Processing...</span>
              </div>
            ) : isVerified ? (
              "Submit"
            ) : (
              "Claim Airdrop"
            )}
          </button>
        </form>
      </div>

      {showSuccessModal && (
        <SuccessModal
          prize={claimedPrize}
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        style={{
          width: "auto",
          maxWidth: "350px",
        }}
      />
    </div>
  );
};

export default Tickets;
