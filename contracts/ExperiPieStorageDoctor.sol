pragma experimental ABIEncoderV2;
pragma solidity 0.7.3;

import "diamond-2/contracts/interfaces/IDiamondCut.sol";
import "diamond-2/contracts/libraries/LibDiamond.sol";
import "diamond-2/contracts/libraries/LibDiamondInitialize.sol";
import "diamond-2/contracts/facets/DiamondLoupeFacet.sol";
import "ExperiPie/contracts/facets/Basket/LibBasketStorage.sol";


contract ExperiPieStorageDoctor {
    function operate() external {

        IDiamondCut.FacetCut[] memory emptyCut = new IDiamondCut.FacetCut[](0);

        LibDiamondInitialize.diamondInitializeStorage().initialized = false;
        LibBasketStorage.BasketStorage storage bs = LibBasketStorage.basketStorage();

        // TODO Fix Revert here :(
        LibDiamond.diamondCut(emptyCut, address(0), new bytes(0));
        LibDiamond.setContractOwner(address(0));

        

        //remove all tokens
        for(uint256 i = 0; i < bs.tokens.length; i ++) {
            bs.inPool[address(bs.tokens[i])] = false;
        }

        delete bs.tokens;
    }
}