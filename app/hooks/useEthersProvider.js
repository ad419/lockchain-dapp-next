import * as React from 'react'
import { useNetwork, useWalletClient } from 'wagmi'
import { providers } from 'ethers'
import { DEFAULT_CHAIN } from '../hooks/constant'
 
export function walletClientToSigner(walletClient) {
  const { account, chain, transport } = walletClient
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  const provider = new providers.Web3Provider(transport, network)
  const signer = provider.getSigner(account.address)
  return signer
}
 
/** Hook to convert a viem Wallet Client to an ethers.js Signer. */
export function useEthersSigner() {
    const { chain } = useNetwork()
  const { data: walletClient } = useWalletClient({ chainId : DEFAULT_CHAIN })
  return React.useMemo(
    () => (walletClient ? walletClientToSigner(walletClient) : undefined),
    [walletClient],
  )
}