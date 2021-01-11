import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Signer, constants, BigNumber, utils, Contract, BytesLike } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { IBFactory } from "../typechain/IBFactory";
import { IBPool } from "../typechain/IBPool";
import { deployBalancerFactory, deployBalancerPool } from "../utils";
import { IBPool__factory } from "../typechain/factories/IBPool__factory";
import { IBFactory__factory } from "../typechain/factories/IBFactory__factory";
import { MockToken__factory } from "../typechain/factories/MockToken__factory";
import { PProxy__factory } from "../typechain/factories/PProxy__factory";
import LibAddRemoveTokenArtifact from "../artifacts/@pie-dao/smart-pools/contracts/libraries/LibAddRemoveToken.sol/LibAddRemoveToken.json";
import LibWeightsArtifact from "../artifacts/@pie-dao/smart-pools/contracts/libraries/LibWeights.sol/LibWeights.json";
import LibPoolMathArtifact from "../artifacts/@pie-dao/smart-pools/contracts/libraries/LibPoolMath.sol/LibPoolMath.json";
import { LibPoolEntryExit__factory } from "../typechain/factories/LibPoolEntryExit__factory";
import { PProxy } from "../typechain/PProxy";
import { MockToken } from "../typechain/MockToken";
import { parseEther } from "ethers/lib/utils";
import { PV2SmartPool } from "../typechain/PV2SmartPool";
import { Diamond } from "../typechain/Diamond";
import { Diamond__factory } from "../typechain/factories/Diamond__factory";
import { BasketFacet__factory } from "../typechain/factories/BasketFacet__factory";
import { ERC20Facet__factory } from "../typechain/factories/ERC20Facet__factory";
import { CallFacet__factory } from "../typechain/factories/CallFacet__factory";
import { DiamondCutFacet__factory } from "../typechain/factories/DiamondCutFacet__factory";
import { OwnershipFacet__factory } from "../typechain/factories/OwnershipFacet__factory";
import { DiamondLoupeFacet__factory } from "../typechain/factories/DiamondLoupeFacet__factory";
import { SmartPoolStorageDoctor__factory } from "../typechain/factories/SmartPoolStorageDoctor__factory";
import { ExperiPieStorageDoctor__factory } from "../typechain/factories/ExperiPieStorageDoctor__factory";
import { PV2SmartPool__factory } from "../typechain/factories/PV2SmartPool__factory";
import { IExperiPie } from "../typechain/IExperiPie";
import { IExperiPie__factory } from "../typechain/factories/IExperiPie__factory";
import { Experinator } from "../typechain/Experinator";
import { Experinator__factory } from "../typechain/factories/Experinator__factory";
import TimeTraveler from "../utils/TimeTraveler";
import { ExperiPieStorageDoctor } from "../typechain/ExperiPieStorageDoctor";
import { SmartPoolStorageDoctor } from "../typechain/SmartPoolStorageDoctor";

function getSelectors(contract: Contract) {
    const signatures: BytesLike[] = [];
    for(const key of Object.keys(contract.functions)) {
        signatures.push(utils.keccak256(utils.toUtf8Bytes(key)).substr(0, 10));
    }
  
    return signatures;
  }

