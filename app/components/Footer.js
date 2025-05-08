import React from "react";
import Link from "next/link";
import "../styles/Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="copyright-section">
            <div className="logo">
              <span className="lock-icon">🔒</span>
              <span className="chain-text">LockChain</span>
            </div>
            <div className="copyright">
              © {new Date().getFullYear()} $LockChain All Rights Reserved
            </div>
          </div>

          <div className="links-section">
            <div className="link-group">
              <h4>Community</h4>
              <div className="social-links">
                <Link
                  href="https://t.me/+A953v5-XuH9mMmIy"
                  className="footer-link"
                >
                  Telegram
                </Link>
                <Link href="https://x.com/LockChainAi" className="footer-link">
                  Twitter
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="watermark">
          Website by <span className="updater-signature">Updater</span>
        </div>
      </div>
    </footer>
  );
}
