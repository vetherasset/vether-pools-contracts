// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

// ERC20 Interface
interface ERC20 {
    function totalSupply() external view returns (uint);
    function balanceOf(address account) external view returns (uint);
    function transfer(address, uint) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint);
    function approve(address, uint) external returns (bool);
    function transferFrom(address, address, uint) external returns (bool);
}
interface POOLS {
    function stakeForMember(uint inputVether, uint inputAsset, address pool, address member) external payable returns (uint units);
}
interface COREMATH {
    function calcPart(uint bp, uint total) external pure returns (uint part);
    function calcShare(uint part, uint total, uint amount) external pure returns (uint share);
    function calcSwapOutput(uint x, uint X, uint Y) external pure returns (uint output);
    function calcSwapFee(uint x, uint X, uint Y) external pure returns (uint output);
    function calcStakeUnits(uint a, uint A, uint v, uint V) external pure returns (uint units);
    function calcAsymmetricShare(uint s, uint T, uint A) external pure returns (uint share);
}
// SafeMath
library SafeMath {
    function sub(uint a, uint b) internal pure returns (uint) {
        assert(b <= a);
        return a - b;
    }

    function add(uint a, uint b) internal pure returns (uint)   {
        uint c = a + b;
        assert(c >= a);
        return c;
    }

    function mul(uint a, uint b) internal pure returns (uint) {
        if (a == 0) {
            return 0;
        }
        uint c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }

    function div(uint a, uint b) internal pure returns (uint) {
        require(b > 0, "SafeMath: division by zero");
        uint c = a / b;
        return c;
    }
}

