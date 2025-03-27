import React, { useState, useEffect } from "react";

const AnimatedNumber = ({ value, duration = 1000 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const start = displayValue;
    const end = Number(value);
    const decimals = (value.toString().split(".")[1] || "").length;

    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;

      if (elapsed < duration) {
        const progress = elapsed / duration;
        const current = start + (end - start) * progress;
        setDisplayValue(Number(current.toFixed(decimals)));
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return displayValue.toLocaleString(undefined, {
    minimumFractionDigits: (value.toString().split(".")[1] || "").length,
    maximumFractionDigits: (value.toString().split(".")[1] || "").length,
  });
};

export default AnimatedNumber;
