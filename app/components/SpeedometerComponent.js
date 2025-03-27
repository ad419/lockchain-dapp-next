"use client";
import ReactSpeedometer from "react-d3-speedometer";

const SpeedometerComponent = ({ fear }) => {
  return (
    <ReactSpeedometer
      needleHeightRatio={0.7}
      height={200}
      value={fear}
      customSegmentStops={[0, 250, 500, 750, 1000]}
      segmentColors={["#f02836", "#f07d29", "#9aca82", "#35b348"]}
      currentValueText={`Current: ${fear / 10} ${
        fear <= 250
          ? "Extreme Fear"
          : fear <= 500
          ? "Fear"
          : fear <= 750
          ? "Greed"
          : "Extreme Greed"
      }`}
      customSegmentLabels={[
        {
          text: "Extreme Fear",
          position: "OUTSIDE",
          color: "#d8dee9",
          fontSize: "12px",
        },
        {
          text: "Fear",
          position: "OUTSIDE",
          color: "#d8dee9",
          fontSize: "12px",
        },
        {
          text: "Greed",
          position: "OUTSIDE",
          color: "#d8dee9",
          fontSize: "12px",
        },
        {
          text: "Extreme Greed",
          position: "OUTSIDE",
          color: "#d8dee9",
          fontSize: "12px",
        },
      ]}
      ringWidth={47}
      needleTransitionDuration={3333}
      needleTransition="easeElastic"
      needleColor={"#a7ff83"}
      textColor={"#ffffff"}
      valueTextFontSize={"14px"}
      labelFontSize={"12px"}
    />
  );
};

export default SpeedometerComponent;
