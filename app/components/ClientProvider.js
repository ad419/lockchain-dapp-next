"use client";

import { WagmiConfig } from "wagmi";
import { Web3Modal } from "@web3modal/react";
import { ethereumClient, wagmiConfig } from "../hooks/wagmi";
import { PROJECT_ID } from "../hooks/constant";
import { ContextProvider } from "../context/context";
import { useEffect, useState } from "react";

export default function ClientProvider({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <WagmiConfig config={wagmiConfig}>
        <ContextProvider>{children}</ContextProvider>
      </WagmiConfig>
      <Web3Modal
        projectId={PROJECT_ID}
        ethereumClient={ethereumClient}
        themeVariables={{
          "--w3m-accent-color": "#1353FF",
          "--w3m-background-color": "#1353FF",
        }}
      />
    </>
  );
}
