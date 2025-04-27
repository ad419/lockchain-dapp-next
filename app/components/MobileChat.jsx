"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Messages from "../components/Messages";
import { motion } from "framer-motion";
import Link from "next/link";
import { IoArrowBack } from "react-icons/io5";
import { useWalletData } from "../hooks/useWalletData";
import { useHolderData } from "../hooks/useHolderData";

export default function ChatPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { walletData } = useWalletData();
  const { holderData } = useHolderData();

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
          userWalletData={walletData}
          userHolderData={holderData}
          isFullscreenMode={true}
        />
      </div>
    </div>
  );
}
