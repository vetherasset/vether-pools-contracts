pragma solidity ^0.6.4;

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
// Safe Math
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

contract VETHERPOOL {
    using SafeMath for uint;

    address public VETHER;
    uint public one = 10**18;

    address[] public arrayPools;
    uint public poolCount;
    mapping(address => address[]) public mapPoolStakers;
    mapping(address => mapping(address => uint)) public mapPoolStakerUnits;
    mapping(address => PoolData) public mapPoolData;
    struct PoolData {
        bool listed;
        uint vether;
        uint asset;
        uint vetherStaked;
        uint assetStaked;
        uint stakerCount;
        uint poolUnits;
        uint averageFee;
        uint averageTransaction;
        uint transactionCount;
    }
    
    address[] public arrayStakers;
    uint public stakerCount;
    // mapping(address => MemberData) public mapMemberID;
    mapping(address => MemberData) public mapMemberData;
    struct MemberData {
        // mapping(address => uint256) allowance;
        address[] arrayPools;
        uint poolCount;
        mapping(address => uint) vetherStaked;
        mapping(address => uint) assetStaked;
    }

    // struct StakeData {
    //     uint vether;
    //     uint asset;
    // }
   
    event Staked(address pool, address member, uint inputAsset, uint inputVether, uint unitsIssued);
    event Unstaked(address pool, address member, uint outputAsset, uint outputVether, uint unitsClaimed);
    event Swapped(address assetFrom, address assetTo, uint inputAmount, uint transferAmount, uint outPutAmount, uint fee, address recipient);

    constructor (address addressVether) public payable {
        VETHER = addressVether;
    }

    receive() external payable {
        buyVETH(msg.value);
    }

    //==================================================================================//
    // Staking functions

    function stake(uint inputVether, uint inputAsset, address pool) public payable returns (uint units) {
        require(pool == address(0), "Must be Eth");
        if (!mapPoolData[pool].listed) { 
            require((inputAsset > 0 && inputVether > 0), "Must get both assets for new pool");
            _createNewPool(pool);
        }
        _handleTransferIn(pool, inputAsset);
        _handleTransferIn(VETHER, inputVether);
        units = _stake(inputVether, inputAsset, pool, msg.sender);
        return units;
    }

    function stakeForMember(uint inputVether, uint inputAsset, address pool, address member) public payable returns (uint units) {
        require(pool == address(0), "Must be Eth");
        if (!mapPoolData[pool].listed) { 
            require((inputAsset > 0 && inputVether > 0), "Must get both assets for new pool");
            _createNewPool(pool);
        }
        _handleTransferIn(pool, inputAsset);
        _handleTransferIn(VETHER, inputVether);
        units = _stake(inputVether, inputAsset, pool, member);
        return units;
    }

    function _createNewPool(address _pool) internal {
        arrayPools.push(_pool);
        poolCount += 1;
        mapPoolData[_pool].listed = true;
    }

    function _stake(uint _vether, uint _asset, address _pool, address _member) internal returns (uint _units) {
        uint _V = mapPoolData[_pool].vether.add(_vether);
        uint _A = mapPoolData[_pool].asset.add(_asset);
        _units = calcStakeUnits(_asset, _A, _vether, _V);   
        _incrementPoolBalances(_units, _vether, _asset, _pool);                                                  
        _addDataForMember(_member, _units, _vether, _asset, _pool);
        emit Staked(_pool, _member, _asset, _vether, _units);
        return _units;
    }

    //==================================================================================//
    // Unstaking functions

    function unstake(uint basisPoints, address pool) public returns (bool success) {
        require(pool == address(0), "Must be Eth");
        require(mapPoolData[pool].listed, "Must be listed");
        uint _stakerUnits = mapPoolStakerUnits[pool][msg.sender];
        uint _units = calcPart(basisPoints, _stakerUnits);
        unstakeExact(_units, pool);
        return true;
    }

    function unstakeExact(uint units, address pool) public returns (bool success) {
        require(pool == address(0), "Must be Eth");
        require(mapPoolStakerUnits[pool][msg.sender] >= units);
        uint _outputVether = calcShare(units, mapPoolData[pool].poolUnits, mapPoolData[pool].vether);
        uint _outputAsset = calcShare(units, mapPoolData[pool].poolUnits, mapPoolData[pool].asset);
        _decrementPoolBalances(units, _outputVether, _outputAsset, pool);
        _removeDataForMember(msg.sender, units, pool);
        emit Unstaked(pool, msg.sender, _outputAsset, _outputVether, units);
        _handleTransferOut(pool, _outputAsset, msg.sender);
        _handleTransferOut(VETHER, _outputVether, msg.sender);
        return true;
    }

    function unstakeAsymmetric(uint basisPoints, address pool, bool toVether) public returns (uint outputAmount){
        require(pool == address(0), "Must be Eth");
        uint _units = calcPart(basisPoints, mapPoolStakerUnits[pool][msg.sender]);
        outputAmount = unstakeExactAsymmetric(_units, pool, toVether);
        return outputAmount;
    }

    function unstakeExactAsymmetric(uint units, address pool, bool toVether) public returns (uint outputAmount){
        require(pool == address(0), "Must be Eth");
        require((mapPoolStakerUnits[pool][msg.sender] >= units), "Must own the units");
        uint _outputVether; uint _outputAsset; 
        if(toVether){
            _outputVether = calcAsymmetricShare(units, mapPoolData[pool].poolUnits, mapPoolData[pool].vether);
            _outputAsset = 0;
            outputAmount = _outputVether;
        } else {
            _outputVether = 0;
            _outputAsset = calcAsymmetricShare(units, mapPoolData[pool].poolUnits, mapPoolData[pool].asset);
            outputAmount = _outputAsset;
        }
        _decrementPoolBalances(units, _outputVether, _outputAsset, pool);
        _removeDataForMember(msg.sender, units, pool);
        emit Unstaked(pool, msg.sender, _outputAsset, _outputVether, units);
        _handleTransferOut(pool, _outputAsset, msg.sender);
        _handleTransferOut(VETHER, _outputVether, msg.sender);
        return outputAmount;
    }

    //==================================================================================//
    // Upgrade functions

    function upgrade(address pool, address poolContract) public returns (uint units) {
        uint _stakerUnits = mapPoolStakerUnits[pool][msg.sender];
        uint _outputVether = calcShare(_stakerUnits, mapPoolData[pool].poolUnits, mapPoolData[pool].vether);
        uint _outputAsset = calcShare(_stakerUnits, mapPoolData[pool].poolUnits, mapPoolData[pool].asset);
        unstake(10000, pool);
        units = POOLS(poolContract).stakeForMember(_outputVether, _outputAsset, pool, msg.sender);
        return units;
    }

    //==================================================================================//
    // Swapping functions

    function buyVETH(uint amount) public payable returns (uint outputAmount) {
        _handleTransferIn(address(0), amount);
        outputAmount = _swapAssetToVether(amount, address(0));
        _handleTransferOut(VETHER, outputAmount, msg.sender);
        return outputAmount;
    }

    function sellVETH(uint amount) public payable returns (uint outputAmount) {
        _handleTransferIn(VETHER, amount);
        outputAmount = _swapVetherToAsset(amount, address(0));
        _handleTransferOut(address(0), outputAmount, msg.sender);
        return outputAmount;
    }

    function _swapVetherToAsset(uint _x, address _pool) internal returns (uint _y){
        uint _X = mapPoolData[_pool].vether;
        uint _Y = mapPoolData[_pool].asset;
        _y =  calcSwapOutput(_x, _X, _Y);
        uint _fee = calcSwapFee(_x, _X, _Y);
        _updatePoolMetrics(_y, _fee, _pool, false);
        mapPoolData[_pool].vether = mapPoolData[_pool].vether.add(_x);
        mapPoolData[_pool].asset = mapPoolData[_pool].asset.sub(_y);
        emit Swapped(address(0), _pool, _x, 0, _y, _fee, msg.sender);
        return _y;
    }

    function _swapAssetToVether(uint _x, address _pool) internal returns (uint _y){
        uint _X = mapPoolData[_pool].asset;
        uint _Y = mapPoolData[_pool].vether;
        _y =  calcSwapOutput(_x, _X, _Y);
        uint _fee = calcSwapFee(_x, _X, _Y);
        _updatePoolMetrics(_y, _fee, _pool, true);
        mapPoolData[_pool].asset = mapPoolData[_pool].asset.add(_x);
        mapPoolData[_pool].vether = mapPoolData[_pool].vether.sub(_y);
        emit Swapped(address(0), _pool, _x, 0, _y, _fee, msg.sender);
        return _y;
    }

        //==================================================================================//
    // Data Model

    function _incrementPoolBalances(uint _units, uint _vether, uint _asset, address _pool) internal {
        mapPoolData[_pool].poolUnits = mapPoolData[_pool].poolUnits.add(_units);
        mapPoolData[_pool].vether = mapPoolData[_pool].vether.add(_vether);
        mapPoolData[_pool].asset = mapPoolData[_pool].asset.add(_asset); 
        mapPoolData[_pool].vetherStaked = mapPoolData[_pool].vetherStaked.add(_vether);
        mapPoolData[_pool].assetStaked = mapPoolData[_pool].assetStaked.add(_asset); 
    }

    function _decrementPoolBalances(uint _units, uint _vether, uint _asset, address _pool) internal {
        mapPoolData[_pool].poolUnits = mapPoolData[_pool].poolUnits.sub(_units);
        mapPoolData[_pool].vether = mapPoolData[_pool].vether.sub(_vether);
        mapPoolData[_pool].asset = mapPoolData[_pool].asset.sub(_asset); 
        mapPoolData[_pool].vetherStaked = mapPoolData[_pool].vetherStaked.sub(_vether);
        mapPoolData[_pool].assetStaked = mapPoolData[_pool].assetStaked.sub(_asset); 
    }

    function _addDataForMember(address _member, uint _units, uint _vether, uint _asset, address _pool) internal {
        // uint _member = mapMemberID[_member];
        if( mapPoolStakerUnits[_pool][_member] == 0){
            mapPoolStakers[_pool].push(_member);
            mapMemberData[_member].arrayPools.push(_pool);
            mapMemberData[_member].poolCount +=1;
        }
        mapPoolData[_pool].stakerCount += 1;
        mapPoolStakerUnits[_pool][_member] = mapPoolStakerUnits[_pool][_member].add(_units);
        mapMemberData[_member].vetherStaked[_pool] = mapMemberData[_member].vetherStaked[_pool].add(_vether);
        mapMemberData[_member].assetStaked[_pool] = mapMemberData[_member].assetStaked[_pool].add(_asset);
    }

    function _removeDataForMember(address _member, uint _units, address _pool) internal{
        // uint _member = mapMemberID[_member];
        uint _vether = calcShare(_units, mapPoolData[_pool].poolUnits, mapMemberData[_member].vetherStaked[_pool]);
        uint _asset = calcShare(_units, mapPoolData[_pool].poolUnits, mapMemberData[_member].assetStaked[_pool]);
        mapPoolStakerUnits[_pool][_member] = mapPoolStakerUnits[_pool][_member].sub(_units);
        mapMemberData[_member].vetherStaked[_pool] = mapMemberData[_member].vetherStaked[_pool].sub(_vether);
        mapMemberData[_member].assetStaked[_pool] = mapMemberData[_member].assetStaked[_pool].sub(_asset);
        if( mapPoolStakerUnits[_pool][_member] == 0){
            mapPoolData[_pool].stakerCount = mapPoolData[_pool].stakerCount.sub(1);
        }
    }

    function _updatePoolMetrics(uint _tx, uint _fee, address _pool, bool _toVether) internal {
        mapPoolData[_pool].transactionCount += 1;
        uint _avgTx = mapPoolData[_pool].averageTransaction;
        uint _avgFee = mapPoolData[_pool].averageFee;
        if(_toVether){
            mapPoolData[_pool].averageTransaction = (_tx.add(_avgTx).div(2)); 
            mapPoolData[_pool].averageFee = (_fee.add(_avgFee).div(2)); 
        } else {
            uint _txVether = calcValueInVether(_tx, _pool);
            uint _feeVether = calcValueInVether(_fee, _pool);
            mapPoolData[_pool].averageTransaction = (_avgTx.add(_txVether).div(2)); 
            mapPoolData[_pool].averageFee = (_avgFee.add(_feeVether).div(2)); 
        }
    }

    //==================================================================================//
    // Asset Transfer Functions

    function _handleTransferIn(address _asset, uint _amount) internal {
        if(_amount > 0) {
            if(_asset == address(0)){
                require((_amount == msg.value), "Must get Eth");
            } else {
                ERC20(_asset).transferFrom(msg.sender, address(this), _amount); 
            }
        }
    }

    function _handleTransferOut(address _asset, uint _amount, address payable _recipient) internal {
        if(_amount > 0) {
            if (_asset == address(0)) {
                _recipient.call.value(_amount)(""); 
            } else {
                ERC20(_asset).transfer(_recipient, _amount);
            }
        }
    }

    //==================================================================================//
    // Helper functions

    function getStakerUnits(address pool, address staker) public view returns(uint stakerUnits){
         return (mapPoolStakerUnits[pool][staker]);
    }

    function getPoolStaker(address pool, uint index) public view returns(address staker){
            return(mapPoolStakers[pool][index]);
    }

    function getMemberPool(address member, uint index) public view returns(address staker){
        // uint _member = mapMemberID[member];
        return(mapMemberData[member].arrayPools[index]);
    }

   function calcValueInVether(uint amount, address pool) public view returns (uint price){
       uint _asset = mapPoolData[pool].asset;
       uint _vether = mapPoolData[pool].vether;
       return (amount.mul(_vether)).div(_asset);
   }

    function calcValueInAsset(uint amount, address pool) public view returns (uint price){
       uint _asset = mapPoolData[pool].asset;
       uint _vether = mapPoolData[pool].vether;
       return (amount.mul(_asset)).div(_vether);
   }

   function calcAssetPPinVether(uint amount, address pool) public view returns (uint _output){
        uint _asset = mapPoolData[pool].asset;
        uint _vether = mapPoolData[pool].vether;
        return  calcSwapOutput(amount, _asset, _vether);
   }

    function calcVetherPPinAsset(uint amount, address pool) public view returns (uint _output){
        uint _asset = mapPoolData[pool].asset;
        uint _vether = mapPoolData[pool].vether;
        return  calcSwapOutput(amount, _vether, _asset);
   }

   //==================================================================================//
   // Core Math

    function calcPart(uint bp, uint total) public pure returns (uint part){
        // 10,000 basis points = 100.00%
        require((bp <= 10000) && (bp > 0));
        return calcShare(bp, 10000, total);
    }

    function calcShare(uint part, uint total, uint amount) public pure returns (uint share){
        // share = amount * part/total
        return(amount.mul(part)).div(total);
    }

    function  calcSwapOutput(uint x, uint X, uint Y) public pure returns (uint output){
        // y = (x * X * Y )/(x + X)^2
        uint numerator = x.mul(X.mul(Y));
        uint denominator = (x.add(X)).mul(x.add(X));
        return numerator.div(denominator);
    }

    function  calcSwapFee(uint x, uint X, uint Y) public pure returns (uint output){
        // y = (x * x * Y) / (x + X)^2
        uint numerator = x.mul(x.mul(Y));
        uint denominator = (x.add(X)).mul(x.add(X));
        return numerator.div(denominator);
    }

    function calcStakeUnits(uint a, uint A, uint v, uint V) public pure returns (uint units){
        // units = ((V + A) * (v * A + V * a))/(4 * V * A)
        // (part1 * (part2 + part3)) / part4
        uint part1 = V.add(A);
        uint part2 = v.mul(A);
        uint part3 = V.mul(a);
        uint numerator = part1.mul((part2.add(part3)));
        uint part4 = 4 * (V.mul(A));
        return numerator.div(part4);
    }

    function calcAsymmetricShare(uint s, uint T, uint A) public pure returns (uint share){
        // share = (s * A * (2 * T^2 - 2 * T * s + s^2))/T^3
        // (part1 * (part2 - part3 + part4)) / part5
        uint part1 = s.mul(A);
        uint part2 = T.mul(T).mul(2);
        uint part3 = T.mul(s).mul(2);
        uint part4 = s.mul(s);
        uint numerator = part1.mul(part2.sub(part3).add(part4));
        uint part5 = T.mul(T).mul(T);
        return numerator.div(part5);
    }
}
