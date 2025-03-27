"use client";
import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../styles/CalculatePage.css";
import AnimatedNumber from "./AnimatedNumber";

const CalcuateProfit = () => {
  const [initialDeposit, setInitialDeposit] = useState("");
  const [marketCap, setMarketCap] = useState(1000000);
  const [displayCap, setDisplayCap] = useState("1M"); // Add this state for display
  const [chartData, setChartData] = useState([]);
  const [showChart, setShowChart] = useState(false);
  const [contribution, setContribution] = useState("");
  const [contributionFrequency, setContributionFrequency] = useState("monthly");
  const [showContributions, setShowContributions] = useState(false);
  const [chartMode, setChartMode] = useState("stacked"); // 'stacked' or 'profitOnly'
  const [contributionDuration, setContributionDuration] = useState(12); // Default 12 months

  useEffect(() => {
    if (initialDeposit) {
      // Remove marketCap condition
      setTimeout(() => setShowContributions(true), 300);
    } else {
      setShowContributions(false);
    }
  }, [initialDeposit]);

  const calculateProfits = () => {
    const deposit = parseFloat(initialDeposit);
    const contributionAmount = parseFloat(contribution) || 0;
    if (!deposit) return;

    const steps = [];
    const maxSteps = 20;
    const stepSize = (marketCap - 1000000) / (maxSteps - 1);

    // Calculate contributions based on frequency
    const getAnnualContribution = () => {
      switch (contributionFrequency) {
        case "daily":
          return contributionAmount * 365;
        case "weekly":
          return contributionAmount * 52;
        case "monthly":
          return contributionAmount * 12;
        case "annual":
          return contributionAmount;
        default:
          return 0;
      }
    };

    const annualContribution = getAnnualContribution();
    const totalMonths = contributionDuration;
    const monthlyContribution = annualContribution / 12;
    let accumulatedContribution = 0;

    for (let i = 0; i < maxSteps; i++) {
      const currentCap = Math.min(1000000 + stepSize * i, marketCap);

      let capLabel;
      if (currentCap >= 1000000000) {
        capLabel = `${(currentCap / 1000000000).toFixed(1)}B`;
      } else if (currentCap >= 1000000) {
        capLabel = `${(currentCap / 1000000).toFixed(1)}M`;
      }

      // Calculate contributions based on duration
      const monthsAtThisStep = (totalMonths / maxSteps) * (i + 1);
      accumulatedContribution = Math.min(
        monthlyContribution * monthsAtThisStep,
        monthlyContribution * totalMonths
      );

      // Calculate total investment including accumulated contributions
      const totalInvestment = deposit + accumulatedContribution;
      const profit = totalInvestment * (currentCap / 1000000); // * 0.1 i think i should add this but i have to ask julio

      steps.push({
        cap: capLabel,
        profit: profit,
        investment: totalInvestment,
        contributions: accumulatedContribution,
      });
    }

    setChartData(steps);
    setShowChart(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    calculateProfits();
  };

  // leaderbord for top 500 token holders
  // basescan
  // no contrac address

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`Market Cap: ${label}`}</p>
          <div className="tooltip-content">
            {payload.map((entry, index) => (
              <div key={index} className="tooltip-item">
                <span
                  className="tooltip-dot"
                  style={{ backgroundColor: entry.color }}
                ></span>
                <span className="tooltip-text">
                  {`${entry.name}: $${entry.value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomYAxisTick = ({ x, y, payload }) => {
    const [prevValue, setPrevValue] = useState(payload.value);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
      if (prevValue !== payload.value) {
        setIsAnimating(true);
        setPrevValue(payload.value);
        setTimeout(() => setIsAnimating(false), 600);
      }
    }, [payload.value, prevValue]);

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={4}
          textAnchor="end"
          fill="#d1d1d1"
          className={`axis-text ${isAnimating ? "axis-value-change" : ""}`}
        >
          ${payload.value.toLocaleString()}
        </text>
      </g>
    );
  };

  const CustomXAxisTick = ({ x, y, payload }) => {
    const [prevValue, setPrevValue] = useState(payload.value);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
      if (prevValue !== payload.value) {
        setIsAnimating(true);
        setPrevValue(payload.value);
        setTimeout(() => setIsAnimating(false), 600);
      }
    }, [payload.value, prevValue]);

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="middle"
          fill="#d1d1d1"
          className={`axis-text ${isAnimating ? "axis-value-change" : ""}`}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  const contributionInputs = showContributions && (
    <div className="contribution-section show">
      {/* Contribution Amount Input */}
      <div className="input-group fade-in">
        <label htmlFor="contribution" style={{ color: "#d1d1d1" }}>
          Recurring Contribution ($)
        </label>
        <input
          type="number"
          id="contribution"
          value={contribution}
          onChange={(e) => setContribution(e.target.value)}
          min="0"
          placeholder="Enter contribution amount"
        />
      </div>

      {/* Frequency Radio Buttons */}
      <div className="input-group contribution-frequency fade-in">
        <label style={{ color: "#d1d1d1" }}>Contribution Frequency</label>
        <div className="radio-group">
          {["daily", "weekly", "monthly", "annual"].map((frequency, index) => (
            <label
              key={frequency}
              className="radio-label"
              style={{
                animationDelay: `${index * 0.1}s`,
                color: "#d1d1d1",
                display: "flex",
                alignItems: "center",
              }}
            >
              <input
                type="radio"
                name="contributionFrequency"
                value={frequency}
                checked={contributionFrequency === frequency}
                onChange={(e) => setContributionFrequency(e.target.value)}
              />
              <span>
                {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Duration Slider */}
      <div className="input-group contribution-duration fade-in">
        <label htmlFor="contributionDuration" style={{ color: "#d1d1d1" }}>
          Contribution Duration:{" "}
          <span className="duration-display">
            {contributionDuration === 1
              ? "1 Month"
              : contributionDuration === 12
              ? "1 Year"
              : contributionDuration === 24
              ? "2 Years"
              : contributionDuration === 36
              ? "3 Years"
              : `${contributionDuration} Months`}
          </span>
        </label>
        <div className="duration-slider-container">
          <div className="duration-markers">
            {[1, 12, 24, 36].map((month) => (
              <div
                key={month}
                className={`duration-marker ${
                  contributionDuration >= month ? "active" : ""
                }`}
                onClick={() => setContributionDuration(month)}
              >
                {month === 1
                  ? "1M"
                  : month === 12
                  ? "1Y"
                  : month === 24
                  ? "2Y"
                  : "3Y"}
              </div>
            ))}
          </div>
          <input
            type="range"
            id="contributionDuration"
            min="1"
            max="36"
            step="1"
            value={contributionDuration}
            onChange={(e) => setContributionDuration(Number(e.target.value))}
            className="duration-slider"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: "60px" }} className="main-container-calculator">
      <div style={{ flex: 1 }}>
        <div className="profit-calculator">
          <div className="calculator-wrapper">
            <div className="input-section">
              <h2>Calculate Your Profits</h2>
              <form onSubmit={handleSubmit} className="calculator-form">
                <div className="input-group">
                  <label
                    style={{
                      color: "#d1d1d1",
                    }}
                    htmlFor="initialDeposit"
                  >
                    Initial Deposit ($)
                  </label>
                  <input
                    type="number"
                    id="initialDeposit"
                    value={initialDeposit}
                    onChange={(e) => setInitialDeposit(e.target.value)}
                    min="1"
                    required
                    placeholder="Enter amount"
                  />
                </div>

                {contributionInputs}

                <div className="input-group">
                  <label
                    style={{
                      color: "#d1d1d1",
                    }}
                    htmlFor="marketCap"
                  >
                    Market Cap Target: {displayCap}
                  </label>
                  <input
                    type="range"
                    id="marketCap"
                    min="1000000"
                    max="1000000000"
                    step="1000000"
                    value={marketCap}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setMarketCap(value);

                      // Format display value
                      if (value >= 1000000000) {
                        setDisplayCap("1B");
                      } else if (value >= 1000000) {
                        setDisplayCap(`${(value / 1000000).toFixed(0)}M`);
                      }
                    }}
                  />
                </div>

                <button type="submit" className="calculate-btn">
                  Calculate Profits
                </button>
              </form>
            </div>

            {showChart && chartData.length > 0 ? (
              <div className="chart-section">
                <h2 className="chart-title">Profit Projection by Market Cap</h2>
                <div className="chart-mode-toggle">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="chartMode"
                      value="stacked"
                      checked={chartMode === "stacked"}
                      onChange={(e) => setChartMode(e.target.value)}
                    />
                    <span>Show All Details</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="chartMode"
                      value="profitOnly"
                      checked={chartMode === "profitOnly"}
                      onChange={(e) => setChartMode(e.target.value)}
                    />
                    <span>Show Profit Only</span>
                  </label>
                </div>
                <h3 className="balance-title">
                  Potential Future Balance:{" "}
                  <AnimatedNumber
                    value={
                      chartData[chartData.length - 1].profit +
                      chartData[chartData.length - 1].investment
                    }
                  />
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 20,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255, 255, 255, 0.1)"
                    />
                    <XAxis
                      dataKey="cap"
                      tick={<CustomXAxisTick />}
                      axisLine={{ stroke: "rgba(255, 255, 255, 0.15)" }}
                    />
                    <YAxis
                      tick={<CustomYAxisTick />}
                      axisLine={{ stroke: "rgba(255, 255, 255, 0.15)" }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ color: "#d1d1d1", padding: "20px" }}
                    />
                    {chartMode === "stacked" && (
                      <>
                        <Bar
                          dataKey="investment"
                          name="Initial Investment"
                          fill="#403fad"
                          stackId="a"
                          radius={[4, 4, 0, 0]}
                          animationBegin={0}
                          animationDuration={1000}
                        />
                        <Bar
                          dataKey="contributions"
                          name="Contributions"
                          fill="#6159cb"
                          stackId="a"
                          animationBegin={250}
                          animationDuration={1000}
                        />
                      </>
                    )}
                    <Bar
                      dataKey="profit"
                      name="Projected Profit"
                      fill="#7da0ff"
                      stackId={chartMode === "stacked" ? "a" : null}
                      radius={
                        chartMode === "profitOnly" ? [4, 4, 4, 4] : [0, 0, 4, 4]
                      }
                      animationBegin={500}
                      animationDuration={1000}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="chart-section">
                <center>
                  <h2 className="chart-title">
                    Profit Projection by Market Cap
                  </h2>
                  <p
                    style={{
                      color: "#d1d1d1",
                    }}
                    className="chart-placeholder"
                  >
                    Enter an initial deposit and target market cap to calculate
                    your profits.
                  </p>
                </center>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalcuateProfit;
