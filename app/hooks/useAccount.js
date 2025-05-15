import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import pairAbi from "../json/PairContract.json";
import vestAbi from "../json/vest.json";
import tokenAbi from "../json/token.json";
import { DEFAULT_CHAIN, SUPPORTED_CHAIN, contract } from "../hooks/constant";
import { getMultiCall, getWeb3Contract } from "../hooks/contractHelper";
import swapABI from "../json/swap.json";
import { useAccount, useNetwork } from "wagmi";
import { getWeb3 } from "./connectors";
import { usePrices } from "../context/PriceContext";

export const useAccountStats = (updater) => {
  const { chain } = useNetwork();
  let { address } = useAccount();
  // address = "0x7aF3116867A208184F34c65e74a6b17E64f53160";

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

  let web3 = getWeb3();
  const prices = usePrices();

  useEffect(() => {
    const fetch = async () => {
      try {
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
            tokenLpContract.methods.token0(),
            tokenLpContract.methods.token1(),
          ],
          currentChain
        );

        // Use price from context instead of API call
        let eth_price = prices.ethereum;

        // Get reserves
        const reserve0 = data[1][0];
        const reserve1 = data[1][1];

        // Get token0 and token1
        const token0 = data[6];
        const token1 = data[7];

        // Now find which token is WETH, and which is your token
        const yourTokenAddress = contract[currentChain].TOKEN_ADDRESS; // assume your token address here

        let tokenPriceInETH;

        if (yourTokenAddress.toLowerCase() === token0.toLowerCase()) {
          // your token is token0, WETH is token1
          tokenPriceInETH = reserve1 / reserve0;
        } else if (yourTokenAddress.toLowerCase() === token1.toLowerCase()) {
          // your token is token1, WETH is token0
          tokenPriceInETH = reserve0 / reserve1;
        } else {
          throw new Error("Token not found in LP!");
        }

        // Now final price in USD
        let token_price = tokenPriceInETH * eth_price;

        setStats({
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
        });

        console.log("fhfjhjhjchchcdjchdjhjhcj");
      } catch (err) {
        console.log("herererereererereerere", err.message);
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

  return stats;
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
  const prices = usePrices();

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
          tokenLpContract.methods.token0(), //3
          tokenLpContract.methods.token1(), //4
        ]);

        // Use price from context instead of API call
        let eth_price = prices.ethereum;

        // Get reserves
        const reserve0 = lpdata[0][0];
        const reserve1 = lpdata[0][1];

        // Get token0 and token1
        const token0 = lpdata[2];
        const token1 = lpdata[3];

        // Now find which token is WETH, and which is your token
        const yourTokenAddress = contract[currentChain].TOKEN_ADDRESS; // assume your token address here

        let tokenPriceInETH;

        if (yourTokenAddress.toLowerCase() === token0.toLowerCase()) {
          // your token is token0, WETH is token1
          tokenPriceInETH = reserve1 / reserve0;
        } else if (yourTokenAddress.toLowerCase() === token1.toLowerCase()) {
          // your token is token1, WETH is token0
          tokenPriceInETH = reserve0 / reserve1;
        } else {
          throw new Error("Token not found in LP!");
        }

        // Now final price in USD
        let token_price = tokenPriceInETH * eth_price;

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
  }, [updater, address, chain, prices]);

  return stats;
};
