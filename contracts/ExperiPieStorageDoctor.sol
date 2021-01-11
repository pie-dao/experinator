pragma experimental ABIEncoderV2;
pragma solidity 0.7.3;

import "diamond-2/contracts/interfaces/IDiamondCut.sol";
import "diamond-2/contracts/libraries/LibDiamond.sol";
import "diamond-2/contracts/libraries/LibDiamondInitialize.sol";
import "diamond-2/contracts/facets/DiamondLoupeFacet.sol";
import "ExperiPie/contracts/facets/Basket/LibBasketStorage.sol";


contract ExperiPieStorageDoctor {

    struct Facet {
        address facetAddress;
        bytes4[] functionSelectors;
    }

    function operate() external {

        // IDiamondCut.FacetCut[] memory emptyCut = new IDiamondCut.FacetCut[](0);

        LibDiamondInitialize.diamondInitializeStorage().initialized = false;
        LibBasketStorage.BasketStorage storage bs = LibBasketStorage.basketStorage();

        Facet[] memory facets = getFacets();
        IDiamondCut.FacetCut[] memory facetCut = new IDiamondCut.FacetCut[](facets.length);

        for(uint256 i = 0; i < facets.length; i ++) {
            facetCut[i] = IDiamondCut.FacetCut({
                facetAddress: address(0),
                functionSelectors: facets[i].functionSelectors,
                action: IDiamondCut.FacetCutAction.Remove
            });
        }

        // TODO Fix Revert here :(
        LibDiamond.diamondCut(facetCut, address(0), new bytes(0));
        LibDiamond.setContractOwner(address(0));

        

        //remove all tokens
        for(uint256 i = 0; i < bs.tokens.length; i ++) {
            bs.inPool[address(bs.tokens[i])] = false;
        }

        delete bs.tokens;
    }

    function getFacets() internal view returns(Facet[] memory facets_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facets_ = new Facet[](ds.selectorCount);
        uint8[] memory numFacetSelectors = new uint8[](ds.selectorCount);
        uint256 numFacets;
        uint256 selectorIndex;
        // loop through function selectors
        for (uint256 slotIndex; selectorIndex < ds.selectorCount; slotIndex++) {
            bytes32 slot = ds.selectorSlots[slotIndex];
            for (uint256 selectorSlotIndex; selectorSlotIndex < 8; selectorSlotIndex++) {
                selectorIndex++;
                if (selectorIndex > ds.selectorCount) {
                    break;
                }
                bytes4 selector = bytes4(slot << (selectorSlotIndex * 32));
                address facetAddress_ = address(bytes20(ds.facets[selector]));
                bool continueLoop = false;
                for (uint256 facetIndex; facetIndex < numFacets; facetIndex++) {
                    if (facets_[facetIndex].facetAddress == facetAddress_) {
                        facets_[facetIndex].functionSelectors[numFacetSelectors[facetIndex]] = selector;
                        // probably will never have more than 256 functions from one facet contract
                        require(numFacetSelectors[facetIndex] < 255);
                        numFacetSelectors[facetIndex]++;
                        continueLoop = true;
                        break;
                    }
                }
                if (continueLoop) {
                    continueLoop = false;
                    continue;
                }
                facets_[numFacets].facetAddress = facetAddress_;
                facets_[numFacets].functionSelectors = new bytes4[](ds.selectorCount);
                facets_[numFacets].functionSelectors[0] = selector;
                numFacetSelectors[numFacets] = 1;
                numFacets++;
            }
        }
        for (uint256 facetIndex; facetIndex < numFacets; facetIndex++) {
            uint256 numSelectors = numFacetSelectors[facetIndex];
            bytes4[] memory selectors = facets_[facetIndex].functionSelectors;
            // setting the number of selectors
            assembly {
                mstore(selectors, numSelectors)
            }
        }
        // setting the number of facets
        assembly {
            mstore(facets_, numFacets)
        }
    }

}