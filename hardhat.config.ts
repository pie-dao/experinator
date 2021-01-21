require('dotenv').config()
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "hardhat-typechain";
import "hardhat-watcher";

import fs from "fs";

import { Experinator } from "./typechain/Experinator";
import { Experinator__factory } from "./typechain/factories/Experinator__factory";
import { IExperiPie__factory } from "./typechain/factories/IExperiPie__factory";
import { SmartPoolStorageDoctor__factory } from "./typechain/factories/SmartPoolStorageDoctor__factory";
import { ExperiPieStorageDoctor__factory } from "./typechain/factories/ExperiPieStorageDoctor__factory";
import { IProxy__factory } from "./typechain/factories/IProxy__factory";
import { IPV2SmartPool__factory } from "./typechain/factories/IPV2SmartPool__factory";

const INFURA_API_KEY = process.env.INFURA_API_KEY || "";
const MAINNET_PRIVATE_KEY = process.env.MAINNET_PRIVATE_KEY || "";
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY || "";
const ETHERSCAN_API = process.env.ETHERSCAN_API || "";

module.exports = {
  watcher: {
    compilation: {
      tasks: ["compile"],
    }
  },
  solidity:{
    compilers: [
      {
        version: "0.6.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.7.3",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  networks: {
    fork : {
      url: `http://127.0.0.1:8545/`,
      gasPrice: 0,
      accounts: [
        MAINNET_PRIVATE_KEY
      ].filter((item) => item !== ""),
      timeout: 248364700
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      gasPrice: 90000000000,
      accounts: [
        MAINNET_PRIVATE_KEY,
      ].filter((item) => item !== "")
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
      gasPrice: 20000000000,
      accounts: [
        GOERLI_PRIVATE_KEY,
      ].filter((item) => item !== "")
    },
  }
};

task("get-address")
  .setAction(async(taskArgs, {ethers}) => {
    console.log((await ethers.getSigners())[0].address);
});

task("export-cut")
  .addParam("pie", "address of the pie")
  .addParam("output", "path to write file to")
  .setAction(async(taskArgs, {ethers}) => {
    const signers = await ethers.getSigners();

    const experiPie = IExperiPie__factory.connect(taskArgs.pie, signers[0]);
    const facets = await experiPie.facets();

    const facetCut: any[] = facets.map((item) => (
      {
        action: 0,
        facetAddress: item.facetAddress,
        functionSelectors: item.functionSelectors
      }
    ))

    fs.writeFileSync(taskArgs.output, JSON.stringify(facetCut, null, 2));
})

task("deploy-experinator")
    .addParam("cut", "path to json containing cut")
    .addParam("diamondImplementation", "must be intialised!")
    .addParam("balancerFactory", "address of the balancer factory")
    .addParam("smartPoolImplementation", "address of the smart pool implementation")
    .setAction(async (taskArgs, {ethers}) => {
        const signers = await ethers.getSigners();

        const smartPoolStorageDoctor = await new SmartPoolStorageDoctor__factory(signers[0]).deploy();
        console.log(`smartpool storage doctor: ${smartPoolStorageDoctor.address}`);

        const experiPieStorageDoctor = await new ExperiPieStorageDoctor__factory(signers[0]).deploy();
        console.log(`experiPie storage doctor: ${experiPieStorageDoctor.address}`);

        const experinator: Experinator = await new Experinator__factory(signers[0]).deploy(
          taskArgs.diamondImplementation,
          taskArgs.balancerFactory,
          taskArgs.smartPoolImplementation,
          smartPoolStorageDoctor.address,
          experiPieStorageDoctor.address
        );
        console.log(`experinator: ${experinator.address}`);

        const cut = require(taskArgs.cut);

        await experinator.setCut(cut);
        // await experinator.setDiamondImplementation(taskArgs.diamondImplementation);
});

task("set-controller-owner")
  .addParam("pie")
  .addParam("to")
  .setAction(async(taskArgs, {ethers}) => {
    const signers = await ethers.getSigners();

    const proxy = await IProxy__factory.connect(taskArgs.pie, signers[0]);
    const smartpool = await IPV2SmartPool__factory.connect(taskArgs.pie, signers[0]);

    // await proxy.setProxyOwner(taskArgs.to);
    await smartpool.setController(taskArgs.to);
});

task("to-experipie")
    .addParam("pie", "address of the smart pool to convert")
    .addParam("experinator", "address of the experinator")
    .setAction(async (taskArgs, {ethers}) => {
        const signers = await ethers.getSigners();
        const experinator: Experinator = await Experinator__factory.connect(taskArgs.experinator, signers[0]);

        experinator.toExperiPie(taskArgs.pie, signers[0].address);
});
