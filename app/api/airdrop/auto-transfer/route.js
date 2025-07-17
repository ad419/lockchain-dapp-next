// app/api/airdrop/auto-transfer/route.js
import { ethers } from "ethers";

// Configuration - Updated RPC URLs
const AIRDROP_WALLET_PRIVATE_KEY = process.env.AIRDROP_WALLET_PRIVATE_KEY;

// Multiple RPC endpoints for Base network (fallback system)
const BASE_RPC_ENDPOINTS = [
  "https://mainnet.base.org", // Official Base RPC
  "https://base-mainnet.g.alchemy.com/v2/demo", // Alchemy demo (limited)
  "https://base.llamarpc.com", // LlamaRPC
  "https://base-rpc.publicnode.com", // PublicNode
  "https://1rpc.io/base", // 1RPC
  "https://base.drpc.org", // dRPC
];

const LOCKCHAIN_CONTRACT_ADDRESS = "0x12A1527a3D2ED4084B85602490d945ee9CEEdc53";

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
];

// Function to try multiple RPC endpoints
async function createProvider() {
  for (const rpcUrl of BASE_RPC_ENDPOINTS) {
    try {
      console.log(`Trying RPC: ${rpcUrl}`);
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Test the connection
      const network = await provider.getNetwork();
      console.log(`Connected to ${rpcUrl}, network:`, network);

      // Verify it's Base mainnet (chainId 8453)
      if (Number(network.chainId) === 8453) {
        return { provider, rpcUrl };
      } else {
        console.warn(
          `Wrong network for ${rpcUrl}. Expected 8453, got ${network.chainId}`
        );
      }
    } catch (error) {
      console.warn(`Failed to connect to ${rpcUrl}:`, error.message);
      continue; // Try next RPC
    }
  }

  throw new Error("All RPC endpoints failed");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      userAddress,
      weekNumber,
      amount,
      tokenContract,
      signature,
      timestamp,
    } = body;

    console.log("Transfer request received:", {
      userAddress,
      weekNumber,
      amount,
    });

    // Validate input
    if (
      !userAddress ||
      !weekNumber ||
      !amount ||
      !tokenContract ||
      !signature ||
      !timestamp
    ) {
      return new Response(
        JSON.stringify({ message: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!ethers.isAddress(userAddress)) {
      return new Response(JSON.stringify({ message: "Invalid user address" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify signature
    const message = `Claim Week ${weekNumber} - ${amount} LOCK tokens - ${timestamp}`;
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
        return new Response(JSON.stringify({ message: "Invalid signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (sigError) {
      return new Response(
        JSON.stringify({ message: "Signature verification failed" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Prevent replay attacks (5 minute window)
    const now = Date.now();
    if (Math.abs(now - timestamp) > 300000) {
      return new Response(
        JSON.stringify({ message: "Request timestamp too old or in future" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!AIRDROP_WALLET_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({ message: "Airdrop wallet not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Connect to blockchain with fallback system
    console.log("Connecting to Base network...");
    let provider, rpcUrl;

    try {
      const connection = await createProvider();
      provider = connection.provider;
      rpcUrl = connection.rpcUrl;
      console.log(`Successfully connected using: ${rpcUrl}`);
    } catch (networkError) {
      console.error("All RPC endpoints failed:", networkError);
      return new Response(
        JSON.stringify({
          message: "Failed to connect to Base network",
          error: "All RPC endpoints are currently unavailable",
          endpoints: BASE_RPC_ENDPOINTS,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const wallet = new ethers.Wallet(AIRDROP_WALLET_PRIVATE_KEY, provider);
    console.log("Airdrop wallet address:", wallet.address);

    const token = new ethers.Contract(tokenContract, ERC20_ABI, wallet);

    // Check wallet balances
    const ethBalance = await provider.getBalance(wallet.address);
    const tokenBalance = await token.balanceOf(wallet.address);

    console.log("Wallet balances:", {
      ethBalance: ethers.formatEther(ethBalance),
      tokenBalance: ethers.formatEther(tokenBalance),
      walletAddress: wallet.address,
      rpcUsed: rpcUrl,
    });

    // Calculate amount in wei
    const amountInUnits = ethers.parseEther(amount.toString());

    // Check if wallet has enough tokens
    if (tokenBalance < amountInUnits) {
      return new Response(
        JSON.stringify({
          message: "Insufficient tokens in airdrop wallet",
          walletBalance: ethers.formatEther(tokenBalance),
          requestedAmount: amount,
          walletAddress: wallet.address,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if wallet has enough ETH for gas
    const minGasBalance = ethers.parseEther("0.001");
    if (ethBalance < minGasBalance) {
      return new Response(
        JSON.stringify({
          message: "Insufficient ETH for gas fees",
          ethBalance: ethers.formatEther(ethBalance),
          required: "0.001 ETH minimum",
          walletAddress: wallet.address,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Execute transfer with dynamic gas pricing
    console.log(`Transferring ${amount} tokens to ${userAddress}`);

    // Get current gas price from network
    let gasPrice;
    try {
      const feeData = await provider.getFeeData();
      gasPrice = feeData.gasPrice || ethers.parseUnits("0.1", "gwei");
      console.log(
        "Current gas price:",
        ethers.formatUnits(gasPrice, "gwei"),
        "gwei"
      );
    } catch (gasError) {
      console.warn("Failed to get gas price, using fallback");
      gasPrice = ethers.parseUnits("0.1", "gwei");
    }

    const tx = await token.transfer(userAddress, amountInUnits, {
      gasLimit: 100000n,
      gasPrice: gasPrice,
    });

    console.log("Transaction submitted:", tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("Transfer successful:", receipt.hash);

    return new Response(
      JSON.stringify({
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: ethers.formatUnits(gasPrice, "gwei") + " gwei",
        rpcUsed: rpcUrl,
        message: `Successfully transferred ${amount} tokens to ${userAddress}`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Transfer failed:", err);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Transfer failed",
        error: err.message,
        code: err.code,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
