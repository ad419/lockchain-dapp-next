"use client";

import { useState, useEffect, useRef, forwardRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import '../styles/Messages.css';

const MAX_VISIBLE_MESSAGES = 14; // Updated limit
const COOLDOWN_TIME = 30000;

// Update the Message component to include staggered animations
const Message = forwardRef(({ msg, userWalletData, onDismiss, index }, ref) => {
  return (
    <motion.div
      ref={ref}
      className={`message-float ${
        msg.walletAddress === userWalletData?.walletAddress ? 'own-message' : ''
      }`}
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
      transition={{ 
        type: "spring",
        stiffness: 50, 
        damping: 20,
        delay: index * 0.08 // Add staggered delay based on index
      }}
      whileHover={{
        scale: 1.02
      }}
      style={{
        backfaceVisibility: "hidden",
        WebkitFontSmoothing: "subpixel-antialiased",
      }}
    >
      <img
        src={msg.profileImage}
        alt={msg.user}
        className="message-avatar"
        onError={(e) => {
          e.target.src = '/default-avatar.png';
        }}
        draggable={false}
      />
      <div className="message-content">
        <span className="message-username">@{msg.user}</span>
        <p className="message-text">{msg.text}</p>
      </div>
      <button 
        className="message-close"
        onClick={() => onDismiss(msg.id)}
        aria-label="Close message"
      >
        ×
      </button>
    </motion.div>
  );
});

// Important: Add a display name for better debugging
Message.displayName = 'Message';

// Update the ChatFab component to include toggle functionality with opposite positioning
const ChatFab = ({ onClick, showInput, messageCount, onToggleMessages, showMessages, hasMessages }) => {
  return (
    <div className="mobile-chat-controls">
      {/* Toggle messages button - positioned on left */}
      {hasMessages && (
        <motion.button
          className="messages-toggle-mobile"
          onClick={onToggleMessages}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={showMessages ? "Hide messages" : "Show messages"}
        >
          <span className="fab-icon">{showMessages ? "👁️" : "👓"}</span>
        </motion.button>
      )}
      
      {/* Spacer div to push chat button to right */}
      <div style={{ flex: 1 }}></div>
      
      {/* Chat button - positioned on right */}
      <motion.button
        className="chat-fab"
        onClick={onClick}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {showInput ? (
          <span className="fab-icon">×</span>
        ) : (
          <>
            <span className="fab-icon">💬</span>
            {messageCount > 0 && (
              <span className="fab-badge">{messageCount > 99 ? '99+' : messageCount}</span>
            )}
          </>
        )}
      </motion.button>
    </div>
  );
};

export default function Messages({ session, userWalletData }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [showInput, setShowInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const eventSourceRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Add these new states
  const [isMobile, setIsMobile] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [lastSeenMessageId, setLastSeenMessageId] = useState(null);
  const [showMessages, setShowMessages] = useState(true);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        setShowInput((prev) => !prev);
        if (!showInput && inputRef.current) {
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showInput]);

  useEffect(() => {
    const setupEventSource = () => {
      console.log('Setting up EventSource...');
      const eventSource = new EventSource('/api/messages/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => console.log('SSE Connected');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.messages) {
            // Ensure consistent ordering by timestamp first, then by ID
            const sortedMessages = [...data.messages].sort((a, b) => {
              // First sort by timestamp
              const timeA = new Date(a.timestamp).getTime();
              const timeB = new Date(b.timestamp).getTime();
              
              // If timestamps are equal (rare but possible), use message ID as secondary sort
              if (timeA === timeB) {
                return a.id.localeCompare(b.id);
              }
              
              return timeA - timeB; // Ascending order (oldest first)
            });
            
            // Take just the last MAX_VISIBLE_MESSAGES
            const latestMessages = sortedMessages.slice(-MAX_VISIBLE_MESSAGES);
            setMessages(latestMessages);
          }
        } catch (error) {
          console.error('Parse error:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        eventSource.close();
        setTimeout(setupEventSource, 3000);
      };
    };

    setupEventSource();
    return () => eventSourceRef.current?.close();
  }, []);

  useEffect(() => {
    if (cooldown && cooldownTime > 0) {
      const timer = setInterval(() => {
        setCooldownTime((prev) => {
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

  // Add device detection
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Track new messages
  useEffect(() => {
    if (messages.length > 0 && !showInput) {
      const newestMessageId = messages[messages.length - 1].id;
      
      if (lastSeenMessageId && lastSeenMessageId !== newestMessageId) {
        // Count new messages since last seen
        const lastSeenIndex = messages.findIndex(msg => msg.id === lastSeenMessageId);
        if (lastSeenIndex !== -1) {
          setNewMessageCount(messages.length - lastSeenIndex - 1);
        } else {
          setNewMessageCount(prev => prev + 1);
        }
      } else if (!lastSeenMessageId) {
        setLastSeenMessageId(newestMessageId);
      }
    }
  }, [messages, lastSeenMessageId, showInput]);

  // Reset counter when chat is opened
  useEffect(() => {
    if (showInput && messages.length > 0) {
      setLastSeenMessageId(messages[messages.length - 1].id);
      setNewMessageCount(0);
    }
  }, [showInput, messages]);

  // Update toggle function for show/hide messages
  const toggleMessages = () => {
    setShowMessages(prev => !prev);
  };

  // Update the auto-dismiss effect for staggered dismissal
  useEffect(() => {
    if (isMobile && messages.length > 0) {
      // Staggered auto-dismiss
      const timers = messages.map((msg, index) => {
        // Stagger dismissals by 1 second for each message
        return setTimeout(() => {
          dismissMessage(msg.id);
        }, 30000 + (index * 1000)); // Base 30s + stagger
      });
      
      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [messages, isMobile]);

  const sendMessage = async (e) => {
    e.preventDefault();
    
    // Additional check for empty message after trim
    const messageText = message.trim();
    if (!session || !messageText || cooldown || isSubmitting) return;

    // Prevent double submissions
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setMessage(''); // Clear input immediately

      const response = await fetch('/api/messages/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: messageText,
          walletAddress: userWalletData?.walletAddress,
          user: session.user.name,
          profileImage: session.user.image,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      setCooldown(true);
      setCooldownTime(COOLDOWN_TIME);
    } catch (error) {
      console.error('Send error:', error);
      setMessage(messageText); // Restore message if failed
    } finally {
      // Add a small delay before allowing new submissions
      setTimeout(() => {
        setIsSubmitting(false);
      }, 500);
    }
  };

  const dismissMessage = (id) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  // Update toggle function for FAB
  const toggleChatInput = () => {
    setShowInput(prev => {
      const newState = !prev;
      
      if (newState) {
        // Show messages when opening chat
        setShowMessages(true);
        
        // Only do special scrolling on desktop
        if (!isMobile) {
          setTimeout(() => {
            // Scroll to middle of viewport if not mobile
            const viewportHeight = window.innerHeight;
            const scrollTarget = Math.max(0, window.scrollY + (viewportHeight / 2) - 150);
            window.scrollTo({
              top: scrollTarget,
              behavior: 'smooth'
            });
          }, 150);
        }
        
        // Focus the input field in all cases
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 200);
      }
      
      return newState;
    });
  };

  return (
    <>
      {/* Chat Messages - Animate with staggered appearance/disappearance */}
      <AnimatePresence>
        {showMessages && (
          <motion.div
            className="messages-float"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {[...messages].map((msg, index) => (
                <Message
                  key={msg.id}
                  msg={msg}
                  userWalletData={userWalletData}
                  onDismiss={dismissMessage}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add the toggle button */}
      {!isMobile && session && (
        <button 
          className="messages-toggle"
          onClick={toggleMessages}
          aria-label={showMessages ? "Hide messages" : "Show messages"}
        >
          {showMessages ? "Hide" : "Show"} Messages
        </button>
      )}

      {/* Mobile Chat FAB */}
      {isMobile && session && (
        <ChatFab 
          onClick={toggleChatInput} 
          showInput={showInput}
          messageCount={newMessageCount}
          onToggleMessages={toggleMessages}
          showMessages={showMessages}
          hasMessages={messages.length > 0}
        />
      )}

      {/* Chat Input */}
      <AnimatePresence>
        {showInput && session && (
          <motion.div
            className={`chat-input-overlay ${isMobile ? 'mobile' : ''}`}
            initial={{ opacity: 0, y: isMobile ? 100 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? 100 : 0 }}
          >
            <div className="chat-input-container">
              <div className="chat-input-header">
                <span>Send Message</span>
                <button 
                  onClick={() => setShowInput(false)}
                  className="close-button"
                >
                  ×
                </button>
              </div>
              <form onSubmit={sendMessage} className="chat-input-form">
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    cooldown
                      ? `Wait ${Math.ceil(cooldownTime / 1000)}s...`
                      : 'Type your message...'
                  }
                  disabled={cooldown}
                  className="chat-input"
                  maxLength={100}
                />
                <button
                  type="submit"
                  disabled={cooldown || !message.trim() || isSubmitting}
                  className="send-button"
                >
                  {cooldown ? `${Math.ceil(cooldownTime / 1000)}s` : 
                   isSubmitting ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}