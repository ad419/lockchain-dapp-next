"use client";
import { useSession } from "next-auth/react";
import Messages from "../../components/Messages";
import { IoArrowBack } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ChatPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Use state to store data that will be passed from the query params
  const [userDataFromLeaderboard, setUserDataFromLeaderboard] = useState({
    walletData: null,
    holderData: null,
  });

  // Parse URL params on mount to get data passed from Leaderboard
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        // Try to get data from localStorage that was saved by Leaderboard
        const storedWalletData = localStorage.getItem("userWalletData");
        const storedHolderData = localStorage.getItem("userHolderData");

        if (storedWalletData) {
          setUserDataFromLeaderboard((prev) => ({
            ...prev,
            walletData: JSON.parse(storedWalletData),
          }));
        }

        if (storedHolderData) {
          setUserDataFromLeaderboard((prev) => ({
            ...prev,
            holderData: JSON.parse(storedHolderData),
          }));
        }
      } catch (error) {
        console.error("Error parsing stored user data:", error);
      }
    }
  }, []);

  return (
    <div className="chat-page">
      <div className="chat-page-header">
        <button
          className="back-button"
          onClick={() => router.back()}
          aria-label="Go back"
        >
          <IoArrowBack size={24} />
        </button>
        <h1>LockChain Chat</h1>
        <div className="spacer"></div>
      </div>

      <div className="chat-container">
        <Messages
          session={session}
          userWalletData={userDataFromLeaderboard.walletData}
          userHolderData={userDataFromLeaderboard.holderData}
          isFullscreenMode={true}
        />
      </div>
    </div>
  );
}
