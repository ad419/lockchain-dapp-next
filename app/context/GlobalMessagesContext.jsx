"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";

const MAX_VISIBLE_MESSAGES = 10;
const GlobalMessagesContext = createContext();

export function GlobalMessagesProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [isMinimized, setIsMinimized] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenId, setLastSeenId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  useEffect(() => {
    // Set up Firebase listener
    setConnectionStatus("connecting");
    setIsLoading(true);

    const messagesRef = collection(db, "messages");
    const messagesQuery = query(
      messagesRef,
      orderBy("timestamp", "desc"),
      limit(MAX_VISIBLE_MESSAGES)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const newMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp:
            doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp),
        }));

        setMessages(newMessages);
        setConnectionStatus("connected");
        setIsLoading(false);

        // If minimized, increase unread count for new messages
        if (isMinimized && lastSeenId) {
          const lastSeenIndex = newMessages.findIndex(
            (msg) => msg.id === lastSeenId
          );
          if (lastSeenIndex > 0) {
            setUnreadCount((prev) => prev + lastSeenIndex);
          } else if (lastSeenIndex === -1 && newMessages.length > 0) {
            // If last seen message isn't found, all messages are new
            setUnreadCount((prev) => prev + newMessages.length);
          }
        }
      },
      (error) => {
        console.error("Error in messages listener:", error);
        setConnectionStatus("disconnected");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isMinimized, lastSeenId]);

  // Reset unread count when maximized
  useEffect(() => {
    if (!isMinimized) {
      setUnreadCount(0);
      if (messages.length > 0) {
        setLastSeenId(messages[0].id);
      }
    }
  }, [isMinimized, messages]);

  const dismissMessage = (id) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const value = {
    messages,
    isMinimized,
    unreadCount,
    isLoading,
    connectionStatus,
    toggleMinimized: () => setIsMinimized((prev) => !prev),
    minimize: () => setIsMinimized(true),
    maximize: () => setIsMinimized(false),
    dismissMessage,
    clearUnread: () => setUnreadCount(0),
  };

  return (
    <GlobalMessagesContext.Provider value={value}>
      {children}
    </GlobalMessagesContext.Provider>
  );
}

export const useGlobalMessages = () => useContext(GlobalMessagesContext);
