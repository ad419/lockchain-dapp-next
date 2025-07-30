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
0xd40607fd115d4f9f9a43a54f98b1a551930ddf59,3605.768269
0x94889bbcbebcdedd1714f2800ab5e827638e0b38,4470.770192
0xf277558a4835bdd51c170d32fc584104e0323f98,4831.728846
0x5209c8048e50c38f7f424cadea02439c958acc22,2439.895192
0xf3396802eab0d47be289ccfd9094a4e573a5ce78,598.5480769
0xf7dd52707034696efd21acbdaba4e3de555bd488,7538.458654
0xe1470e329f64800ef53f3ecda1f1dfb87eca4d80,2403.838462
0x5c52721afff38c0446923d67bfa707c978f435e7,10336.53077
0x3C0398aed40FdFDBBCc6979BAfBb9d1c52Bd22Bc,19652.430769
0x5119929658ca6b3a8c3d0e985c8367ac87fc4ce2,961.5375
0x8572278fa5acb68ee06d990e4779c1eeffd7341a,7288.642308
0x864b3ff801552a9390ff21e5b7f8b06011b6be9d,961.5375
0x10db801a6580c54d27a7ae1bedc01f26839e804e,2884.6125
0x1476a263f4c48959f8040f525c1d7d64a8070ce6,2403.838462
0xd974b52af30c5a2c10dc2e026c703e2f71e82bcc,600.9596154
0x16a0b61132c0be847059b56aab8d106be8fa4ee5,5841.232692
0x61e53227e20ff17fbcdd88a55a90ffd22280e1cb,2942.299038
0xA284A638237Fe94D08f02900A163ae8287B6D43C,24322.115385
0xd03a5a463a99eb8a571e6bf1539e27ef387bd62a,527.6403846
0x56858525a6d67916e144b55742c5574577af2c8b,2403.838462
0x048c1edc9d0d0b3882a9a34f9d04f7d171262b56,492.7788462
0x63ff201fd2f03ac534664396663c7201c5f2638c,492.7788462
0x2c748f5444db0960360983fc85edc9aef2a9f427,1189.903846
0xe7f5724974fc7917c142cd96fcb4d71e457589f0,865.3826923
0x090651d689c56d452332a120b8eda00853e641a0,2403.838462
0x5e3bd1ce72668d073ba20013b039e25d27e5e6eb,2175.472115
0xa0a0bf4e0a4a4eb52a6abfb4c766406b57d8e4f2,480.7634615
0xf5f5072f921d9329df00777dae983a781727bc7a,2.400961538
0x98e9da619be661417a73a589fdbadc7dbe56551d,653.8442308
0x95a12cbf5ba5df9276bf2b18064a247e64df465e,997.5942308
0xeee5429c852daebb6a95aff3fe9b1b20d1e41cd6,2403.838462
0x15d645f2e89fb54e5032b0cc6bd0e4ca8d0526a9,3656.579808
0x68d2920a8723dfebb0d05762e98048f75a147fee,2043.260577
0xd48e6b18262004e63db4b22beb421c8f87640a3c,875.6634615
0x7de68996b039b3d817f763f7620c5f6163c40d11,637.0163462
0x25e28a74f77ffea89af632bc5092a90a6d79d091,1778.8375
0x12010b3a0f93a236c547aef4d83f07330f1aee69,6298.071154
0xba22aeec43fa5ebfa23a79e6443912682e6ede93,3475.957692
0xa591cd538d9de0e8fbfd65b9e42b4b29d14ea516,901.4394231
0x6147c12b7f36b4fce7724ac3e9379dc4aed54fbb,4230.769231
0x58ef556096b6a7ea1f8c75b2b13a301b0164dd06,4946.435577
0x7bb7e70de34008853613f5855dafefcb178cca2d,480.7634615
0x1a8e4509fc8e422c54ffb02c3571cb3f7ff5bc36,2403.838462
0x614d1ae63a0bec833be3fe5d089f38ba5468c828,1177.877885
0x6160cbe0ad811db8e7944a1037fd561c967252ac,8413.455769
0xd72dbe658f087463d80047b18ed7a02c64abe104,6268.381731
0x6453c94990f583d75d42c34f5f78617356d43e5f,9615.375
0xba111020f2da9ca503ea2d3feeb260941e553600,480.7634615
0x00498cfb5ebd07267956d3aa270cdae0218c2420,492.7788462
0xa1ebd91b3c47bc2cd889cef464437620119a695d,480.7634615
0xdc6f4fefdafd396bf9b9f631a803df7387f1fbd7,480.7634615
0x61c364c4c04dfe3e25b394129370790688258e77,721.1451923
0xbe8cd865f3fef15f810798589ab91b520c4c9aa9,1923.075
0xB60ce246306Ef660fe87c6DB3bd8FBDe813b7091,3750.892456
0x63f9086f7b718b881b9bf63deF300e0F017e3a25,3750.892456
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
