"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import useSWR from 'swr';
import '../styles/Messages.css';

const COOLDOWN_TIME = 30000; // 30 seconds cooldown
const MESSAGE_LIMIT = 5;

export default function Messages({ session, userWalletData }) {
  const [showInput, setShowInput] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [cooldown, setCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const inputRef = useRef(null);
  const lastMessageTimestamp = useRef(0);

  // Update SWR config to prevent excessive calls
  const { data } = useSWR(
    '/api/messages',
    {
      refreshInterval: 5000, // Poll every 5 seconds instead of every millisecond
      revalidateOnFocus: false,
      dedupingInterval: 4000,
      onSuccess: (newData) => {
        if (newData.timestamp > lastMessageTimestamp.current) {
          setMessages(newData.messages);
          lastMessageTimestamp.current = newData.timestamp;
        }
      }
    }
  );

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        setShowInput(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when shown
  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  // Handle cooldown timer
  useEffect(() => {
    if (cooldown && cooldownTime > 0) {
      const timer = setInterval(() => {
        setCooldownTime(prev => {
          if (prev <= 1000) {
            setCooldown(false);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown, cooldownTime]);

  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: Math.random(), y: 0.6 }
    });
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!session || !message.trim() || cooldown) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message.trim(),
          walletAddress: userWalletData?.walletAddress
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      setMessage('');
      setCooldown(true);
      setCooldownTime(COOLDOWN_TIME);
      triggerConfetti();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <>
      <AnimatePresence>
        {messages.map((msg, index) => (
          <motion.div
            key={msg.id}
            className="message-bubble"
            style={{
              bottom: `${20 + (index * 70)}px`,
              right: '20px'
            }}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
          >
            <img src={msg.profileImage} alt={msg.user} className="message-avatar" />
            <div className="message-content">
              <span className="message-username">@{msg.user}</span>
              <p className="message-text">{msg.text}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="message-input-container"
          >
            <div className="input-header">
              <span>Send Message</span>
              <button 
                onClick={() => setShowInput(false)} 
                className="close-button"
              >
                ×
              </button>
            </div>
            <form onSubmit={sendMessage}>
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={cooldown ? `Wait ${Math.ceil(cooldownTime/1000)}s...` : "Type your message..."}
                disabled={cooldown}
                className="message-input"
                maxLength={100}
              />
              <button 
                type="submit" 
                disabled={cooldown || !message.trim() || !session}
                className="send-button"
              >
                {cooldown ? `${Math.ceil(cooldownTime/1000)}s` : 'Send'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}