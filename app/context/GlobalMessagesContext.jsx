"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useSession } from "next-auth/react";
import { useAccount } from "wagmi";
import { db } from "../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";

// Constants
const MAX_MESSAGES = 20;

// Create context
const GlobalMessagesContext = createContext();

export function GlobalMessagesProvider({ children }) {
  const { data: session } = useSession();
  const { address } = useAccount();

  // Basic state
  const [messages, setMessages] = useState([]);
  const [isMinimized, setIsMinimized] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0); // Confirm this is 0, not '0'
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  // Refs
  const unsubscribeRef = useRef(null);
  const lastSeenTimestampRef = useRef(Date.now());
  const isMountedRef = useRef(true);

  // Set isMounted ref on mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Set up simple Firestore listener
  useEffect(() => {
    console.log("Setting up Firestore listener");
    setConnectionStatus("connecting");

    // Create simple query
    const messagesRef = collection(db, "messages");
    const messagesQuery = query(
      messagesRef,
      orderBy("timestamp", "desc"),
      limit(MAX_MESSAGES)
    );

    // Set up listener
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        if (!isMountedRef.current) return;

        console.log(`Received ${snapshot.docs.length} messages`);

        // Simple message formatting
        const formattedMessages = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate?.() || new Date(),
          };
        });

        // Update state
        setMessages(formattedMessages);
        setIsLoading(false);
        setConnectionStatus("connected");

        // Handle unread count
        if (isMinimized) {
          const newMessages = formattedMessages.filter(
            (msg) =>
              new Date(msg.timestamp) >
                new Date(lastSeenTimestampRef.current) &&
              msg.walletAddress !== address // Don't count your own messages
          );

          // Only increment by 1 if there are any new messages, regardless of count
          if (newMessages.length > 0) {
            setUnreadCount((prev) => Number(prev) + 1); // Always increment by 1
          }
        }
      },
      (error) => {
        console.error("Firestore error:", error);
        if (isMountedRef.current) {
          setConnectionStatus("disconnected");
          setIsLoading(false);
        }
      }
    );

    // Store unsubscribe function
    unsubscribeRef.current = unsubscribe;

    // Clean up on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isMinimized]);

  // Reset unread count when maximizing
  useEffect(() => {
    if (!isMinimized) {
      setUnreadCount(0);
      lastSeenTimestampRef.current = Date.now();
    }
  }, [isMinimized]);

  // Update the addMessage function to accept userRank as a parameter with a default value
  const addMessage = async (messageData) => {
    try {
      // Verify user is authenticated
      if (!session) {
        console.error("Cannot send message: User not authenticated");
        return false;
      }

      if (!messageData?.text) return false;

      // Create message object
      const message = {
        text: messageData.text,
        user: session?.user?.name || "Anonymous",
        walletAddress: address || "anonymous",
        profileImage: session?.user?.image || null,
        timestamp: serverTimestamp(),
        // Include custom styling if provided
        customStyle: messageData.customStyle || {},
        // Use the rank passed from the component or default to null
        rank: messageData.userRank || null,
      };

      // Add to Firestore
      await addDoc(collection(db, "messages"), message);
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  };

  // Create retry connection function
  const retryConnection = () => {
    // Clean up existing connection
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Reset state
    setConnectionStatus("connecting");
    setIsLoading(true);

    // Recreate query
    const messagesRef = collection(db, "messages");
    const messagesQuery = query(
      messagesRef,
      orderBy("timestamp", "desc"),
      limit(MAX_MESSAGES)
    );

    // Set up listener again
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        if (!isMountedRef.current) return;

        const formattedMessages = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate?.() || new Date(),
          };
        });

        setMessages(formattedMessages);
        setIsLoading(false);
        setConnectionStatus("connected");

        // If you're counting unread messages here too, add the same filter:
        if (isMinimized) {
          const newMessages = formattedMessages.filter(
            (msg) =>
              new Date(msg.timestamp) >
                new Date(lastSeenTimestampRef.current) &&
              msg.walletAddress !== address // Don't count your own messages
          );

          // Only increment by 1 if there are any new messages, regardless of count
          if (newMessages.length > 0) {
            setUnreadCount((prev) => Number(prev) + 1); // Always increment by 1
          }
        }
      },
      (error) => {
        console.error("Firestore error on retry:", error);
        if (isMountedRef.current) {
          setConnectionStatus("disconnected");
          setIsLoading(false);
        }
      }
    );

    unsubscribeRef.current = unsubscribe;
  };

  // Context value
  const contextValue = {
    messages,
    isMinimized,
    unreadCount,
    isLoading,
    connectionStatus,
    toggleMinimized: () => setIsMinimized((prev) => !prev),
    minimize: () => setIsMinimized(true),
    maximize: () => setIsMinimized(false),
    addMessage,
    currentUser: {
      username: session?.user?.name || address?.slice(0, 6) || "User",
      walletAddress: address || "anonymous",
      profileImage: session?.user?.image || null,
    },
    retryConnection,
  };

  return (
    <GlobalMessagesContext.Provider value={contextValue}>
      {children}
    </GlobalMessagesContext.Provider>
  );
}

export const useGlobalMessages = () => useContext(GlobalMessagesContext);
