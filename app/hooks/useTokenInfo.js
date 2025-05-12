import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import pairAbi from "../json/PairContract.json";
import tokenAbi from "../json/token.json";
import { DEFAULT_CHAIN, SUPPORTED_CHAIN, contract } from "../hooks/constant";
import { getMultiCall, getWeb3Contract } from "../hooks/contractHelper";
import axios from "axios";
import { useNetwork } from "wagmi";

export const useTokenInfoStats = (updater) => {
  const { chain } = useNetwork();

  const [stats, setStats] = useState({
    decimal: 0,
    totalSuppl: 0,
    getCirculatingSupply: 0,
    eth_price: 0,
    token_price: 0,
    totalDistributed: 0,
    liquidity: 0,
    totalBuyTax: 0,
    totalSellTax: 0,
    loading: true,
  });

  useEffect(() => {
    const fetch = async () => {
      try {
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

        const data = await getMultiCall([
          tokenContract.methods.decimals(), //0
          tokenContract.methods.totalSupply(), //1
          tokenLpContract.methods.getReserves(), //2
          tokenContract.methods.balanceOf(
            contract[currentChain].TOKEN_LP_ADDRESS
          ), //3
          tokenLpContract.methods.token0(), //4
          tokenLpContract.methods.token1(), //5
        ]);

        const response = await axios.get(
          `https://api.coingecko.com/api/v3/simple/price?ids=${contract[currentChain].coingecko_symbol}&vs_currencies=usd`
        );
        let eth_price = parseFloat(
          response.data[contract[currentChain].coingecko_symbol].usd
        );

        // Get reserves
        const reserve0 = data[2][0];
        const reserve1 = data[2][1];

        // Get token0 and token1
        const token0 = data[4];
        const token1 = data[5];

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
          decimal: data[0],
          totalSuppl: data[1] / Math.pow(10, data[0]),
          eth_price: eth_price,
          token_price: token_price,
          liquidity: parseFloat(data[3] / Math.pow(10, 18)) * 2 * token_price,
          totalBuyTax: 0,
          totalSellTax: 0,
          loading: false,
        });
      } catch (err) {
        console.log(err.message);
        toast.error(err.reason);
      }
    };

    fetch();

    // eslint-disable-next-line
  }, [updater, chain]);

  return stats;
};
