import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "hardhat-typechain";
import "hardhat-watcher";

import { Experinator } from "./typechain/Experinator";
import { Experinator__factory } from "./typechain/factories/Experinator__factory";

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
  }
};

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
