"use client";

export default function DisconnectModal({ isOpen, onClose, onConfirm, type }) {
  if (!isOpen) return null;

  const messages = {
    twitter: {
      title: "Disconnect X Account",
      message: "Warning: Disconnecting your X account will remove your social profile from the leaderboard and disable social features. Your wallet will no longer be associated with your X profile.",
      confirmText: "Disconnect X Account"
    },
    wallet: {
      title: "Disconnect Wallet",
      message: "Warning: Disconnecting your wallet will sign you out of Web3 features. You'll need to reconnect your wallet to view balances and use platform features.",
      confirmText: "Disconnect Wallet"
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h3>{messages[type].title}</h3>
        <p>{messages[type].message}</p>
        <div className="modal-actions">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="disconnect-button" onClick={onConfirm}>
            {messages[type].confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}