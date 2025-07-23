export const loadCSVData = async () => {
  try {
    // Updated CSV data with new wallet address added
    const csvData = `0x975fc65b0e53b9bc77ec26dddb43018005918629,1201.919231
0x7f89babfe8c5f9ed10b1217b9ca86a8172a74370,480.7634615
0x064ae3f2ab6b8baaa51a02694af1f7815f3a3e52,2355.766346
0xa93ad46598cadaa6dbd52bc80825ca2c3009d363,4384.536538
0x6a5df11cfcd72740759bd7ecc683c5d0a54e9286,8028.836538
0xb101a90f179d8ee815bdb0c8315d4c28f8fa5b99,480.7634615
0x3d7cefec398d44e2189de9a9eeb1aa15ca260b86,1430.264423
0x815550dcb148a24660ce82c6e1f9cb694ffad0b7,740.1413462
0x09c1bcd0585b63a83a0072dbc24a2932445d361e,961.5375
0x6cc4d0812a164dbbca1457aff94e8fe22e8cee9b,1875.954808
0x27bb6d5207a12117a8eb1bb8c08e2152ceb84619,502.6682692
0x909247f8f3b2dd3c8c366090b47727a448c3a805,2281.241346
0x3b2d0f2eb43d8805d1bf66937ef268d5ade3da88,1927.718269
0x0685169840db9fb77fcebf027d70ed600c0b3cf0,4723.548077
0x59dad92ce81b4aa454b0af0c82296c5aac0ed463,4867.785577
0x41a1fc9a9cd84f4be7616b4ace46e00070e2fd64,8413.455769
0x1257bb191c55e9c6d55378230ffb6cadbc04378b,480.7634615
0x333ded79447c08ff6cd434c1d056bcb7fd3d37cb,1805.279808
0x4fd03fb31a9e5b87861ae6b73acf5424154fdb7e,1673.068269
0x31151e02a0e15aee238489c432437234b1a4ce17,528.8461538
0xbe8cd865f3fef15f810798589ab91b520c4c9aa9,1923.075
0xB60ce246306Ef660fe87c6DB3bd8FBDe813b7091,3750.892456
0x63f9086f7b718b881b9bf63deF300e0F017e3a25,3750.892456
0x7aF3116867A208184F34c65e74a6b17E64f53160,3750.892456
0x2a74E3B9aB41D421E081d707cA079baA7ee6d0b9,1000
0x6843c9A6e8525Eee849Ad5b64A376d92de1fFB60,2000
0xD7F83cFdB606083C007D00E3dF114a5EEdf7921B,3000
`;

    const lines = csvData.trim().split("\n");
    const data = {};

    lines.forEach((line) => {
      const [wallet, amount] = line.split(",");
      if (wallet && amount) {
        const weeklyAmount = parseFloat(amount);
        // ✅ Store both weekly amount and total allocation
        data[wallet.toLowerCase()] = {
          weeklyAmount: weeklyAmount, // Amount per week
          totalAllocation: weeklyAmount * 52, // Total over 52 weeks
        };
      }
    });

    return data;
  } catch (error) {
    console.error("Error loading CSV data:", error);
    return {};
  }
};

// Save user progress to localStorage
export const saveUserProgress = (address, progressData) => {
  try {
    localStorage.setItem(
      `airdrop_progress_${address.toLowerCase()}`,
      JSON.stringify(progressData)
    );
    return true;
  } catch (error) {
    console.error("Error saving user progress:", error);
    return false;
  }
};

// Load user progress from localStorage
export const loadUserProgress = (address) => {
  try {
    const data = localStorage.getItem(
      `airdrop_progress_${address.toLowerCase()}`
    );
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error loading user progress:", error);
    return null;
  }
};

// ✅ Updated to use userData object instead of totalAmount
export const generateWeeklyAllocations = (userData) => {
  const weeks = [];
  const weeklyAmount = userData.weeklyAmount; // Same amount every week

  for (let week = 1; week <= 52; week++) {
    const startDate = new Date("2025-07-09");
    const unlockDate = new Date(startDate);
    unlockDate.setDate(startDate.getDate() + (week - 1) * 7);

    weeks.push({
      week,
      amount: weeklyAmount, // ✅ Same amount every week
      unlockDate: unlockDate.toISOString(),
      isUnlocked: new Date() >= unlockDate,
      claimed: false,
    });
  }

  return weeks;
};

// Export updated CSV with progress
export const exportUpdatedCSV = () => {
  try {
    const allProgress = {};

    // Get all user progress from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("airdrop_progress_")) {
        const address = key.replace("airdrop_progress_", "");
        const progress = JSON.parse(localStorage.getItem(key));
        allProgress[address] = progress;
      }
    }

    // Generate updated CSV content
    let csvContent =
      "wallet_address,weekly_amount,total_allocation,total_claimed,remaining_amount,claimed_weeks,last_updated\n";

    Object.entries(allProgress).forEach(([address, data]) => {
      const weeklyAmount = data.weeklyAmount || 0;
      const totalAllocation = weeklyAmount * 52;
      const totalClaimed = data.claimedWeeks.length * weeklyAmount;
      const remainingAmount = totalAllocation - totalClaimed;
      const claimedWeeksStr = data.claimedWeeks.join(";");

      csvContent += `${address},${weeklyAmount},${totalAllocation},${totalClaimed.toFixed(
        6
      )},${remainingAmount.toFixed(
        6
      )},"${claimedWeeksStr}",${new Date().toISOString()}\n`;
    });

    // Create download
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `airdrop_progress_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("Error exporting CSV:", error);
    return false;
  }
};
