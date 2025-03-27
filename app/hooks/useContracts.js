import { contract, DEFAULT_CHAIN } from '../hooks/constant';
import { supportNetwork } from "./network";
import multiCallAbi from '../json/multicall.json';
import { getWeb3 } from "./connectors";
import { ethers } from "ethers";


export const multiCallContractConnect = (chainId = null) => {
  let multicallAddress = contract[chainId ? chainId : DEFAULT_CHAIN].MULTICALL_ADDRESS;
  let web3 = getWeb3();
  return new web3.eth.Contract(multiCallAbi, multicallAddress);
}

export const MulticallContract = (chainId = null) => {
    let multicallAddress = contract[chainId ? chainId : DEFAULT_CHAIN].MULTICALL_ADDRESS;
    const signerOrProvider = new ethers.providers.JsonRpcProvider(supportNetwork[chainId ? chainId : DEFAULT_CHAIN].rpc);
    return new ethers.Contract(multicallAddress, multiCallAbi, signerOrProvider)
}

