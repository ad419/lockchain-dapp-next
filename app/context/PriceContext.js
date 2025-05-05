import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const PriceContext = createContext();

export function PriceProvider({ children }) {
  const [prices, setPrices] = useState({
    ethereum: 3450, // Default price
    lastUpdated: 0,
  });

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Only fetch every minute
        if (Date.now() - prices.lastUpdated < 60000) return;

        // Try multiple API endpoints that are CORS-friendly
        // Option 1: CryptoCompare (very reliable, has CORS enabled)
        try {
          const response = await axios.get(
            "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD"
          );

          if (response.data && response.data.USD) {
            setPrices({
              ethereum: response.data.USD,
              lastUpdated: Date.now(),
            });
            return; // Exit if successful
          }
        } catch (err) {
          console.log("CryptoCompare API failed, trying next option...");
        }

        // Option 2: Binance API (also CORS-friendly)
        try {
          const response = await axios.get(
            "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT"
          );

          if (response.data && response.data.price) {
            setPrices({
              ethereum: parseFloat(response.data.price),
              lastUpdated: Date.now(),
            });
            return; // Exit if successful
          }
        } catch (err) {
          console.log("Binance API failed, trying next option...");
        }

        // Option 3: Alternative proxy that's more reliable than allorigins
        try {
          const response = await axios.get(
            `https://corsproxy.io/?${encodeURIComponent(
              "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
            )}`
          );

          if (
            response.data &&
            response.data.ethereum &&
            response.data.ethereum.usd
          ) {
            setPrices({
              ethereum: response.data.ethereum.usd,
              lastUpdated: Date.now(),
            });
            return; // Exit if successful
          }
        } catch (err) {
          console.log("corsproxy.io failed, keeping default value");
        }
      } catch (error) {
        console.error("All price API attempts failed:", error);
        // Keep existing price data if there's an error
      }
    };

    fetchPrices();

    // Set up interval for periodic updates
    const interval = setInterval(fetchPrices, 60000); // Once per minute

    return () => clearInterval(interval);
  }, [prices.lastUpdated]);

  return (
    <PriceContext.Provider value={prices}>{children}</PriceContext.Provider>
  );
}

export const usePrices = () => useContext(PriceContext);