describe("Storage Test", async() => {

    let signers: SignerWithAddress[];
    let account: string;
    let bPool: IBPool;
    let bFactory: IBFactory;
    let tokenFactory: MockToken__factory;
    let tokens: MockToken[] = [];
    let tokenAddresses: String[] = [];
    let tokenBalances: BigNumber[] = [];
    let diamondCut: any[] = [];

    let implementation: PV2SmartPool;
    let implementationDiamond: Diamond;


    // all these contracts are actually the same
    let proxy: PProxy;
    let smartPool: PV2SmartPool;
    let diamond: Diamond;
    let experiPieStorageDoctor: ExperiPieStorageDoctor;
    let smartPoolStorageDoctor: SmartPoolStorageDoctor;
    let experiPie: IExperiPie;
    let experinator: Experinator;
    let timeTraveler: TimeTraveler;

    interface Balances {
        [address:string]: BigNumber;
    }

    const balances: Balances = {

    }

    const approvals: Balances = {

    }

    const PLACE_HOLDER_ADDRESS = "0x0000000000000000000000000000000000000001";
    const INITIAL_MINT = parseEther("1000000000");

    //end same contracts
    before(async() => {
        signers = await ethers.getSigners();
        account = signers[0].address;

        bPool = IBPool__factory.connect(await deployBalancerPool(signers[0]), signers[0]);
        bFactory = IBFactory__factory.connect(await deployBalancerFactory(signers[0]), signers[0]);
        tokenFactory = new MockToken__factory(signers[0]);

        console.log("deploying tokens")
        for(let i = 0; i < 8; i ++) {
            const tokenAmount = parseEther((1 + i).toString());
            const token = await tokenFactory.deploy(`TOKEN ${i}`, `SYMBOL ${i}`, 18);
            await token.mint(account, parseEther("1000000"));
            await token.approve(bPool.address, constants.MaxUint256);
            await bPool.bind(token.address, tokenAmount, parseEther("1"));
            tokens.push(token);
            tokenAddresses.push(token.address);
            tokenBalances.push(tokenAmount);
        }

        proxy = await (new PProxy__factory(signers[0])).deploy();

        console.log(proxy.address);

        // console.log(await bPool.controller());
    
        // Somehow typechain artifact is not generated
        const libAddRemoveToken = await (new ethers.ContractFactory(LibAddRemoveTokenArtifact.abi, LibAddRemoveTokenArtifact.bytecode, signers[0])).deploy();
        const libPoolEntryExit = await new LibPoolEntryExit__factory(signers[0]).deploy();
        const libWeights = await (new ethers.ContractFactory(LibWeightsArtifact.abi, LibWeightsArtifact.bytecode, signers[0])).deploy();
        const libPoolMath = await (new ethers.ContractFactory(LibPoolMathArtifact.abi, LibPoolMathArtifact.bytecode, signers[0])).deploy();
        const pv2Factory = await ethers.getContractFactory("PV2SmartPool", {
            libraries: {
                LibAddRemoveToken: libAddRemoveToken.address,
                LibPoolEntryExit:  libPoolEntryExit.address,
                LibWeights: libWeights.address,
                LibPoolMath: libPoolMath.address
            }
        });


        implementation = await pv2Factory.deploy() as PV2SmartPool;
        implementationDiamond = await new Diamond__factory(signers[0]).deploy();

        await bPool.setController(proxy.address);

        await proxy.setImplementation(implementation.address);
        smartPool = pv2Factory.attach(proxy.address) as PV2SmartPool;
        diamond  = implementationDiamond.attach(proxy.address);
        experiPie = IExperiPie__factory.connect(proxy.address, signers[0]);

        await smartPool.init(bPool.address, "NAME", "SYMBOL", INITIAL_MINT);

        for(let i = 1; i < signers.length; i ++) {
            await smartPool.transfer(signers[i].address, parseEther(`${i}`));
            balances[signers[i].address] = parseEther(`${i}`);
            await smartPool.connect(signers[i]).approve(PLACE_HOLDER_ADDRESS, parseEther(`${i}`));
            approvals[signers[i].address] = parseEther(`${i}`);
        }
        balances[account] = await smartPool.balanceOf(account);
        await smartPool.approve(PLACE_HOLDER_ADDRESS, parseEther("1"));
        approvals[account] = parseEther("1");
        // deploy facets

        const basketFacet = await new BasketFacet__factory(signers[0]).deploy();
        const erc20Facet = await new ERC20Facet__factory(signers[0]).deploy();
        const callFacet = await new CallFacet__factory(signers[0]).deploy();
        const diamondCutFacet = await new DiamondCutFacet__factory(signers[0]).deploy();
        const diamondLoupeFacet = await new DiamondLoupeFacet__factory(signers[0]).deploy();        
        const ownershipFacet = await new OwnershipFacet__factory(signers[0]).deploy();

        const FacetCutAction = {
            Add: 0,
            Replace: 1,
            Remove: 2,
          };

        diamondCut = [
            {
                action: FacetCutAction.Add,
                facetAddress: basketFacet.address,
                functionSelectors: getSelectors(basketFacet)
            },
            {
                action: FacetCutAction.Add,
                facetAddress: erc20Facet.address,
                functionSelectors: getSelectors(erc20Facet)
            },
            {
                action: FacetCutAction.Add,
                facetAddress: callFacet.address,
                functionSelectors: getSelectors(callFacet)
            },
            {
                action: FacetCutAction.Add,
                facetAddress: diamondCutFacet.address,
                functionSelectors: getSelectors(diamondCutFacet)
            },
            {
                action: FacetCutAction.Add,
                facetAddress: diamondLoupeFacet.address,
                functionSelectors: getSelectors(diamondLoupeFacet)
            },
            {
                action: FacetCutAction.Add,
                facetAddress: ownershipFacet.address,
                functionSelectors: getSelectors(ownershipFacet)
            },
        ];

        smartPoolStorageDoctor = await new SmartPoolStorageDoctor__factory(signers[0]).deploy();
        experiPieStorageDoctor = await new ExperiPieStorageDoctor__factory(signers[0]).deploy();

        // generate token storage data
        experinator = await (new Experinator__factory(signers[0])).deploy();
        await experinator.setCut(diamondCut);
        await experinator.setExperiPieStorageDoctor(experiPieStorageDoctor.address);
        await experinator.setSmartPoolStorageDoctor(smartPoolStorageDoctor.address);
        await experinator.setDiamondImplementation(implementationDiamond.address);
        await experinator.setSmartPoolImplementation(implementation.address);
        await experinator.setBalancerFactory(bFactory.address);

        timeTraveler = new TimeTraveler(network.provider);

        await timeTraveler.snapshot();
    });

    beforeEach(async() => {
        await timeTraveler.revertSnapshot();
    });

    it("Storage", async() => {

        await  proxy.setImplementation(implementationDiamond.address);

        await diamond.initialize(diamondCut, account);

        const balance = await experiPie.balanceOf(account);
        const name = await experiPie.name();
        const symbol = await experiPie.symbol();

        console.log(symbol);
        console.log(name);

        console.log(balance.toString());

        const totalSupply = await experiPie.totalSupply();

        expect(totalSupply).to.eq(INITIAL_MINT);

        // Check balances 
        for(let i = 0; i < signers.length; i ++) {
            const balance = await experiPie.balanceOf(signers[i].address);
            const allowance = await experiPie.allowance(signers[i].address, PLACE_HOLDER_ADDRESS);
            expect(balance).to.eq(balances[signers[i].address]);
            expect(allowance).to.eq(approvals[signers[i].address]);
        }
    });

    it.only("Pie smartpool -> Fresh ExperiPie -> Back to SmartPool -> Back to ExperiPie with experinator", async() => {
        await proxy.setProxyOwner(experinator.address);
        await experinator.setDiamondImplementation(implementationDiamond.address);
        await smartPool.setController(experinator.address);
        // await smartPool.setController(experinator.address);

        let totalSupply = await experiPie.totalSupply();
        let tokens = await experiPie.getTokens();

        console.log(totalSupply.toString());
        console.log(tokens);

        console.log("Experinator address:", experinator.address);
        console.log("Account address", account);
        console.log(smartPool.address, experiPie.address);

        await experinator.toExperiPie(smartPool.address, account);

        totalSupply = await experiPie.totalSupply();
        tokens = await experiPie.getTokens();
        let amounts = await experiPie.calcTokensForAmount(totalSupply);

        expect(tokens).to.eql(tokenAddresses);
        expect(amounts.amounts).to.eql(tokenBalances);

        let experiPieOwner = await experiPie.owner();
        let proxyOwner = await proxy.getProxyOwner();

        expect(experiPieOwner).to.eq(account);
        expect(proxyOwner).to.eq(account);

        const weights = [parseEther("1"), parseEther("1"), parseEther("1"), parseEther("1"), parseEther("1"), parseEther("1"), parseEther("1"), parseEther("1")]
        
        await proxy.setProxyOwner(experinator.address);
        await experiPie.transferOwnership(experinator.address);
        await experinator.toSmartPool(smartPool.address, account, weights);

        tokens = await smartPool.getTokens();
        amounts = await smartPool.calcTokensForAmount(totalSupply);
        let newWeights = await smartPool.getDenormalizedWeights();
        
        expect(newWeights).to.eql(weights);

        expect(tokens).to.eql(tokenAddresses);
        expect(amounts.amounts).to.eql(tokenBalances);

        let controller = await smartPool.getController();
        proxyOwner = await proxy.getProxyOwner();

        expect(controller).to.eq(account);
        expect(proxyOwner).to.eq(proxyOwner);

        await proxy.setProxyOwner(experinator.address);
        await smartPool.setController(experinator.address);
        await experinator.toExperiPie(smartPool.address, account);

        tokens = await experiPie.getTokens();
        amounts = await experiPie.calcTokensForAmount(totalSupply);

        expect(tokens).to.eql(tokenAddresses);
        expect(amounts.amounts).to.eql(tokenBalances);

        experiPieOwner = await experiPie.owner();
        proxyOwner = await proxy.getProxyOwner();

        expect(experiPieOwner).to.eq(account);
        expect(proxyOwner).to.eq(account);
    });
});