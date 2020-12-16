pragma experimental ABIEncoderV2;
pragma solidity 0.7.3;

import "./interfaces/IProxy.sol";
import "./interfaces/IPV2SmartPool.sol";
import "./interfaces/IBPool.sol";
import "diamond-2/contracts/Diamond.sol";
import "diamond-2/contracts/interfaces/IDiamondCut.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "ExperiPie/contracts/interfaces/IExperiPie.sol";

contract Experinator is Ownable {

    address diamondImplementation;

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

    function setProxyOwner(address _proxy, address _owner) external onlyOwner {
        IProxy proxy = IProxy(_proxy);
        proxy.setProxyOwner(_owner);
    }
}