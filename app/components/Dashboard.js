"use client";

import axios from "axios";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useNetwork } from "wagmi";
import { Context } from "../context/context";
import { BUY_TAX, DEX_CHART_FRAME, SELL_TAX } from "../hooks/constant";
import { formatPrice } from "../hooks/contractHelper";
import { useTokenInfoStats } from "../hooks/useTokenInfo";
import work1Img from "../images/work.png";
import dynamic from "next/dynamic";
import LoadingSpinner from "./LoadingSpinner";
import SpeedometerComponent from "./SpeedometerComponent";
import Image from "next/image";
import styles from "../styles/dashboard.module.css";

const ReactSpeedometer = dynamic(() => import("./SpeedometerComponent"), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});

/* global ApexCharts,Swiper */

export default function Dashboard() {
  const { chain } = useNetwork();
  const [updater] = useState(1);
  const tokenStats = useTokenInfoStats(updater);
  const [daysLaunch, setDaysLaunch] = useState(0);
  const count = useRef(0);
  const fearc = useRef(0);
  const [fear, setFear] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    async function fetch() {
      const response = await axios.get(
        "https://api.coin-stats.com/v2/fear-greed"
      );
      if (response && response.data && response.data.now) {
        setFear(parseInt(response.data.now.value) * 10);
      }
    }

    if (fearc.current === 0) {
      fearc.current = 1;
      fetch();
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  let buytax = () => {
    try {
      if (typeof window === "undefined") return;

      const element = document.querySelector("#buytax");
      if (!element) return; // Check if element exists

      // Clear any existing chart
      element.innerHTML = "";

      var options = {
        series: [BUY_TAX],
        chart: {
          width: 180,
          height: 180,
          type: "radialBar",
        },
        colors: ["#1EBA62"],
        plotOptions: {
          radialBar: {
            startAngle: -180,
            endAngle: 120,
            hollow: {
              size: "60%",
              background: "rgba(1, 163, 255, 0.8)",
              margin: 15,
            },
            dataLabels: {
              show: true,
              name: {
                offsetY: 20,
                show: true,
                color: "#888",
                fontSize: "12px",
              },
              value: {
                formatter: function (val) {
                  return val + "%";
                },
                offsetY: -10,
                color: "#1EBA62",
                fontWeight: 700,
                fontSize: "18px",
                show: true,
              },
            },
            track: {
              background: "#737b8b",
            },
          },
        },
        stroke: {
          lineCap: "round",
        },
        labels: [""],
        responsive: [
          {
            breakpoint: 575,
            options: {
              chart: {
                height: 200,
              },
            },
          },
        ],
      };

      const chart = new ApexCharts(element, options);
      chart.render();
    } catch (err) {
      console.log("Buy tax chart error:", err.message);
    }
  };

  let selltax = () => {
    try {
      if (typeof window === "undefined") return;

      const element = document.querySelector("#selltax");
      if (!element) return; // Check if element exists

      // Clear any existing chart
      element.innerHTML = "";

      var options = {
        series: [SELL_TAX],
        chart: {
          width: 180,
          height: 180,
          type: "radialBar",
        },
        colors: ["#dc3545"],
        plotOptions: {
          radialBar: {
            startAngle: -180,
            endAngle: 120,
            hollow: {
              size: "60%",
              background: "rgba(255, 99, 71, 0.8)",
              margin: 15,
            },
            dataLabels: {
              show: true,
              name: {
                offsetY: 20,
                show: true,
                color: "#888",
                fontSize: "12px",
              },
              value: {
                formatter: function (val) {
                  return val + "%";
                },
                offsetY: -10,
                color: "#dc3545",
                fontWeight: 700,
                fontSize: "18px",
                show: true,
              },
            },
            track: {
              background: "#737b8b",
            },
          },
        },
        stroke: {
          lineCap: "round",
        },
        labels: [""],
        responsive: [
          {
            breakpoint: 575,
            options: {
              chart: {
                height: 200,
              },
            },
          },
        ],
      };

      const chart = new ApexCharts(element, options);
      chart.render();
    } catch (err) {
      console.log("Sell tax chart error:", err.message);
    }
  };

  useEffect(() => {
    // Set days to 0 since token hasn't launched yet
    setDaysLaunch(0);
    if (count.current === 0) {
      count.current = 1;
      buytax();
      selltax();
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const timer = setTimeout(() => {
      buytax();
      selltax();
    }, 100); // Small delay to ensure DOM elements are ready

    return () => clearTimeout(timer);
  }, [isClient]); // Depend on isClient instead of using count ref

  return (
    <React.Fragment>
      {/* Remove this div or reduce padding */}
      <div className={`main ${styles.mainContent}`}>
        <div
          className={`jumps-prevent`}
          style={{
            marginTop: "60px",
          }} // fix the gap on mobile
        ></div>{" "}
        {/* Reduced from 63.998px */}
        <div
          className="main-content side-content default-height pt-0"
          style={{
            minHeight: "calc(100vh - 60px)", // Adjust based on your header height
          }}
        >
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
                    Welcome To Dashboard
                  </h2>
                </div>
              </div>
              <div className="row row-sm">
                <div className="col-sm-12 col-lg-12 col-xl-8">
                  <div className="row row-sm">
                    <div className="col-sm-12 col-md-6 col-lg-6 col-xl-6">
                      <div className="card custom-card bg-gradient-to-r">
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
                                Circulating Supply
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
                                  {tokenStats.totalSuppl
                                    ? formatPrice(tokenStats.totalSuppl)
                                    : 0}
                                </h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-sm-12 col-md-6 col-lg-6 col-xl-6">
                      <div className="card custom-card bg-gradient-to-r">
                        <div className="card-body">
                          <div className="card-item">
                            <div className="card-item-icon card-icon">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                height="24"
                                viewBox="0 0 24 24"
                                width="24"
                              >
                                <path d="M0 0h24v24H0V0z" fill="none"></path>
                                <path
                                  d="M12 4c-4.41 0-8 3.59-8 8 0 1.82.62 3.49 1.64 4.83 1.43-1.74 4.9-2.33 6.36-2.33s4.93.59 6.36 2.33C19.38 15.49 20 13.82 20 12c0-4.41-3.59-8-8-8zm0 9c-1.94 0-3.5-1.56-3.5-3.5S10.06 6 12 6s3.5 1.56 3.5 3.5S13.94 13 12 13z"
                                  opacity=".3"
                                ></path>
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7.07 18.28c.43-.9 3.05-1.78 4.93-1.78s4.51.88 4.93 1.78C15.57 19.36 13.86 20 12 20s-3.57-.64-4.93-1.72zm11.29-1.45c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33C4.62 15.49 4 13.82 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83zM12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6zm0 5c-.83 0-1.5-.67-1.5-1.5S11.17 8 12 8s1.5.67 1.5 1.5S12.83 11 12 11z"></path>
                              </svg>
                            </div>
                            <div className="card-item-title mb-2">
                              <label className="main-content-label tx-13 font-weight-bold mb-1 text-white">
                                Market Cap
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
                                  {tokenStats.totalSuppl
                                    ? formatPrice(
                                        tokenStats.totalSuppl *
                                          tokenStats.token_price
                                      )
                                    : 0}
                                </h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-sm-12 col-md-6 col-lg-6 col-xl-6">
                      <div className="card custom-card bg-gradient-to-r">
                        <div className="card-body">
                          <div className="card-item">
                            <div className="card-item-icon card-icon">
                              <svg
                                className="text-primary"
                                xmlns="http://www.w3.org/2000/svg"
                                height="24"
                                viewBox="0 0 24 24"
                                width="24"
                              >
                                <path d="M0 0h24v24H0V0z" fill="none"></path>
                                <path
                                  d="M12 4c-4.41 0-8 3.59-8 8s3.59 8 8 8 8-3.59 8-8-3.59-8-8-8zm1.23 13.33V19H10.9v-1.69c-1.5-.31-2.77-1.28-2.86-2.97h1.71c.09.92.72 1.64 2.32 1.64 1.71 0 2.1-.86 2.1-1.39 0-.73-.39-1.41-2.34-1.87-2.17-.53-3.66-1.42-3.66-3.21 0-1.51 1.22-2.48 2.72-2.81V5h2.34v1.71c1.63.39 2.44 1.63 2.49 2.97h-1.71c-.04-.97-.56-1.64-1.94-1.64-1.31 0-2.1.59-2.1 1.43 0 .73.57 1.22 2.34 1.67 1.77.46 3.66 1.22 3.66 3.42-.01 1.6-1.21 2.48-2.74 2.77z"
                                  opacity=".3"
                                ></path>
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7.07 18.28c.43-.9 3.05-1.78 4.93-1.78s4.51.88 4.93 1.78C15.57 19.36 13.86 20 12 20s-3.57-.64-4.93-1.72zm11.29-1.45c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33C4.62 15.49 4 13.82 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83zM12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6zm0 5c-.83 0-1.5-.67-1.5-1.5S11.17 8 12 8s1.5.67 1.5 1.5S12.83 11 12 11z"></path>
                              </svg>
                            </div>
                            <div className="card-item-title  mb-2">
                              <label className="main-content-label tx-13 font-weight-bold mb-1 text-white">
                                Current Price(LockChain)
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
                                  {tokenStats.token_price
                                    ? formatPrice(tokenStats.token_price)
                                    : 0}{" "}
                                </h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-sm-12 col-md-6 col-lg-6 col-xl-6">
                      <div className="card custom-card bg-gradient-to-r">
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
                                Liquidity
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
                                  {tokenStats.liquidity
                                    ? formatPrice(tokenStats.liquidity)
                                    : 0}{" "}
                                </h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="row row-sm">
                    <div className="col-sm-12 col-lg-12 col-xl-12">
                      <iframe
                        className="dexscreen-card"
                        title="LockChain Chart"
                        style={{ height: "519px" }}
                        src={DEX_CHART_FRAME}
                      ></iframe>
                    </div>
                  </div>
                </div>

                <div className="col-sm-12 col-lg-12 col-xl-4 ">
                  {isClient && (
                    <div className="card custom-card text-center text-primary pb-0 bg-gradient-to-r">
                      <div className="card-header border-0 pb-0 px-3 pt-0">
                        <div className="mt-2">
                          <h5 className="mb-0 text-white">
                            Crypto Fear and Greed Indicator
                          </h5>
                        </div>
                      </div>
                      <SpeedometerComponent fear={fear} />
                    </div>
                  )}
                  <div className="card custom-card bg-gradient-to-r">
                    <div className="card-body">
                      <div className="row row-sm">
                        <div className="col-6">
                          <div className="card-item-title">
                            <label className="main-content-label tx-13 font-weight-bold mb-2 text-white">
                              Project Launch
                            </label>
                            <span className="d-block tx-12 mb-0 text-muted">
                              $LOCKCHAIN Project launched on
                            </span>
                          </div>
                          <p className="mb-0 tx-24 mt-2">
                            <b className="text-white">
                              {daysLaunch ? daysLaunch : 0} days
                            </b>
                          </p>
                          <a href="#sec" className="text-muted">
                            09 Thursday , Jan 2025
                          </a>
                        </div>
                        <div className="col-6">
                          <Image
                            width={130}
                            src={work1Img}
                            alt="work"
                            className="best-emp"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`card custom-card overflow-hidden ${styles.cardGradient}`}
                  >
                    <div className={`card Upgrade ${styles.taxCard}`}>
                      <div className="card-body d-flex align-items-center ps-0">
                        <div className="d-inline-block position-relative donut-chart-sale">
                          <div id="buytax" style={{ minHeight: "180px" }}></div>
                        </div>
                        <div
                          style={{
                            paddingLeft: "23px",
                          }}
                          className="upgread-stroage"
                        >
                          <h4 className="text-white">BUY TAX</h4>
                          <p className="text-white">
                            Buy taxes on trade from dex
                          </p>
                          <button
                            type="button"
                            className="btn btn-success btn-sm light"
                          >
                            {BUY_TAX}% of each DEX buy
                          </button>
                          <div className="color-picker mt-3">
                            <p className="mb-0  text-white">
                              <svg
                                className="me-2"
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  width="14"
                                  height="14"
                                  rx="4"
                                  fill="#008FFB"
                                />
                              </svg>
                              Vesting (37%)
                            </p>
                          </div>
                          <div className="color-picker">
                            <p className="mb-0 text-white">
                              <svg
                                className="me-2"
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  width="14"
                                  height="14"
                                  rx="4"
                                  fill="#00E396"
                                />
                              </svg>
                              Protocol fees + Marketing (3%)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`card custom-card overflow-hidden ${styles.cardGradient}`}
                  >
                    <div className={`card Upgrade ${styles.taxCard}`}>
                      <div className="card-body d-flex align-items-center ps-0">
                        <div className="d-inline-block position-relative donut-chart-sale">
                          <div
                            id="selltax"
                            style={{ minHeight: "180px" }}
                          ></div>
                        </div>
                        <div
                          style={{
                            paddingLeft: "23px",
                          }}
                          className="upgread-stroage"
                        >
                          <h4 className="text-white">Sell TAX</h4>
                          <p className="text-white">
                            Sell taxes on trade from dex
                          </p>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm light"
                          >
                            {SELL_TAX}% of each DEX sell
                          </button>
                          <div className="color-picker mt-3">
                            <p className="mb-0  text-white">
                              <svg
                                className="me-2"
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  width="14"
                                  height="14"
                                  rx="4"
                                  fill="#008FFB"
                                />
                              </svg>
                              Protocol fees + Marketing (3%)
                            </p>
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
    </React.Fragment>
  );
}
