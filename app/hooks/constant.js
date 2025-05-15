import ethIcon from "../images/eth.png";

export const trimAddress = (addr) => {
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
};

export const contract = {
  // 1: {
  //   name: "Ethereum",
  //   symbol: "ETH",
  //   img: ethIcon,
  //   RPC: "https://mainnet.infura.io/v3/63f4b8ee61284419b46c780d03befc4e",
  //   EXPLORE: 'https://etherscan.io/',
  //   MULTICALL_ADDRESS: "0x5e227ad1969ea493b43f840cff78d08a6fc17796",
  //   WETH_ADDRESS: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  //   GLDN_ADDRESS: "0xFeeB4D0f5463B1b04351823C246bdB84c4320CC2",
  //   GLDN_LP_ADDRESS: "0x46cf1cf8c69595804ba91dfdd8d6b960c9b0a7c4",
  //   WETH_USD_LP_ADDRESS: "0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852",
  //   DIVIDEND_ADDRESS: "0xEFECAbFCc8a2E28Cc6278E95E6f20DE81D3C9A56",
  //   PAXG_ADDRESS:"0x45804880De22913dAFE09f4980848ECE6EcbAf78",
  //   PAXG_LP_ADDRESS:"0x9c4fe5ffd9a9fc5678cfbd93aa2d4fd684b67c4c",
  //   USDT_USDC_LP_ADDRESS : "0x3041CbD36888bECc7bbCBc0045E3B1f144466f5f",
  //   ETH_LINK_ADDRESS : "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  //   PAXG_LINK_ADDRESS : "0x9B97304EA12EFed0FAd976FBeCAad46016bf269e",
  //   PAGX_RESERVE_ADDR : "0x716BB8c60D409e54b8Fb5C4f6aBC50E794DA048a",

  // },
  // 56: {
  //   name: "Binance",
  //   symbol: "BNB",
  //   img: bnbIcon,
  //   RPC: "https://bsc-dataseed1.binance.org/",
  //   EXPLORE: 'https://bscscan.com/',
  //   MULTICALL_ADDRESS: "0x5e227ad1969ea493b43f840cff78d08a6fc17796",
  //   WETH_ADDRESS: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  //   GLDN_ADDRESS: "0xFeeB4D0f5463B1b04351823C246bdB84c4320CC2",
  //   GLDN_LP_ADDRESS: "0x46cf1cf8c69595804ba91dfdd8d6b960c9b0a7c4",
  //   WETH_USD_LP_ADDRESS: "0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852",
  //   DIVIDEND_ADDRESS: "0xEFECAbFCc8a2E28Cc6278E95E6f20DE81D3C9A56",
  //   PAXG_ADDRESS:"0x45804880De22913dAFE09f4980848ECE6EcbAf78",
  //   PAXG_LP_ADDRESS:"0x9c4fe5ffd9a9fc5678cfbd93aa2d4fd684b67c4c",
  //   USDT_USDC_LP_ADDRESS : "0x3041CbD36888bECc7bbCBc0045E3B1f144466f5f",
  //   ETH_LINK_ADDRESS : "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  //   PAXG_LINK_ADDRESS : "0x9B97304EA12EFed0FAd976FBeCAad46016bf269e",
  //   PAGX_RESERVE_ADDR : "0x716BB8c60D409e54b8Fb5C4f6aBC50E794DA048a",

  // },
  // 97 : {
  //   name: "Binance",
  //   symbol: "BNB",
  //   img: bnbIcon,
  //   coingecko_symbol : "binancecoin",
  //   networkQuery : "bsc_testnet",
  //   RPC: "https://data-seed-prebsc-2-s2.bnbchain.org:8545",
  //   EXPLORE: 'https://testnet.bscscan.com/',
  //   MULTICALL_ADDRESS: "0xa54fE4a3DbD1Eb21524Cd73754666b7E13b4cB18",
  //   WETH_ADDRESS: "0xae13d989dac2f0debff460ac112a837c89baa7cd",
  //   TOKEN_ADDRESS: "0xf00FFcc241Ef337Ce056B982de89E84D2405da9f",
  //   TOKEN_LP_ADDRESS: "0xa6adfd4da5669596531faae98af4a2a686a319d0",
  //   VESTING_ADDRESS : "0xe135b252828C1D989e2ce58aC0Bb328f90429f5b",
  //   WETH : "0xae13d989dac2f0debff460ac112a837c89baa7cd",

  // }

  8453: {
    name: "Base",
    symbol: "ETH",
    img: ethIcon,
    coingecko_symbol: "ethereum",
    networkQuery: "bsc_testnet",
    RPC: "https://base.llamarpc.com",
    EXPLORE: "https://basescan.org/",
    MULTICALL_ADDRESS: "0xfEE958Fa595B4478cea7560C91400A98b83d6C91",
    WETH_ADDRESS: "0x4200000000000000000000000000000000000006",
    TOKEN_ADDRESS: "0x3057Df42e79c5400C780f8d3849f20297659f29A", // New token address
    TOKEN_LP_ADDRESS: "0x18EBFfefFfcC3fc54dF2383CFA1c4B1D485C943D", // New LP address you just found
    VESTING_ADDRESS: "0xD998452c6DF5c558BF585f308AA8A46CfB688215", // Updated vesting address
    WETH: "0x4200000000000000000000000000000000000006", // WETH stays the same
    ROUTER_ADDRESS: "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24", // Keeping router the same unless you have a new address
    SWAP_ADDRESS: "0x32b63818db1ABDd2a71Ac0b99DD54a5244f449F2", // Updated swap address
  },
};