contract VetherPools {
    using SafeMath for uint;

    address public VETHER;
    uint public one = 10**18;
    uint public VETHCAP = 2500 * one;
    uint public DAY = 86400;
    uint public DAYCAP = 30*DAY;

    address public M;

    address[] public arrayPools;
    mapping(address => PoolData) public poolData;
    struct PoolData {
        bool listed;
        uint genesis;
        uint vether;
        uint asset;
        uint vetherStaked;
        uint assetStaked;
        address[] arrayStakers;
        uint poolUnits;
        uint fees;
        uint volume;
        uint txCount;
    }
    
    address[] public arrayMembers;
    mapping(address => MemberData) public memberData;
    struct MemberData {
        bool _;
        mapping(address => StakeData) stakeData;
        address[] arrayPools;
    }

    struct StakeData {
        uint vether;
        uint asset;
        uint stakeUnits;
    }
   
    event Staked(address pool, address member, uint inputAsset, uint inputVether, uint unitsIssued);
    event Unstaked(address pool, address member, uint outputAsset, uint outputVether, uint unitsClaimed);
    event Swapped(address assetFrom, address assetTo, uint inputAmount, uint transferAmount, uint outputAmount, uint fee, address recipient);

    constructor (address addressVether) public payable {
        VETHER = addressVether; //0x95D0C08e59bbC354eE2218Da9F82A04D7cdB6fDF;
        // M = math; //0x3FA9BdcBd17bd75D1Dec10D52C65f41503e344F2
    }

    function setMath(address math) public {
        M = math;
    }

    receive() external payable {
        sellAsset(msg.value, address(0), address(0));
    }

    //==================================================================================//
    // Staking functions

    function stake(uint inputVether, uint inputAsset, address pool) public payable returns (uint units) {
        units = stakeForMember(inputVether, inputAsset, pool, msg.sender);
        return units;
    }

    function stakeForMember(uint inputVether, uint inputAsset, address pool, address member) public payable returns (uint units) {
        if (!poolData[pool].listed) { 
            require((inputAsset > 0 && inputVether > 0), "Must get both assets for new pool");
            _createNewPool(pool);
        }
        uint _allowedVether;
        if((poolData[pool].vether + inputVether) > VETHCAP){
            if(poolData[pool].vether > VETHCAP){
                _allowedVether = 0;
            } else {
                _allowedVether = VETHCAP.sub(poolData[pool].vether);
            }
        } else {
            _allowedVether = inputVether;
        }
        uint _actualInputAsset = _handleTransferIn(pool, inputAsset);
        uint _actualInputVether = _handleTransferIn(VETHER, _allowedVether);
        units = _stake(_actualInputVether, _actualInputAsset, pool, member);
        return units;
    }

    function _createNewPool(address _pool) internal {
        arrayPools.push(_pool);
        poolData[_pool].listed = true;
        poolData[_pool].genesis = now;
    }

    function _stake(uint _vether, uint _asset, address _pool, address _member) internal returns (uint _units) {
        uint _V = poolData[_pool].vether.add(_vether);
        uint _A = poolData[_pool].asset.add(_asset);
        _units = COREMATH(M).calcStakeUnits(_asset, _A, _vether, _V);   
        _incrementPoolBalances(_units, _vether, _asset, _pool);                                                  
        _addDataForMember(_member, _units, _vether, _asset, _pool);
        emit Staked(_pool, _member, _asset, _vether, _units);
        return _units;
    }

    //==================================================================================//
    // Unstaking functions

    // Unstake % for self
    function unstake(uint basisPoints, address pool) public returns (bool success) {
        require((basisPoints > 0 && basisPoints <= 10000), "Must be valid BasisPoints");
        uint _units = COREMATH(M).calcPart(basisPoints, memberData[msg.sender].stakeData[pool].stakeUnits);
        unstakeExact(_units, pool);
        return true;
    }

    // Unstake an exact qty of units
    function unstakeExact(uint units, address pool) public returns (bool success) {
        require(units <= memberData[msg.sender].stakeData[pool].stakeUnits, "Must own the units");
        uint _outputVether = COREMATH(M).calcShare(units, poolData[pool].poolUnits, poolData[pool].vether);
        uint _outputAsset = COREMATH(M).calcShare(units, poolData[pool].poolUnits, poolData[pool].asset);
        _handleUnstake(units, _outputVether, _outputAsset, msg.sender, pool);
        return true;
    }

    // Unstake % Asymmetrically
    function unstakeAsymmetric(uint basisPoints, address pool, bool toVether) public returns (uint outputAmount){
        uint _units = COREMATH(M).calcPart(basisPoints, memberData[msg.sender].stakeData[pool].stakeUnits);
        outputAmount = unstakeExactAsymmetric(_units, pool, toVether);
        return outputAmount;
    }
    // Unstake Exact Asymmetrically
    function unstakeExactAsymmetric(uint units, address pool, bool toVether) public returns (uint outputAmount){
        require(units <= memberData[msg.sender].stakeData[pool].stakeUnits, "Must own the units");
        uint _poolUnits = poolData[pool].poolUnits;
        require(units < _poolUnits, "Must not be last staker");
        uint _outputVether; uint _outputAsset; 
        if(toVether){
            _outputVether = COREMATH(M).calcAsymmetricShare(units, _poolUnits, poolData[pool].vether);
            _outputAsset = 0;
            outputAmount = _outputVether;
        } else {
            _outputVether = 0;
            _outputAsset = COREMATH(M).calcAsymmetricShare(units, _poolUnits, poolData[pool].asset);
            outputAmount = _outputAsset;
        }
        _handleUnstake(units, _outputVether, _outputAsset, msg.sender, pool);
        return outputAmount;
    }

    // Internal - handle Unstake
    function _handleUnstake(uint _units, uint _outputVether, uint _outputAsset, address payable _member, address _pool) internal {
        _decrementPoolBalances(_units, _outputVether, _outputAsset, _pool);
        _removeDataForMember(_member, _units, _pool);
        emit Unstaked(_pool, _member, _outputAsset, _outputVether, _units);
        _handleTransferOut(_pool, _outputAsset, _member);
        _handleTransferOut(VETHER, _outputVether, _member);
    } 

    //==================================================================================//
    // Upgrade functions

    // Upgrade from this contract to a new one - opt in
    function upgrade(address payable newContract, address pool) public {
        uint _units = memberData[msg.sender].stakeData[pool].stakeUnits;
        uint _outputVether = COREMATH(M).calcShare(_units, poolData[pool].poolUnits, poolData[pool].vether);
        uint _outputAsset = COREMATH(M).calcShare(_units, poolData[pool].poolUnits, poolData[pool].asset);
        _decrementPoolBalances(_units, _outputVether, _outputAsset, pool);
        _removeDataForMember(msg.sender, _units, pool);
        emit Unstaked(pool, msg.sender, _outputAsset, _outputVether, _units);
        ERC20(VETHER).approve(newContract, _outputVether);
        if(pool == address(0)){
            POOLS(newContract).stakeForMember{value:_outputAsset}(_outputVether, _outputAsset, pool, msg.sender);
        } else {
            POOLS(newContract).stakeForMember(_outputVether, _outputAsset, pool, msg.sender);
        }
    }

    //==================================================================================//
    // Swapping functions

    function buyAsset(uint amount, address asset, address pool) public payable returns (uint outputAmount, uint fee) {
        require(now < poolData[pool].genesis + DAYCAP, "Must not be after Day Cap");
        require(asset != pool, "Asset must not be the pool");
        uint _actualAmount = _handleTransferIn(asset, amount);
        if(asset == VETHER){
            // vether to asset
            (outputAmount, fee) = _swapVetherToAsset(_actualAmount, pool);
        } else {
            // asset to asset
            (outputAmount, fee) = _swapAssetToAsset(_actualAmount, asset, pool);
        }
        _handleTransferOut(pool, outputAmount, msg.sender);
        return (outputAmount, fee);
    }

    function sellAsset(uint amount, address asset, address pool) public payable returns (uint outputAmount, uint fee) {
        require(now < poolData[pool].genesis + DAYCAP, "Must not be after Day Cap");
        require(asset != VETHER, "Asset must not be Vether");
        uint _actualAmount = _handleTransferIn(asset, amount);
        if(asset == pool){
            // asset to vether
            (outputAmount, fee) = _swapAssetToVether(_actualAmount, pool);
            _handleTransferOut(VETHER, outputAmount, msg.sender);
        } else {
            // asset to asset
            (outputAmount, fee) = _swapAssetToAsset(_actualAmount, asset, pool);
            _handleTransferOut(pool, outputAmount, msg.sender);
        }
        return (outputAmount, fee);
    }

    function _swapVetherToAsset(uint _x, address _pool) internal returns (uint _y, uint _fee){
        uint _X = poolData[_pool].vether;
        uint _Y = poolData[_pool].asset;
        _y =  COREMATH(M).calcSwapOutput(_x, _X, _Y);
        _fee = COREMATH(M).calcSwapFee(_x, _X, _Y);
        poolData[_pool].vether = poolData[_pool].vether.add(_x);
        poolData[_pool].asset = poolData[_pool].asset.sub(_y);
        _updatePoolMetrics(_y+_fee, _fee, _pool, false);
        emit Swapped(VETHER, _pool, _x, 0, _y, _fee, msg.sender);
        return (_y, _fee);
    }

    function _swapAssetToVether(uint _x, address _pool) internal returns (uint _y, uint _fee){
        uint _X = poolData[_pool].asset;
        uint _Y = poolData[_pool].vether;
        _y =  COREMATH(M).calcSwapOutput(_x, _X, _Y);
        _fee = COREMATH(M).calcSwapFee(_x, _X, _Y);
        poolData[_pool].asset = poolData[_pool].asset.add(_x);
        poolData[_pool].vether = poolData[_pool].vether.sub(_y);
        _updatePoolMetrics(_y+_fee, _fee, _pool, true);
        emit Swapped(_pool, VETHER, _x, 0, _y, _fee, msg.sender);
        return (_y, _fee);
    }

    function _swapAssetToAsset(uint _x, address _pool1, address _pool2) internal returns (uint _z, uint _fee){
        (uint _y, uint _feey) = _swapAssetToVether(_x, _pool1);
        (uint _zz, uint _feez) = _swapVetherToAsset(_y, _pool2);
        _fee = _feez + calcValueInAsset(_feey, _pool2);
        emit Swapped(_pool1, _pool2, _x, _y, _z, _fee, msg.sender);
        return (_zz, _fee);
    }

    //==================================================================================//
    // Data Model

    function _incrementPoolBalances(uint _units, uint _vether, uint _asset, address _pool) internal {
        poolData[_pool].poolUnits = poolData[_pool].poolUnits.add(_units);
        poolData[_pool].vether = poolData[_pool].vether.add(_vether);
        poolData[_pool].asset = poolData[_pool].asset.add(_asset); 
        poolData[_pool].vetherStaked = poolData[_pool].vetherStaked.add(_vether);
        poolData[_pool].assetStaked = poolData[_pool].assetStaked.add(_asset); 
    }

    function _decrementPoolBalances(uint _units, uint _vether, uint _asset, address _pool) internal {
        uint _unstakedVether = COREMATH(M).calcShare(_vether, poolData[_pool].vether, poolData[_pool].vetherStaked);
        uint _unstakedAsset = COREMATH(M).calcShare(_asset, poolData[_pool].asset, poolData[_pool].assetStaked);
        poolData[_pool].vetherStaked = poolData[_pool].vetherStaked.sub(_unstakedVether);
        poolData[_pool].assetStaked = poolData[_pool].assetStaked.sub(_unstakedAsset); 
        poolData[_pool].poolUnits = poolData[_pool].poolUnits.sub(_units);
        poolData[_pool].vether = poolData[_pool].vether.sub(_vether);
        poolData[_pool].asset = poolData[_pool].asset.sub(_asset); 
    }

    function _addDataForMember(address _member, uint _units, uint _vether, uint _asset, address _pool) internal {
        if(memberData[_member].arrayPools.length < 1){
            arrayMembers.push(_member);
        }
        if( memberData[_member].stakeData[_pool].stakeUnits == 0){
            memberData[_member].arrayPools.push(_pool);
            poolData[_pool].arrayStakers.push(_member);
        }
        memberData[_member].stakeData[_pool].stakeUnits = memberData[_member].stakeData[_pool].stakeUnits.add(_units);
        memberData[_member].stakeData[_pool].vether = memberData[_member].stakeData[_pool].vether.add(_vether);
        memberData[_member].stakeData[_pool].asset = memberData[_member].stakeData[_pool].asset.add(_asset);
    }

    function _removeDataForMember(address _member, uint _units, address _pool) internal{
        uint stakeUnits = memberData[_member].stakeData[_pool].stakeUnits;
        uint _vether = COREMATH(M).calcShare(_units, stakeUnits, memberData[_member].stakeData[_pool].vether);
        uint _asset = COREMATH(M).calcShare(_units, stakeUnits, memberData[_member].stakeData[_pool].asset);
        memberData[_member].stakeData[_pool].stakeUnits = memberData[_member].stakeData[_pool].stakeUnits.sub(_units);
        memberData[_member].stakeData[_pool].vether = memberData[_member].stakeData[_pool].vether.sub(_vether);
        memberData[_member].stakeData[_pool].asset = memberData[_member].stakeData[_pool].asset.sub(_asset);
    }

    function _updatePoolMetrics(uint _tx, uint _fee, address _pool, bool _toVether) internal {
        poolData[_pool].txCount += 1;
        uint _volume = poolData[_pool].volume;
        uint _fees = poolData[_pool].fees;
        if(_toVether){
            poolData[_pool].volume = _tx.add(_volume); 
            poolData[_pool].fees = _fee.add(_fees); 
        } else {
            uint _txVether = calcValueInVether(_tx, _pool);
            uint _feeVether = calcValueInVether(_fee, _pool);
            poolData[_pool].volume = _volume.add(_txVether); 
            poolData[_pool].fees = _fees.add(_feeVether); 
        }
    }

    //==================================================================================//
    // Asset Transfer Functions

    function _handleTransferIn(address _asset, uint _amount) internal returns(uint actual){
        if(_amount > 0) {
            if(_asset == address(0)){
                require((_amount == msg.value), "Must get Eth");
                actual = _amount;
            } else {
                uint startBal = ERC20(_asset).balanceOf(address(this)); 
                ERC20(_asset).transferFrom(msg.sender, address(this), _amount); 
                actual = ERC20(_asset).balanceOf(address(this)).sub(startBal);
            }
        }
    }

    function _handleTransferOut(address _asset, uint _amount, address payable _recipient) internal {
        if(_amount > 0) {
            if (_asset == address(0)) {
                _recipient.call{value:_amount}(""); 
            } else {
                ERC20(_asset).transfer(_recipient, _amount);
            }
        }
    }

    function sync(address pool) public {
        if (pool == address(0)) {
            poolData[pool].asset = address(this).balance;
        } else {
            poolData[pool].asset = ERC20(pool).balanceOf(address(this));
        }
    }

    //==================================================================================//
    // Helper functions

    function getStakerUnits(address member, address pool) public view returns(uint stakerUnits){
        return (memberData[member].stakeData[pool].stakeUnits);
    }
    function getStakerShareVether(address member, address pool) public view returns(uint vether){
        uint _units = memberData[member].stakeData[pool].stakeUnits;
        vether = COREMATH(M).calcShare(_units, poolData[pool].poolUnits, poolData[pool].vether);
        return vether;
    }
    function getStakerShareAsset(address member, address pool) public view returns(uint asset){
        uint _units = memberData[member].stakeData[pool].stakeUnits;
        asset = COREMATH(M).calcShare(_units, poolData[pool].poolUnits, poolData[pool].asset);
        return asset;
    }

    function getPoolStaker(address pool, uint index) public view returns(address staker){
        return(poolData[pool].arrayStakers[index]);
    }

    function getMemberPool(address member, uint index) public view returns(address staker){
        return(memberData[member].arrayPools[index]);
    }
    function poolCount() public view returns(uint){
        return arrayPools.length;
    }
    function memberCount() public view returns(uint){
        return arrayMembers.length;
    }
    function getMemberPoolCount(address member) public view returns(uint){
        return(memberData[member].arrayPools.length);
    }
    function getPoolStakerCount(address pool) public view returns(uint){
        return(poolData[pool].arrayStakers.length);
    }

    function getMemberStakeData(address member, address pool) public view returns(StakeData memory){
        return(memberData[member].stakeData[pool]);
    }

    function getPoolROI(address pool) public view returns (uint roi){
        uint _assetStakedInVether = calcValueInVether(poolData[pool].assetStaked, pool);
        uint _vetherStart = poolData[pool].vetherStaked.add(_assetStakedInVether);
        uint _assetInVether = calcValueInVether(poolData[pool].asset, pool);
        uint _vetherEnd = poolData[pool].vether.add(_assetInVether);
        if (_vetherStart == 0){
            roi = 0;
        } else {
            roi = (_vetherEnd.mul(10000)).div(_vetherStart);
        }
        return roi;
   }

    function getMemberROI(address member, address pool) public view returns (uint roi){
        uint _assetStakedInVether = calcValueInVether(memberData[member].stakeData[pool].asset, pool);
        uint _vetherStart = memberData[member].stakeData[pool].vether.add(_assetStakedInVether);
        uint _memberVether = getStakerShareVether(member, pool);
        uint _memberAsset = getStakerShareAsset(member, pool);
        uint _assetInVether = calcValueInVether(_memberAsset, pool);
        uint _vetherEnd = _memberVether.add(_assetInVether);
        if (_vetherStart == 0){
            roi = 0;
        } else {
            roi = (_vetherEnd.mul(10000)).div(_vetherStart);
        }
        return roi;
   }

   function calcValueInVether(uint amount, address pool) public view returns (uint price){
       uint _asset = poolData[pool].asset;
       uint _vether = poolData[pool].vether;
       return (amount.mul(_vether)).div(_asset);
   }

    function calcValueInAsset(uint amount, address pool) public view returns (uint price){
       uint _asset = poolData[pool].asset;
       uint _vether = poolData[pool].vether;
       return (amount.mul(_asset)).div(_vether);
   }

   function calcAssetPPinVether(uint amount, address pool) public view returns (uint _output){
        uint _asset = poolData[pool].asset;
        uint _vether = poolData[pool].vether;
        return  COREMATH(M).calcSwapOutput(amount, _asset, _vether);
   }

    function calcVetherPPinAsset(uint amount, address pool) public view returns (uint _output){
        uint _asset = poolData[pool].asset;
        uint _vether = poolData[pool].vether;
        return  COREMATH(M).calcSwapOutput(amount, _vether, _asset);
   }
}
