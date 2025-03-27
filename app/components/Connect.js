import React from "react";
import { useAccount } from "wagmi";
import { useWeb3Modal, Web3Button } from "@web3modal/react";

export const Connect = function ({ className }) {
  const { address, isConnected } = useAccount();
  const { open } = useWeb3Modal();

  return (
    <React.Fragment>
      <>
        {address && isConnected ? (
          <Web3Button />
        ) : (
          <button
            style={{
              color: "white",
            }}
            type="button"
            className={`btn btn-primary btn-connect btn-icon-text ${className}`}
            onClick={() => open()}
          >
            Connect Wallet
          </button>
        )}
      </>
    </React.Fragment>
  );
};

export default Connect;
