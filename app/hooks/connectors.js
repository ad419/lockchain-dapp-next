import Web3 from "web3";
import { DEFAULT_CHAIN, contract } from "./constant";


export const getWeb3 = (chainId = null) => {
  
  let setRpc = contract[chainId ? chainId : DEFAULT_CHAIN].RPC;
  return new Web3(setRpc);
}

