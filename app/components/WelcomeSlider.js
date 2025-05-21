import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/welcomeSlider.css"; // Make sure to create this file

const SLIDES = [
  {
    title: "AI-Designed Token Mechanics",
    content:
      "When game theory meets AI smart contract innovation, a radical financial experiment emerges.",
    image: "https://i.ibb.co/VcJbFYrT/lc-ai.png",
  },
  {
    title: "37% Auto-Lock Mechanism",
    content:
      "LockChain automatically locks 37% of every DEX purchase over a year through weekly vesting.",
    image: "https://i.ibb.co/1Y8bb3Tq/lc-vesting.png",
  },
  {
    title: "Revolutionary Economics",
    content:
      "This groundbreaking mechanism has never been attempted in blockchain history.",
    image: "https://i.ibb.co/7tJMm4HJ/lc-muscles.png",
  },
  {
    title: "Secure By Design",
    content:
      "LockChain's smart contracts have been audited for the highest levels of security.",
    image: "https://i.ibb.co/fY6cgSpf/logo.png",
  },
];

export default function WelcomeSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoPlayActive, setAutoPlayActive] = useState(true);

  // Handle auto-rotation of slides
  useEffect(() => {
    let interval;

    if (autoPlayActive) {
      interval = setInterval(() => {
        setCurrentSlide((prevSlide) => (prevSlide + 1) % SLIDES.length);
      }, 5000); // Change slide every 5 seconds
    }

    return () => clearInterval(interval);
  }, [autoPlayActive]);

  // Navigation functions
  const nextSlide = () => {
    setAutoPlayActive(false); // Pause autoplay when manually navigating
    setCurrentSlide((prevSlide) => (prevSlide + 1) % SLIDES.length);

    // Resume autoplay after 10 seconds of inactivity
    setTimeout(() => setAutoPlayActive(true), 10000);
  };

  const prevSlide = () => {
    setAutoPlayActive(false); // Pause autoplay when manually navigating
    setCurrentSlide(
      (prevSlide) => (prevSlide - 1 + SLIDES.length) % SLIDES.length
    );

    // Resume autoplay after 10 seconds of inactivity
    setTimeout(() => setAutoPlayActive(true), 10000);
  };

  const goToSlide = (index) => {
    setAutoPlayActive(false); // Pause autoplay when manually navigating
    setCurrentSlide(index);

    // Resume autoplay after 10 seconds of inactivity
    setTimeout(() => setAutoPlayActive(true), 10000);
  };

  return (
    <div className="custom-slider">
      {/* Slide Container - Now full width/height */}
      <div className="slide-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="slide"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
            style={{ height: "100%" }} // Explicitly set height
          >
            <div className="slide-content">
              <div className="slide-image-container">
                <Image
                  src={SLIDES[currentSlide].image}
                  alt={SLIDES[currentSlide].title}
                  width={80}
                  height={80}
                  className="slide-image"
                  priority // Added to ensure images load quickly
                />
              </div>
              <h3 className="slide-title">{SLIDES[currentSlide].title}</h3>
              <p className="slide-description">
                {SLIDES[currentSlide].content}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows */}
      <button
        className="nav-arrow prev-arrow"
        onClick={prevSlide}
        aria-label="Previous slide"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15 18L9 12L15 6"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        className="nav-arrow next-arrow"
        onClick={nextSlide}
        aria-label="Next slide"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 18L15 12L9 6"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Pagination Dots - Positioned lower */}
      <div className="pagination-dots">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            className={`pagination-dot ${
              index === currentSlide ? "active" : ""
            }`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
