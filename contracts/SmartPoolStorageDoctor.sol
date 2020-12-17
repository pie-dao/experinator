pragma solidity 0.6.4;

import {PBasicSmartPoolStorage as PBStorage} from "@pie-dao/smart-pools/contracts/storage/PBasicSmartPoolStorage.sol";
import "@pie-dao/smart-pools/contracts/interfaces/IBPool.sol";

contract SmartPoolStorageDoctor {
    function operate(address _bPool) external {
        PBStorage.StorageStruct storage s = PBStorage.load();
        s.bPool = IBPool(_bPool);
        s.controller = msg.sender;
        s.publicSwapSetter = msg.sender;
        s.tokenBinder = msg.sender;
    }
}