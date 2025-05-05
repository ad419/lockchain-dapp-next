import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import pairAbi from "../json/PairContract.json";
import vestAbi from "../json/vest.json";
import tokenAbi from "../json/token.json";
import { DEFAULT_CHAIN, SUPPORTED_CHAIN, contract } from "../hooks/constant";
import { getMultiCall, getWeb3Contract } from "../hooks/contractHelper";
import swapABI from "../json/swap.json";
import { useAccount, useNetwork } from "wagmi";
import axios from "axios";
import { getWeb3 } from "./connectors";
import { usePrices } from "../context/PriceContext";

export const useAccountStats = (updater) => {
  const { chain } = useNetwork();
  // Fix 1: Use "const" instead of "let" to prevent reassignment
  const { address } = useAccount();

  const [stats, setStats] = useState({
    eth_balance: 0,
    eth_price: 0,
    token_price: 0,
    token_balance: 0,
    holdingWorth: 0,
    totalVested: 0,
    totalClaimed: 0,
    totalclaimable: 0,
    totalclaimableWorth: 0,
    referralearn: 0,
    referralearnWorth: 0,
  });

  // Fix 2: Add a cache for previousValidStats to handle the temporary zeroing issue
  const [previousValidStats, setPreviousValidStats] = useState(null);

  let web3 = getWeb3();
  const prices = usePrices();

  // Keep track of valid stats
  useEffect(() => {
    if (stats && stats.token_balance > 0) {
      setPreviousValidStats(stats);
    }
  }, [stats]);

  useEffect(() => {
    const fetch = async () => {
      try {
        if (!address) return;

        let eth_bal = web3.utils.fromWei(await web3.eth.getBalance(address));
        let currentChain =
          chain && chain.id
            ? SUPPORTED_CHAIN.includes(chain.id)
              ? chain.id
              : DEFAULT_CHAIN
            : DEFAULT_CHAIN;
        const tokenContract = getWeb3Contract(
          tokenAbi,
          contract[currentChain].TOKEN_ADDRESS,
          currentChain
        );
        const tokenLpContract = getWeb3Contract(
          pairAbi,
          contract[currentChain].TOKEN_LP_ADDRESS,
          currentChain
        );
        const vestContract = getWeb3Contract(
          vestAbi,
          contract[currentChain].VESTING_ADDRESS,
          currentChain
        );
        const swapContract = getWeb3Contract(
          swapABI,
          contract[currentChain].SWAP_ADDRESS,
          currentChain
        );
        const data = await getMultiCall(
          [
            tokenContract.methods.balanceOf(address), //0
            tokenLpContract.methods.getReserves(), //1
            tokenContract.methods.decimals(), //2
            vestContract.methods.userRecords(address), //3
            vestContract.methods.getClaimableAmount(address), //4
            swapContract.methods.userCommission(address), //5
          ],
          currentChain
        );

        // Use the price from context instead of API call
        let eth_price = prices.ethereum;
        let token_price = eth_price * parseFloat(data[1][1] / data[1][0]);

        // Fix 3: Only update if data is valid or we have no previous valid data
        const newStats = {
          eth_balance: eth_bal,
          eth_price,
          token_price,
          token_balance: parseFloat(data[0] / Math.pow(10, data[2])),
          holdingWorth:
            parseFloat(data[0] / Math.pow(10, data[2])) *
            parseFloat(token_price),
          totalVested: data[3][0] / Math.pow(10, 18),
          totalClaimed: data[3][1] / Math.pow(10, 18),
          totalclaimable: data[4] / Math.pow(10, 18),
          totalclaimableWorth:
            (data[4] / Math.pow(10, 18)) * parseFloat(token_price),
          referralearn: data[5] / Math.pow(10, 18),
          referralearnWorth:
            (data[5] / Math.pow(10, 18)) * parseFloat(token_price),
        };

        // Only update state if there is valid data
        if (parseFloat(newStats.token_balance) > 0 || !previousValidStats) {
          setStats(newStats);
        }
      } catch (err) {
        console.log("Error fetching account data:", err.message);
        toast.error(err.reason);
      }
    };

    if (address) {
      fetch();
    } else {
      setStats({
        eth_price: 0,
        token_price: 0,
        token_balance: 0,
        holdingWorth: 0,
        totalVested: 0,
        totalClaimed: 0,
        referralearn: 0,
        referralearnWorth: 0,
      });
    }

    // eslint-disable-next-line
  }, [updater, address, chain, prices]);

  // Return previous valid stats if they exist when we've temporarily lost connection
  return previousValidStats && stats.token_balance === 0
    ? previousValidStats
    : stats;
};

export const useSwapStats = (updater) => {
  const { chain } = useNetwork();
  let { address } = useAccount();
  const [stats, setStats] = useState({
    eth_balance: 0,
    eth_price: 0,
    token_price: 0,
    token_balance: 0,
    referralearn: 0,
    referralearnWorth: 0,
    allowence: 0,
  });

  let web3 = getWeb3();

  useEffect(() => {
    const fetch = async () => {
      try {
        let eth_bal = address
          ? web3.utils.fromWei(await web3.eth.getBalance(address), "ether")
          : 0;
        let currentChain =
          chain && chain.id
            ? SUPPORTED_CHAIN.includes(chain.id)
              ? chain.id
              : DEFAULT_CHAIN
            : DEFAULT_CHAIN;
        const tokenContract = getWeb3Contract(
          tokenAbi,
          contract[currentChain].TOKEN_ADDRESS,
          currentChain
        );
        const tokenLpContract = getWeb3Contract(
          pairAbi,
          contract[currentChain].TOKEN_LP_ADDRESS,
          currentChain
        );
        const swapContract = getWeb3Contract(
          swapABI,
          contract[currentChain].SWAP_ADDRESS,
          currentChain
        );
        let data = [];
        if (address) {
          data = await getMultiCall(
            [
              tokenContract.methods.balanceOf(address), //0
              swapContract.methods.userCommission(address), //3
              tokenContract.methods.allowance(
                address,
                contract[currentChain].SWAP_ADDRESS
              ), //3
            ],
            currentChain
          );
        }

        let lpdata = await getMultiCall([
          tokenLpContract.methods.getReserves(), //1
          tokenContract.methods.decimals(), //2
        ]);

        const response = await axios.get(
          `https://api.coingecko.com/api/v3/simple/price?ids=${contract[currentChain].coingecko_symbol}&vs_currencies=usd`
        );
        let eth_price = parseFloat(
          response.data[contract[currentChain].coingecko_symbol].usd
        );
        let token_price =
          parseFloat(eth_price) * parseFloat(lpdata[0][1] / lpdata[0][0]);

        setStats({
          eth_balance: eth_bal,
          eth_price,
          token_price,
          token_balance:
            data && data.length > 0
              ? parseFloat(data[0] / Math.pow(10, lpdata[1]))
              : 0,
          referralearn:
            data && data.length > 0 ? data[1] / Math.pow(10, 18) : 0,
          referralearnWorth:
            data && data.length > 0
              ? (data[1] / Math.pow(10, 18)) * parseFloat(token_price)
              : 0,
          allowence: data && data.length > 0 ? data[2] / Math.pow(10, 18) : 0,
        });
      } catch (err) {
        console.log(err.message);
        toast.error(err.reason);
      }
    };

    fetch();

    // eslint-disable-next-line
  }, [updater, address, chain]);

  return stats;
};
