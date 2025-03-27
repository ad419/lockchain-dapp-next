"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers"; // Import ethers.js
import ethImg from "../images/eth.png";
import tokenImg from "../images/logo.png";
import routerABI from "../json/router.json";
import swapABI from "../json/swap.json";
import tokenABI from "../json/token.json";
import {
  formatPrice,
  getContract,
  getWeb3Contract,
} from "../hooks/contractHelper";
import { contract, DEFAULT_CHAIN, SUPPORTED_CHAIN } from "../hooks/constant";
import { useAccount, useNetwork } from "wagmi";
import Connect from "./Connect";
import { useEthersSigner } from "../hooks/useEthersProvider";
import { getWeb3 } from "../hooks/connectors";
import { toast } from "react-toastify";
import { zeroAddress } from "viem";
import ReferralShare from "./ReferralShare";
import { useSwapStats } from "../hooks/useAccount";
import LoadingModal from "./LoadingModal";
import { useSearchParams } from "next/navigation"; // Add this import
import Image from "next/image";

// Create a client component for the swap interface
function SwapInterface({ searchParams }) {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const [fromCurrency, setFromCurrency] = useState("ETH");
  const [toCurrency, setToCurrency] = useState("LOCKCHAIN");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const routerContract = getWeb3Contract(
    routerABI,
    contract[DEFAULT_CHAIN].ROUTER_ADDRESS
  );
  const signer = useEthersSigner();
  const [refAddress, setRefAddress] = useState("");
  const [updater, setUpdater] = useState(1);
  const accStats = useSwapStats(updater);
  const [loading, setLoading] = useState(false);

  const fromdollarValue =
    fromCurrency === "ETH"
      ? (fromAmount * accStats.eth_price).toFixed(2)
      : (fromAmount * accStats.token_price).toFixed(2);

  const todollarValue =
    toCurrency === "ETH"
      ? (toAmount * accStats.eth_price).toFixed(2)
      : (toAmount * accStats.token_price).toFixed(2);
  //eth balance - accStats.eth_balance
  //token balance - accStats.token_balance
  //eth price - accStats.eth_price
  //token token_price - accStats.token_price

  useEffect(() => {
    let refAddr = "";
    const queryChainId = searchParams.get("ref");
    if (queryChainId !== "") {
      refAddr = queryChainId;
    }
    setRefAddress(refAddr);
  }, [searchParams]);

  useEffect(() => {
    // fetchExchangeRate();
  }, []);

  const handleFromAmountChange = async (amount) => {
    setFromAmount(amount);

    if (!isNaN(amount) && amount > 0) {
      try {
        // Convert entered amount to the correct decimals (e.g., 18 decimals for ETH)
        const amountIn = ethers.utils.parseUnits(amount, 18);

        const path = [
          fromCurrency === "ETH"
            ? contract[DEFAULT_CHAIN].WETH
            : contract[DEFAULT_CHAIN].TOKEN_ADDRESS,
          toCurrency === "ETH"
            ? contract[DEFAULT_CHAIN].WETH
            : contract[DEFAULT_CHAIN].TOKEN_ADDRESS,
        ];

        // Fetch output amount from the router
        const amounts = await routerContract.methods
          .getAmountsOut(amountIn, path)
          .call();
        const outputAmount = ethers.utils.formatUnits(amounts[1], 18); // Convert back to human-readable format

        // Set calculated values in the state
        setToAmount(outputAmount); // Update the "To" amount
      } catch (error) {
        console.error("Error fetching output amount:", error);
        setToAmount("");
      }
    } else {
      setToAmount(""); // Clear output if input is invalid
    }
  };

  const toggleCurrency = () => {
    const newFromCurrency = toCurrency;
    const newToCurrency = fromCurrency;
    setFromCurrency(newFromCurrency);
    setToCurrency(newToCurrency);

    // Recalculate the exchange rate for the new pair
    // fetchExchangeRate(newFromCurrency, newToCurrency);

    // Swap the values in the input fields
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleSubmit = async () => {
    if (address) {
      if (chain && chain.id && SUPPORTED_CHAIN.includes(chain.id)) {
        try {
          setLoading(true);

          let swapContract = getContract(
            swapABI,
            contract[chain.id].SWAP_ADDRESS,
            signer
          );
          let tx;
          let referral = refAddress ? refAddress : zeroAddress;
          if (fromCurrency === "ETH") {
            console.log(fromAmount);
            tx = await swapContract.createBuy(referral, {
              from: address,
              value: ethers.utils.parseEther(fromAmount.toString()),
            });
          } else {
            tx = await swapContract.createSell(
              ethers.utils.parseEther(fromAmount.toString()),
              { from: address }
            );
          }

          toast.loading("Waiting for confirmation...");
          var interval = setInterval(async function () {
            let web3 = getWeb3();
            var response = await web3.eth.getTransactionReceipt(tx.hash);
            if (response != null) {
              clearInterval(interval);
              if (response.status === true) {
                toast.dismiss();
                toast.success("Your last transaction is success!!");
                setLoading(false);
                window.location.reload();
              } else if (response.status === false) {
                toast.error("error ! Your last transaction is failed.");
                setLoading(false);
                window.location.reload();
              } else {
                toast.error("error ! something went wrong.");
                setLoading(false);
                window.location.reload();
              }
            }
          }, 5000);
        } catch (err) {
          toast.error(err.reason ? err.reason : err.message);
          setLoading(false);
        }
      } else {
        toast.error("Please select Base Mainnet !");
        setLoading(false);
      }
    } else {
      toast.error("Please Connect Wallet!");
      setLoading(false);
    }
  };
  const handleApprove = async () => {
    if (address) {
      if (chain && chain.id && SUPPORTED_CHAIN.includes(chain.id)) {
        try {
          setLoading(true);
          let tokenContract = getContract(
            tokenABI,
            contract[chain.id].TOKEN_ADDRESS,
            signer
          );
          let amount = ethers.utils.parseEther("10000000000000000000");
          let tx = await tokenContract.approve(
            contract[chain.id].SWAP_ADDRESS,
            amount,
            { from: address }
          );

          toast.loading("Waiting for confirmation...");
          var interval = setInterval(async function () {
            let web3 = getWeb3();
            var response = await web3.eth.getTransactionReceipt(tx.hash);
            if (response != null) {
              clearInterval(interval);
              if (response.status === true) {
                toast.dismiss();
                toast.success("Your last transaction is success!!");
                setLoading(false);
                setUpdater(Math.random());
              } else if (response.status === false) {
                toast.error("error ! Your last transaction is failed.");
                setLoading(false);
              } else {
                toast.error("error ! something went wrong.");
                setLoading(false);
              }
            }
          }, 5000);
        } catch (err) {
          toast.error(err.reason ? err.reason : err.message);
          setLoading(false);
        }
      } else {
        toast.error("Please select Base Mainnet !");
        setLoading(false);
      }
    } else {
      toast.error("Please Connect Wallet!");
      setLoading(false);
    }
  };

  const handleMaxButton = () => {
    if (fromCurrency === "ETH") {
      handleFromAmountChange(accStats.eth_balance); // Set ETH balance
    } else {
      handleFromAmountChange(accStats.token_balance); // Set Token balance
    }
  };

  return (
    <div
      className="default-height bg-primary-gradient"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(at 53% 34%, rgba(19, 83, 255, 0.1) -84%, rgba(20, 20, 20, 0.6) 63%)",
      }}
    >
      <div className="jumps-prevent" style={{ paddingTop: "104px" }}></div>
      <div
        className="main-content side-content pt-0"
        style={{ minHeight: "calc(100vh - 64px)" }}
      >
        <div className="main-container container-fluid">
          <div className="inner-body">
            <div className="page-header">
              <div>
                <h2
                  style={{
                    color: "white",
                    marginTop: "-60px",
                  }}
                  className="main-content-title tx-24 mg-b-5"
                >
                  Welcome To Account
                </h2>
              </div>
            </div>
            <div className="row justify-content-center">
              <div className="col-md-8 col-lg-6">
                {/* From Card */}
                <div
                  style={{
                    backgroundColor: "transparent",
                  }}
                  className="card mb-3 shadow-sm"
                >
                  <div className="card-body swap-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div
                          style={{
                            color: "white !important",
                          }}
                        >
                          From
                        </div>
                        <input
                          style={{
                            color: "white",
                          }}
                          inputMode="decimal"
                          className="form-control p-0 w-100 bg-transparent text-start fs-4 placeholder-opacity-50 border-0"
                          placeholder="0.0"
                          autoComplete="off"
                          type="text"
                          value={fromAmount}
                          onChange={(e) =>
                            handleFromAmountChange(e.target.value)
                          }
                        />
                        <div
                          style={{
                            color: "white",
                          }}
                        >
                          ${fromdollarValue}
                        </div>
                      </div>
                      <div className="text-end text-center">
                        <div className="gap-2">
                          <Image
                            src={fromCurrency === "ETH" ? ethImg : tokenImg}
                            alt={fromCurrency}
                            width="24"
                            className="mx-2"
                          />
                          <span
                            style={{
                              color: "white",
                            }}
                            className="fw-bold"
                          >
                            {fromCurrency}
                          </span>
                          <div className="text-muted mt-2">
                            Balance:{" "}
                            {address
                              ? fromCurrency === "ETH"
                                ? formatPrice(accStats.eth_balance, 18)
                                : formatPrice(accStats.token_balance, 18)
                              : 0}
                            <span
                              onClick={() => handleMaxButton()}
                              className="badge bg-primary mx-2"
                              style={{ cursor: "pointer" }}
                            >
                              Max
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center my-3">
                  <div className="swap-icon d-inline-block">
                    <div
                      onClick={toggleCurrency}
                      className="css-175oi2r"
                      style={{
                        display: "flex",
                        flexBasis: "auto",
                        boxSizing: "border-box",
                        position: "relative",
                        minHeight: "0px",
                        minWidth: "0px",
                        flexShrink: "0",
                        flexDirection: "column",
                        cursor: "pointer",
                        alignItems: "center",
                        alignSelf: "center",
                        backgroundColor: "#131814",
                        borderColor: "#142a63",
                        borderRadius: "16px",
                        borderWidth: "4px",
                        justifyContent: "center",
                        padding: "8px",
                        borderStyle: "solid",
                        transform: "scale(1)",
                        opacity: "1",
                      }}
                    >
                      <div
                        style={{
                          color: "white",
                        }}
                        className="_display-flex _alignItems-center _flexBasis-auto _boxSizing-border-box _position-relative _minHeight-0px _minWidth-0px _flexShrink-0 _flexDirection-column _justifyContent-center _pt-t-space-spa94665587 _pr-t-space-spa94665587 _pb-t-space-spa94665587 _pl-t-space-spa94665587"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="24"
                          height="24"
                          stroke="currentColor"
                          stroke-width="2"
                          fill="none"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          class="css-i6dzq1"
                        >
                          <polyline points="17 1 21 5 17 9"></polyline>
                          <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                          <polyline points="7 23 3 19 7 15"></polyline>
                          <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* To Card */}
                <div
                  style={{
                    backgroundColor: "transparent",
                  }}
                  className="card mb-4 shadow-sm"
                >
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div
                          style={{
                            color: "white",
                          }}
                          className=""
                        >
                          To
                        </div>
                        <input
                          inputMode="decimal"
                          className="form-control p-0 w-100 bg-transparent text-start fs-4 text-white placeholder-opacity-50 border-0"
                          placeholder="0.0"
                          autoComplete="off"
                          type="text"
                          value={toAmount}
                          readOnly
                        />
                        <div
                          style={{
                            color: "white",
                          }}
                          className=""
                        >
                          ${todollarValue}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="gap-2">
                          <Image
                            src={toCurrency === "ETH" ? ethImg : tokenImg}
                            alt={toCurrency}
                            width="24"
                            className="mx-2"
                          />
                          <span style={{ color: "white" }} className="fw-bold">
                            {toCurrency}
                          </span>
                          <div className="text-muted mt-2">
                            Balance:{" "}
                            {address
                              ? toCurrency === "ETH"
                                ? formatPrice(accStats.eth_balance)
                                : formatPrice(accStats.token_balance)
                              : 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* <div className="d-flex justify-content-around mb-3">
                                        <span>1 {fromCurrency} = {exchangeRate} {toCurrency}</span>
                                    </div> */}
                {address ? (
                  fromCurrency === "LOCKCHAIN" &&
                  parseFloat(accStats.allowence) < parseFloat(fromAmount) ? (
                    <button
                      onClick={() => handleApprove()}
                      disabled={loading}
                      type="button"
                      className="btn btn-primary btn-connect btn-icon-text w-100 radius"
                    >
                      {loading ? "Loading..." : "Approve"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubmit()}
                      disabled={loading}
                      type="button"
                      className="btn btn-primary btn-connect btn-icon-text w-100 radius"
                    >
                      {loading ? "Loading..." : "Swap Now"}
                    </button>
                  )
                ) : (
                  <Connect className=" w-100 radius" />
                )}
              </div>
            </div>
            <ReferralShare />
            <LoadingModal
              show={loading}
              message="Please wait while we process your request..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SwapFrame() {
  const searchParams = useSearchParams();

  return <SwapInterface searchParams={searchParams} />;
}
