import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "hardhat-typechain";
import "hardhat-watcher";

import { Experinator } from "./typechain/Experinator";
import { Experinator__factory } from "./typechain/factories/Experinator__factory";
import { IExperiPie__factory } from "./typechain/factories/IExperiPie__factory";

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

task("get-cut")
  .addParam("pie", "address of the pie")
  .setAction(async(taskArgs, {ethers}) => {
    const signers = await ethers.getSigners();

    const experiPie = IExperiPie__factory.connect(taskArgs.pie, signers[0]);
    const facets = await experiPie.facets();

    console.log(facets);
})

task("deploy-experinator")
    .addParam("cut", "path to json containing cut")
    .addParam("diamondImplementation", "must be intialised!")
    .setAction(async (taskArgs, {ethers}) => {
        const signers = await ethers.getSigners();
        const experinator: Experinator = await new Experinator__factory(signers[0]).deploy();

        const cut = require(taskArgs.cut);

        await experinator.setCut(cut);
        await experinator.setDiamondImplementation(taskArgs.diamondImplementation);
});

task("to-experipie")
    .addParam("pie", "address of the smart pool to convert")
    .addParam("experinator", "address of the experinator")
    .setAction(async (taskArgs, {ethers}) => {
        const signers = await ethers.getSigners();
        const experinator: Experinator = await Experinator__factory.connect(taskArgs.experinator, signers[0]);

        experinator.toExperiPie(taskArgs.pie, signers[0].address);
});
