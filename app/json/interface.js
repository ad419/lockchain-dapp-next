import { Interface } from 'ethers/lib/utils';
import tokenAbi from './token.json';
import multicallAbi from './multicall.json';
import dividendAbi from './dividend.json';
import PairContractAbi from './PairContract.json';
import linkAbi from './chainlink.json';

export const tokenItf = new Interface(tokenAbi);
export const multicallItf = new Interface(multicallAbi);
export const dividendItf = new Interface(dividendAbi);
export const pairContractItf = new Interface(PairContractAbi);
export const linkContractItf = new Interface(linkAbi);