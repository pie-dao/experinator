pragma experimental ABIEncoderV2;
pragma solidity 0.7.3;

import "./interfaces/IProxy.sol";
import "./interfaces/IPV2SmartPool.sol";
import "./interfaces/IBPool.sol";
import "./interfaces/IBFactory.sol";
import "./interfaces/ISmartPoolStorageDoctor.sol";
import "diamond-2/contracts/Diamond.sol";
import "diamond-2/contracts/interfaces/IDiamondCut.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "ExperiPie/contracts/interfaces/IExperiPie.sol";

contract Experinator is Ownable {

    address diamondImplementation;
    address experiPieStorageDoctor;
    address balancerFactory;
    address smartPoolImplementation;
    address smartPoolStorageDoctor;

    IDiamondCut.FacetCut[] public diamondCut;

    function setCut(IDiamondCut.FacetCut[] memory _diamondCut) external {
        for(uint256 i = 0; i < _diamondCut.length; i ++) {
            diamondCut.push(_diamondCut[i]);
        }
    }

    // Make sure its initialised!
    function setDiamondImplementation(address _diamondImplementation) external onlyOwner {
        diamondImplementation = _diamondImplementation;
    }

    function setBalancerFactory(address _factory) external onlyOwner {
        balancerFactory = _factory;
    }

    function setSmartPoolImplementation(address _smartPoolImplementation) external onlyOwner {
        smartPoolImplementation = _smartPoolImplementation;
    }

    function setSmartPoolStorageDoctor(address _storageDoctor) external onlyOwner {
        smartPoolStorageDoctor = _storageDoctor;
    }

    function setExperiPieStorageDoctor(address _storageDoctor) external onlyOwner {
        experiPieStorageDoctor = _storageDoctor;
    }

    function toExperiPie(address _smartPool, address _controller) external onlyOwner {
        IProxy proxy = IProxy(_smartPool);
        Diamond diamond = Diamond(payable(_smartPool));
        IPV2SmartPool smartPool = IPV2SmartPool(_smartPool);
        IExperiPie experiPie = IExperiPie(_smartPool);
        IBPool bPool = IBPool(smartPool.getBPool());

        address[] memory tokens = smartPool.getTokens();

        smartPool.setTokenBinder(address(this));

        for(uint256 i = 0; i < tokens.length; i ++) {
            smartPool.unbind(tokens[i]);
        }

        smartPool.setTokenBinder(_controller);
        smartPool.setController(_controller);

        proxy.setImplementation(diamondImplementation);

        // TODO operate the storage instead if already initialized
        diamond.initialize(diamondCut, address(this));

        
        for(uint256 i = 0; i < tokens.length; i++) {
            IERC20 token = IERC20(tokens[i]);
            token.transfer(_smartPool, token.balanceOf(address(this)));
            experiPie.addToken(tokens[i]);
        }

        // set proxy contract ownership to the controller
        experiPie.transferOwnership(_controller);
        proxy.setProxyOwner(_controller);
    }

    function toSmartPool(address _experiPie, address _owner, uint256[] memory _weights) external onlyOwner {
        IProxy proxy = IProxy(_experiPie);
        Diamond diamond = Diamond(payable(_experiPie));
        IPV2SmartPool smartPool = IPV2SmartPool(_experiPie);
        IExperiPie experiPie = IExperiPie(_experiPie);
        ISmartPoolStorageDoctor spStorage = ISmartPoolStorageDoctor(smartPoolStorageDoctor);

        address[] memory tokens = experiPie.getTokens();

        require(_weights.length == tokens.length, "ARRAY_LENGTH_MISMATCH");

        // deploy a fresh _bPool

        IBPool bPool = IBPool(IBFactory(balancerFactory).newBPool());

        //remove remove tokens and deposit them into a fresh balancer pool
        for(uint256 i = 0; i < tokens.length; i ++) {
            experiPie.removeToken(tokens[i]);
            
            IERC20 token = IERC20(tokens[i]);
            uint256 balance = token.balanceOf(_experiPie);
            experiPie.singleCall(tokens[i], abi.encodeWithSelector(token.transfer.selector, address(this), balance), 0);
            token.approve(address(bPool), balance);
            bPool.bind(tokens[i], balance, _weights[i]);
        }

        bPool.setController(_experiPie);

        // set storage doctor as implementation
        proxy.setImplementation(smartPoolStorageDoctor);

        spStorage.operate(address(bPool));

        proxy.setImplementation(smartPoolImplementation);

        smartPool.setController(_owner);
    }


    // In case migration does not work we handle control back to another address again
    function setProxyOwner(address _proxy, address _owner) external onlyOwner {
        IProxy proxy = IProxy(_proxy);
        proxy.setProxyOwner(_owner);
    }

    // In case migration does not work set the smart pool address to another address again
    function setController(address _pie, address _controller) external onlyOwner {
        IPV2SmartPool pie = IPV2SmartPool(_pie);
        pie.setController(_controller);
    }

    function setOwner(address _pie, address _owner) external onlyOwner {
        IExperiPie experiPie = IExperiPie(_pie);
        experiPie.transferOwnership(_owner);
    }
}