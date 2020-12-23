import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import balancerPoolBytecode from "./balancerPoolBytecode";
import balancerFactoryBytecode from "./balancerFactoryBytecode";

export const deployBalancerPool = async(signer: SignerWithAddress) => {
    const tx = await signer.sendTransaction({data: balancerPoolBytecode, gasLimit: 9500000}) as any;
    return tx.creates;
}

export const deployBalancerFactory = async(signer: SignerWithAddress) => {
    const tx = await signer.sendTransaction({data: balancerFactoryBytecode, gasLimit: 9500000}) as any;
    return tx.creates;
}