"use client";

import { useEffect, useState } from "react";
import "../styles/PublicProfile.css";

/**
 * Profile Skeleton Component for loading state
 */
export default function ProfileSkeleton() {
  const [skeletonWidth, setSkeletonWidth] = useState("90%");

  useEffect(() => {
    const updateWidth = () => {
      const width = window.innerWidth;
      if (width > 1440) {
        setSkeletonWidth("900px"); // Large screens
      } else if (width > 1024) {
        setSkeletonWidth("80%"); // Medium-large screens
      } else if (width > 768) {
        setSkeletonWidth("90%"); // Medium screens
      } else {
        setSkeletonWidth("95%"); // Small screens
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    <div className="profile-page-container profile-skeleton-container">
      <div
        className="profile-main-card profile-skeleton-card"
        style={{ maxWidth: skeletonWidth }}
      >
        <div className="profile-header-section">
          <div className="profile-banner-img profile-skeleton-banner" />
          <div className="profile-avatar-container">
            <div className="profile-avatar-img profile-skeleton-avatar">
              <div className="profile-skeleton-pulse"></div>
            </div>
          </div>
          <div className="profile-user-info">
            <div className="profile-skeleton-name">
              <div className="profile-skeleton-pulse"></div>
            </div>
            <div className="profile-skeleton-handle">
              <div className="profile-skeleton-pulse"></div>
            </div>
            <div className="profile-skeleton-wallet-badge">
              <div className="profile-skeleton-pulse"></div>
            </div>
            <div className="profile-skeleton-join-date">
              <div className="profile-skeleton-pulse"></div>
            </div>
          </div>
        </div>

        <div className="profile-stats-grid">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="profile-stat-card profile-skeleton-stat-card"
            >
              <div className="profile-skeleton-icon">
                <div className="profile-skeleton-pulse-circle"></div>
              </div>
              <div className="profile-skeleton-stat-title">
                <div className="profile-skeleton-pulse"></div>
              </div>
              <div className="profile-skeleton-stat-value">
                <div className="profile-skeleton-pulse"></div>
              </div>
              <div className="profile-skeleton-stat-subtitle">
                <div className="profile-skeleton-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="profile-activity-section">
          <div className="profile-skeleton-section-title">
            <div className="profile-skeleton-pulse"></div>
          </div>
          <div className="profile-holder-status">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="profile-status-item profile-skeleton-status-item"
              >
                <div className="profile-skeleton-status-label">
                  <div className="profile-skeleton-pulse"></div>
                </div>
                <div className="profile-skeleton-status-value">
                  <div className="profile-skeleton-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="profile-social-section">
          <div className="profile-skeleton-social-link">
            <div className="profile-skeleton-pulse"></div>
          </div>
        </div>

        <div className="profile-refresh-section">
          <div className="profile-skeleton-button">
            <div className="profile-skeleton-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