export const DEFAULT_CHAIN = 8453;
export const SUPPORTED_CHAIN = [8453];
export const networkQuery = "bsc_testnet";
export const afterDate = "2025-01-09";
export const dateFormat = "%Y-%m-%d";
export const api_key = "BQYD2cpwwlgnrI5Cpu2WqYnJ2IB1RVIw";
export const PROJECT_ID = "27b9720018bf7f8740936e6a6eb28604";
export const BUY_TAX = 40;
export const SELL_TAX = 3;
export const DEX_CHART_FRAME =
  "https://dexscreener.com/base/0x3057Df42e79c5400C780f8d3849f20297659f29A?embed=1&amp;theme=dark&amp;info=0";
export const SIDEBAR_CHART_LINK =
  "https://www.dextools.io/app/en/base/pair-explorer/0xaee35AAf149de47d1a6733f892917e66BD72A1DB"; // Use LP address for pair explorer
export const SIDEBAR_TOKEN_LINK =
  "https://basescan.org/address/0x3057Df42e79c5400C780f8d3849f20297659f29A";

export const transactionQuery = `query ($network: EthereumNetwork!, $token: String!, $limit: Int!, $offset: Int!,$after: ISO8601DateTime  ) {
  ethereum(network: $network) {
    dexTrades(
      options: {desc: ["block.height", "tradeIndex"], limit: $limit, offset: $offset}
      date: {after: $after}
      baseCurrency: {is: $token}
    ) {
      block {
        timestamp {
          time(format: "%Y-%m-%d %H:%M:%S")
        }
        height
      }
      tradeIndex
      protocol
      exchange {
        fullName
      }
      smartContract {
        address {
          address
          annotation
        }
      }
      buyAmount
      buyCurrency {
          address
          symbol
      }
      
      base_amount_usd: baseAmount(in: USD)
      sellAmount
      sellCurrency {
          address
          symbol
      }
      quote_amount_usd: quoteAmount(in: USD)
      transaction {
        hash
      }
    }
  }
}`;

export const userTransactionQuery = `query ($network: EthereumNetwork!,  $user: String!  , $token: String!, $limit: Int!, $offset: Int!, $after: ISO8601DateTime,$weth : String! ) {
  ethereum(network: $network) {
    dexTrades(
      options: {desc: ["block.height", "tradeIndex"], limit: $limit, offset: $offset}
      date: {after: $after}
      baseCurrency: {is: $token}
    ) {
      block {
        timestamp {
          time(format: "%Y-%m-%d %H:%M:%S")
        }
        height
      }
      tradeIndex
      protocol
      exchange {
        fullName
      }
      smartContract {
        address {
          address
          annotation
        }
      }
      buyAmount
      buyCurrency {
          address
          symbol
      }
      
      base_amount_usd: baseAmount(in: USD)
      sellAmount
      sellCurrency {
          address
          symbol
      }
      quote_amount_usd: quoteAmount(in: USD)
      quoteCurrency(
        quoteCurrency: {in: [$weth, $token]}
      ) {
        address
        symbol
      }
      transaction(txSender: {is: $user}) {
        hash
      }
      maker {
        address
      }
    }
  }
}
`;

export const formatDateWithZone = (unixTime) => {
  try {
    let dateString = new Date(unixTime).toString();
    let startIndex = dateString.indexOf("GMT");
    let modifyDate = dateString.substring(0, startIndex);
    return modifyDate;
  } catch (err) {
    console.log(err.message);
  }
};

export const chartQuery = `{
  ethereum(network: ethereum) {
    dexTrades(
      options: {asc: "timeInterval.minute"}
      date: {since: "2022-11-27"}
      exchangeName: {is: "Uniswap"}
      baseCurrency: {is: "0xfeeb4d0f5463b1b04351823c246bdb84c4320cc2"}
      quoteCurrency: {is: "0x590619f44e1550cccd6f7778ae73947050aec22b"}
    ) {
      timeInterval {
        minute(count: 30)
      }
      high: quotePrice(calculate: maximum)
      low: quotePrice(calculate: minimum)
      open: minimum(of: block, get: quote_price)
      close: maximum(of: block, get: quote_price)
      baseCurrency {
        name
      }
      quoteCurrency {
        name
      }
    }
  }
}`;
