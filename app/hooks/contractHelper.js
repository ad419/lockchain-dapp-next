import { ethers } from "ethers";
import { DEFAULT_CHAIN, contract } from "./constant";
import multicallAbi from '../json/multicall.json'
import { getWeb3 } from "./connectors";



export const getContract = (abi, address, library) => {
  try {
    return new ethers.Contract(address, abi, library)
  }
  catch {
    return false;
  }
}


export const getWeb3Contract = (abi, address, chainId = DEFAULT_CHAIN) => {
  let web3 = getWeb3(chainId);
  return new web3.eth.Contract(abi, address);
}


export const getMultiCall = async (calls = [], chainId = DEFAULT_CHAIN) => {
  let web3 = getWeb3(chainId);
  let multicallAddress = contract[DEFAULT_CHAIN].MULTICALL_ADDRESS;
  const mc = new web3.eth.Contract(multicallAbi, multicallAddress);
  const callRequests = calls.map((call) => {
    const callData = call.encodeABI();
    return {
      target: call._parent._address,
      callData,
    };
  });

  const { returnData } = await mc.methods
    .aggregate(callRequests)
    .call({});

  let finalData = returnData.map((hex, index) => {
    const types = calls[index]._method.outputs.map((o) =>
      o.internalType !== o.type && o.internalType !== undefined ? o : o.type
    );

    let result = web3.eth.abi.decodeParameters(types, hex);

    delete result.__length__;

    result = Object.values(result);

    return result.length === 1 ? result[0] : result;
  });

  return finalData;
}


export const formatPrice = (num, decimal = 8) => {

  return new Intl.NumberFormat('en-US', { maximumSignificantDigits: decimal }).format(parseFloat(num).toFixed(12));

}
