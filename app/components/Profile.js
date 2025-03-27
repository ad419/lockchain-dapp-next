"use client";

import React, { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { useAccountStats } from "../hooks/useAccount";
import { formatPrice } from "../hooks/contractHelper";
import { contract, SUPPORTED_CHAIN } from "../hooks/constant";
import vestAbi from "../json/vest.json";
import { getWeb3 } from "../hooks/connectors";
import { getContract } from "../hooks/contractHelper";
import { Context } from "../context/context";
import { useAccount, useNetwork } from "wagmi";
import { useEthersSigner } from "../hooks/useEthersProvider";
import styles from "../styles/profile.module.css";

export default function Profile() {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const [updater, setUpdater] = useState(1);
  const accStats = useAccountStats(updater);
  const signer = useEthersSigner();

  const handleClaimReward = async () => {
    if (address) {
      if (chain && chain.id && SUPPORTED_CHAIN.includes(chain.id)) {
        try {
          let dividendContract = getContract(
            vestAbi,
            contract[chain.id].VESTING_ADDRESS,
            signer
          );

          let tx = await dividendContract.claim({ from: address });
          toast.loading("Waiting for confirmation...");
          var interval = setInterval(async function () {
            let web3 = getWeb3();
            var response = await web3.eth.getTransactionReceipt(tx.hash);
            if (response != null) {
              clearInterval(interval);
              if (response.status === true) {
                toast.dismiss();
                toast.success("Your last transaction is success!!");
                setUpdater(Math.random());
              } else if (response.status === false) {
                toast.error("error ! Your last transaction is failed.");
              } else {
                toast.error("error ! something went wrong.");
              }
            }
          }, 5000);
        } catch (err) {
          toast.error(err.reason);
        }
      } else {
        toast.error("Please select Base Mainnet !");
      }
    } else {
      toast.error("Please Connect Wallet!");
    }
  };

  useEffect(() => {
    setTimeout(() => {}, 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const override = {
    display: "block",
    position: "absolute",
    top: "60%",
    left: "50%",
  };

  return (
    <div className={styles.mainContent}>
      <div className={styles.defaultHeight}>
        <div className="jumps-prevent" style={{ marginTop: "60px" }}></div>
        <div className="main-content side-content pt-0">
          <div className="main-container container-fluid">
            <div className="inner-body">
              <div className="page-header">
                <div>
                  <h2
                    style={{
                      color: "white",
                    }}
                    className="main-content-title tx-24 mg-b-5"
                  >
                    Welcome To Account
                  </h2>
                </div>
              </div>
              <div className="row row-sm">
                <div className="col-sm-12 col-lg-12 col-xl-12">
                  <div className="row row-sm">
                    <div className="col-sm-12 col-md-6 col-lg-6 col-xl-6">
                      <div
                        className={`card custom-card ${styles.cardGradient}`}
                      >
                        <div className="card-body">
                          <div className="card-item">
                            <div className="card-item-icon card-icon">
                              <svg
                                className="text-primary"
                                xmlns="http://www.w3.org/2000/svg"
                                enableBackground="new 0 0 24 24"
                                height="24"
                                viewBox="0 0 24 24"
                                width="24"
                              >
                                <g>
                                  <rect
                                    height="14"
                                    opacity=".3"
                                    width="14"
                                    x="5"
                                    y="5"
                                  ></rect>
                                  <g>
                                    <rect
                                      fill="none"
                                      height="24"
                                      width="24"
                                    ></rect>
                                    <g>
                                      <path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M19,19H5V5h14V19z"></path>
                                      <rect
                                        height="5"
                                        width="2"
                                        x="7"
                                        y="12"
                                      ></rect>
                                      <rect
                                        height="10"
                                        width="2"
                                        x="15"
                                        y="7"
                                      ></rect>
                                      <rect
                                        height="3"
                                        width="2"
                                        x="11"
                                        y="14"
                                      ></rect>
                                      <rect
                                        height="2"
                                        width="2"
                                        x="11"
                                        y="10"
                                      ></rect>
                                    </g>
                                  </g>
                                </g>
                              </svg>
                            </div>
                            <div className="card-item-title mb-2">
                              <label className="main-content-label tx-13 font-weight-bold mb-1 text-white">
                                Your Balance
                              </label>
                            </div>
                            <div className="card-item-body">
                              <div className="card-item-stat">
                                <h5
                                  style={{
                                    color: "white",
                                  }}
                                  className="font-weight-bold"
                                >
                                  {accStats.token_balance
                                    ? formatPrice(accStats.token_balance, 5)
                                    : 0}{" "}
                                  LockChain
                                </h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-sm-12 col-md-6 col-lg-6 col-xl-6">
                      <div
                        className={`card custom-card ${styles.cardGradient}`}
                      >
                        <div className="card-body">
                          <div className="card-item">
                            <div className="card-item-icon card-icon">
                              <svg
                                className="text-primary"
                                xmlns="http://www.w3.org/2000/svg"
                                enableBackground="new 0 0 24 24"
                                height="24"
                                viewBox="0 0 24 24"
                                width="24"
                              >
                                <g>
                                  <rect
                                    height="14"
                                    opacity=".3"
                                    width="14"
                                    x="5"
                                    y="5"
                                  ></rect>
                                  <g>
                                    <rect
                                      fill="none"
                                      height="24"
                                      width="24"
                                    ></rect>
                                    <g>
                                      <path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M19,19H5V5h14V19z"></path>
                                      <rect
                                        height="5"
                                        width="2"
                                        x="7"
                                        y="12"
                                      ></rect>
                                      <rect
                                        height="10"
                                        width="2"
                                        x="15"
                                        y="7"
                                      ></rect>
                                      <rect
                                        height="3"
                                        width="2"
                                        x="11"
                                        y="14"
                                      ></rect>
                                      <rect
                                        height="2"
                                        width="2"
                                        x="11"
                                        y="10"
                                      ></rect>
                                    </g>
                                  </g>
                                </g>
                              </svg>
                            </div>
                            <div className="card-item-title mb-2">
                              <label className="main-content-label tx-13 font-weight-bold mb-1 text-white">
                                Holding Worth
                              </label>
                            </div>
                            <div className="card-item-body">
                              <div className="card-item-stat">
                                <h5
                                  style={{
                                    color: "white",
                                  }}
                                  className="font-weight-bold"
                                >
                                  $
                                  {accStats.holdingWorth
                                    ? formatPrice(accStats.holdingWorth)
                                    : 0}{" "}
                                  USD
                                </h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-sm-12 col-md-6 col-lg-6 col-xl-6">
                      <div
                        className={`card custom-card ${styles.cardGradient}`}
                      >
                        <div className="card-body">
                          <div className="card-item">
                            <div className="card-item-icon card-icon">
                              <svg
                                className="text-primary"
                                xmlns="http://www.w3.org/2000/svg"
                                enableBackground="new 0 0 24 24"
                                height="24"
                                viewBox="0 0 24 24"
                                width="24"
                              >
                                <g>
                                  <rect
                                    height="14"
                                    opacity=".3"
                                    width="14"
                                    x="5"
                                    y="5"
                                  ></rect>
                                  <g>
                                    <rect
                                      fill="none"
                                      height="24"
                                      width="24"
                                    ></rect>
                                    <g>
                                      <path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M19,19H5V5h14V19z"></path>
                                      <rect
                                        height="5"
                                        width="2"
                                        x="7"
                                        y="12"
                                      ></rect>
                                      <rect
                                        height="10"
                                        width="2"
                                        x="15"
                                        y="7"
                                      ></rect>
                                      <rect
                                        height="3"
                                        width="2"
                                        x="11"
                                        y="14"
                                      ></rect>
                                      <rect
                                        height="2"
                                        width="2"
                                        x="11"
                                        y="10"
                                      ></rect>
                                    </g>
                                  </g>
                                </g>
                              </svg>
                            </div>
                            <div className="card-item-title mb-2">
                              <label className="main-content-label tx-13 font-weight-bold mb-1 text-white">
                                Total Vested
                              </label>
                            </div>
                            <div className="card-item-body">
                              <div className="card-item-stat">
                                <h5
                                  style={{
                                    color: "white",
                                  }}
                                  className="font-weight-bold"
                                >
                                  {accStats.totalVested
                                    ? formatPrice(accStats.totalVested)
                                    : 0}{" "}
                                  LockChain
                                </h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-sm-12 col-md-6 col-lg-6 col-xl-6">
                      <div
                        className={`card custom-card ${styles.cardGradient}`}
                      >
                        <div className="card-body">
                          <div className="card-item">
                            <div className="card-item-icon card-icon">
                              <svg
                                className="text-primary"
                                xmlns="http://www.w3.org/2000/svg"
                                enableBackground="new 0 0 24 24"
                                height="24"
                                viewBox="0 0 24 24"
                                width="24"
                              >
                                <g>
                                  <rect
                                    height="14"
                                    opacity=".3"
                                    width="14"
                                    x="5"
                                    y="5"
                                  ></rect>
                                  <g>
                                    <rect
                                      fill="none"
                                      height="24"
                                      width="24"
                                    ></rect>
                                    <g>
                                      <path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M19,19H5V5h14V19z"></path>
                                      <rect
                                        height="5"
                                        width="2"
                                        x="7"
                                        y="12"
                                      ></rect>
                                      <rect
                                        height="10"
                                        width="2"
                                        x="15"
                                        y="7"
                                      ></rect>
                                      <rect
                                        height="3"
                                        width="2"
                                        x="11"
                                        y="14"
                                      ></rect>
                                      <rect
                                        height="2"
                                        width="2"
                                        x="11"
                                        y="10"
                                      ></rect>
                                    </g>
                                  </g>
                                </g>
                              </svg>
                            </div>
                            <div className="card-item-title mb-2">
                              <label className="main-content-label tx-13 font-weight-bold mb-1 text-white">
                                Total Claimed
                              </label>
                            </div>
                            <div className="card-item-body">
                              <div className="card-item-stat">
                                <h5
                                  style={{
                                    color: "white",
                                  }}
                                  className="font-weight-bold"
                                >
                                  {accStats.totalClaimed
                                    ? formatPrice(accStats.totalClaimed)
                                    : 0}{" "}
                                  LockChain
                                </h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-sm-12 col-md-6 col-lg-6 col-xl-6">
                      <div
                        className={`card custom-card ${styles.cardGradient}`}
                      >
                        <div className="card-body">
                          <div className="card-item">
                            <div className="card-item-icon">
                              <button
                                onClick={() => handleClaimReward()}
                                className="btn btn-primary text-white btn-rounded"
                                type="button"
                              >
                                Claim
                              </button>
                            </div>
                            <div className="card-item-title mb-2">
                              <label className="main-content-label tx-13 font-weight-bold mb-1 text-white">
                                Total Claimable
                              </label>
                            </div>
                            <div className="card-item-body">
                              <div className="card-item-stat">
                                <h5
                                  style={{
                                    color: "white",
                                  }}
                                  className="font-weight-bold"
                                >
                                  {accStats.totalclaimable
                                    ? formatPrice(accStats.totalclaimable)
                                    : 0}{" "}
                                  LockChain
                                </h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-sm-12 col-md-6 col-lg-6 col-xl-6">
                      <div
                        className={`card custom-card ${styles.cardGradient}`}
                      >
                        <div className="card-body">
                          <div className="card-item">
                            <div className="card-item-icon card-icon">
                              <svg
                                className="text-primary"
                                xmlns="http://www.w3.org/2000/svg"
                                enableBackground="new 0 0 24 24"
                                height="24"
                                viewBox="0 0 24 24"
                                width="24"
                              >
                                <g>
                                  <rect
                                    height="14"
                                    opacity=".3"
                                    width="14"
                                    x="5"
                                    y="5"
                                  ></rect>
                                  <g>
                                    <rect
                                      fill="none"
                                      height="24"
                                      width="24"
                                    ></rect>
                                    <g>
                                      <path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M19,19H5V5h14V19z"></path>
                                      <rect
                                        height="5"
                                        width="2"
                                        x="7"
                                        y="12"
                                      ></rect>
                                      <rect
                                        height="10"
                                        width="2"
                                        x="15"
                                        y="7"
                                      ></rect>
                                      <rect
                                        height="3"
                                        width="2"
                                        x="11"
                                        y="14"
                                      ></rect>
                                      <rect
                                        height="2"
                                        width="2"
                                        x="11"
                                        y="10"
                                      ></rect>
                                    </g>
                                  </g>
                                </g>
                              </svg>
                            </div>
                            <div className="card-item-title mb-2">
                              <label className="main-content-label tx-13 font-weight-bold mb-1 text-white">
                                Total Claimable Worth
                              </label>
                            </div>
                            <div className="card-item-body">
                              <div className="card-item-stat">
                                <h5
                                  style={{
                                    color: "white",
                                  }}
                                  className="font-weight-bold"
                                >
                                  $
                                  {accStats.totalclaimableWorth
                                    ? formatPrice(accStats.totalclaimableWorth)
                                    : 0}
                                </h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-sm-12 col-md-6 col-lg-6 col-xl-6">
                      <div
                        className={`card custom-card ${styles.cardGradient}`}
                      >
                        <div className="card-body">
                          <div className="card-item">
                            <div className="card-item-icon card-icon">
                              <svg
                                className="text-primary"
                                xmlns="http://www.w3.org/2000/svg"
                                enableBackground="new 0 0 24 24"
                                height="24"
                                viewBox="0 0 24 24"
                                width="24"
                              >
                                <g>
                                  <rect
                                    height="14"
                                    opacity=".3"
                                    width="14"
                                    x="5"
                                    y="5"
                                  ></rect>
                                  <g>
                                    <rect
                                      fill="none"
                                      height="24"
                                      width="24"
                                    ></rect>
                                    <g>
                                      <path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M19,19H5V5h14V19z"></path>
                                      <rect
                                        height="5"
                                        width="2"
                                        x="7"
                                        y="12"
                                      ></rect>
                                      <rect
                                        height="10"
                                        width="2"
                                        x="15"
                                        y="7"
                                      ></rect>
                                      <rect
                                        height="3"
                                        width="2"
                                        x="11"
                                        y="14"
                                      ></rect>
                                      <rect
                                        height="2"
                                        width="2"
                                        x="11"
                                        y="10"
                                      ></rect>
                                    </g>
                                  </g>
                                </g>
                              </svg>
                            </div>
                            <div className="card-item-title mb-2">
                              <label className="main-content-label tx-13 font-weight-bold mb-1 text-white">
                                Total Referral Reward
                              </label>
                            </div>
                            <div className="card-item-body">
                              <div className="card-item-stat">
                                <h5
                                  style={{
                                    color: "white",
                                  }}
                                  className="font-weight-bold"
                                >
                                  {accStats.referralearn
                                    ? formatPrice(accStats.referralearn)
                                    : 0}{" "}
                                  LockChain
                                </h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-sm-12 col-md-6 col-lg-6 col-xl-6">
                      <div
                        className={`card custom-card ${styles.cardGradient}`}
                      >
                        <div className="card-body">
                          <div className="card-item">
                            <div className="card-item-icon card-icon">
                              <svg
                                className="text-primary"
                                xmlns="http://www.w3.org/2000/svg"
                                enableBackground="new 0 0 24 24"
                                height="24"
                                viewBox="0 0 24 24"
                                width="24"
                              >
                                <g>
                                  <rect
                                    height="14"
                                    opacity=".3"
                                    width="14"
                                    x="5"
                                    y="5"
                                  ></rect>
                                  <g>
                                    <rect
                                      fill="none"
                                      height="24"
                                      width="24"
                                    ></rect>
                                    <g>
                                      <path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M19,19H5V5h14V19z"></path>
                                      <rect
                                        height="5"
                                        width="2"
                                        x="7"
                                        y="12"
                                      ></rect>
                                      <rect
                                        height="10"
                                        width="2"
                                        x="15"
                                        y="7"
                                      ></rect>
                                      <rect
                                        height="3"
                                        width="2"
                                        x="11"
                                        y="14"
                                      ></rect>
                                      <rect
                                        height="2"
                                        width="2"
                                        x="11"
                                        y="10"
                                      ></rect>
                                    </g>
                                  </g>
                                </g>
                              </svg>
                            </div>
                            <div className="card-item-title mb-2">
                              <label className="main-content-label tx-13 font-weight-bold mb-1 text-white">
                                Total Referral Worth
                              </label>
                            </div>
                            <div className="card-item-body">
                              <div className="card-item-stat">
                                <h5
                                  style={{
                                    color: "white",
                                  }}
                                  className="font-weight-bold"
                                >
                                  $
                                  {accStats.referralearnWorth
                                    ? formatPrice(accStats.referralearnWorth)
                                    : 0}
                                </h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
