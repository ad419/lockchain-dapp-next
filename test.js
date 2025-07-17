import { ethers } from "ethers";

const RPC_URL = "https://developer-access-mainnet.base.org";

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

  try {
    const network = await provider.getNetwork();
    console.log("Connected to:", network.name, "Chain ID:", network.chainId);
  } catch (err) {
    console.error("Could not detect network:", err);
  }
}

main();
