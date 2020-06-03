

// ERC20 Interface
interface ERC20 {
    function totalSupply() external view returns (uint);
    function balanceOf(address account) external view returns (uint);
    function transfer(address, uint) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint);
    function approve(address, uint) external returns (bool);
    function transferFrom(address, address, uint) external returns (bool);
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

contract VETHERPOOLS {
    using SafeMath for uint;

    address public VETHER;
    uint public _1 = 10**18;

    address[] public arrayPools;
    uint public poolCount;
    mapping(address => address[]) public mapPoolStakers;
    mapping(address => mapping(address => uint)) public mapPoolStakerUnits;
    mapping(address => PoolData) public mapPoolData;
    struct PoolData {
        uint vether;
        uint asset;
        uint vetherStaked;
        uint assetStaked;
        uint stakerCount;
        uint poolUnits;
        uint averageSlip;
        uint averageFee;
        uint averageTransaction;
        uint transactionCount;
    }

    mapping(address => MemberData) public mapMemberData;
    struct MemberData {
        mapping(address => uint256) allowance;
        address[] arrayPools;
        uint poolCount;
        mapping(address => StakeData) stakeData;
    }

    struct StakeData {
        uint vether;
        uint asset;
    }
   
    event Staked(address pool, address member, uint inputAsset, uint inputVether, uint unitsIssued);
    event Unstaked(address pool, address member, uint outputAsset, uint outputVether, uint unitsClaimed);
    event Swapped(address assetFrom, address assetTo, uint inputAmount, uint transferAmount, uint outPutAmount, address recipient);

    constructor (address addressVether) public payable {
        VETHER = addressVether;
        poolCount = 0;
    }

    receive() external payable {
        swapAssetToAsset(msg.value, address(0), VETHER);
    }

    //==================================================================================//
    // Staking functions

    function stake(uint inputVether, uint inputAsset, address pool) public payable returns (uint units) {
        if (mapPoolData[pool].poolUnits == 0) { 
            require((inputAsset > 0 && inputVether > 0), "Must get both assets for new pool");
            _createNewPool(pool);
        }
        _handleTransferIn(inputVether, VETHER);
        _handleTransferIn(inputAsset, pool);
        _stake(inputVether, inputAsset, pool);
        return units;
    }

    function _createNewPool(address _pool) internal {
        arrayPools.push(_pool);
        poolCount += 1;
        mapPoolStakers[_pool].push(msg.sender);
        mapPoolData[_pool].stakerCount += 1;
        mapMemberData[msg.sender].arrayPools.push(_pool);
        mapMemberData[msg.sender].poolCount +=1;
    }

    function stakeWithAsset(uint inputAsset1, address asset1, uint inputAsset2, address pool) public payable returns (uint units){
    if (mapPoolData[pool].poolUnits == 0) { 
            require((inputAsset1 > 0 && inputAsset2 > 0), "Must get both assets for new pool");
            poolCount += 1;
        }
        _handleTransferIn(inputAsset1, asset1);
        _handleTransferIn(inputAsset2, pool);
        uint inputVether;
        if(asset1 != VETHER){
            inputVether = swapAssetToAsset(inputAsset1, asset1, VETHER);
        } else {
            inputVether = inputAsset1;
        }
        units = _stake(inputVether, inputAsset2, pool);
        return units;
    }
 
    function _stake(uint _vether, uint _asset, address _pool) internal returns (uint _units) {
        _incrementPoolBalances(_vether, _asset, _pool);
        _units = calcStakeUnits(_asset, mapPoolData[_pool].asset, _vether, mapPoolData[_pool].vether);                                                     
        _addDataForMember(msg.sender, _units, _pool);
        mapPoolData[_pool].poolUnits += _units;
        emit Staked(_pool, msg.sender, _asset, _vether, _units);
        return _units;
    }

    function _incrementPoolBalances(uint _vether, uint _asset, address _pool) internal {
        mapPoolData[_pool].vether += _vether;
        mapPoolData[_pool].asset += _asset; 
        mapPoolData[_pool].vetherStaked += _vether;
        mapPoolData[_pool].assetStaked += _asset;
    }

    function transferUnits(uint basisPoints, address pool, address recipient) public returns (bool success){
        uint _units = calcPart(basisPoints, mapPoolStakerUnits[pool][msg.sender]);
        transferExactUnits(_units, pool, recipient);
        return true;
    }

    function transferExactUnits(uint units, address pool, address recipient) public returns (bool success){
        require((mapPoolStakerUnits[pool][msg.sender] >= units), "Must own the units");
        _removeDataForMember(units, pool, msg.sender);
        _addDataForMember(recipient, units, pool);
        return true;
    }

    function transferFromUnits(address sender, uint basisPoints, address pool, address recipient) public returns (bool success){
        uint _units = calcPart(basisPoints, mapPoolStakerUnits[pool][sender]);
        transferExactUnits(_units, pool, recipient);
        return true;
    }

    function transferFromExactUnits(address sender, uint units, address pool, address recipient) public returns (bool success){
        require((mapMemberData[sender].allowance[msg.sender] >= units), "Must own the units");
        _removeDataForMember(units, pool, sender);
        _addDataForMember(recipient, units, pool);
        return true;
    }

    function _addDataForMember(address _member, uint _units, address _pool) internal {
        mapPoolStakerUnits[_pool][_member] += _units;
        // mapMemberData[_member].stakeData.vether += _vether;
        // mapMemberData[_member].stakeData.asset += _asset;
    }

    function _removeDataForMember(uint _units, address _pool, address _member) internal{
        mapPoolStakerUnits[_pool][_member] -= _units;
        if( mapPoolStakerUnits[_pool][_member] == 0){
            mapPoolData[_pool].stakerCount -= 1;
        }
        mapPoolStakerUnits[_pool][_member] -= _units;
        // mapMemberData[_member].stakeData.vether -= _vether;
        // mapMemberData[_member].stakeData.asset -= _asset;
    }

    //==================================================================================//
    // Unstaking functions

    function unstake(uint basisPoints, address pool) public returns (bool success) {
        uint _stakerUnits = mapPoolStakerUnits[pool][msg.sender];
        uint _units = calcPart(basisPoints, _stakerUnits);
        unstakeExact(_units, pool);
        return true;
    }

    function unstakeExact(uint units, address pool) public returns (bool success) {
        require(mapPoolStakerUnits[pool][msg.sender] >= units);
        uint _outputVether = calcShare(units, mapPoolData[pool].poolUnits, mapPoolData[pool].vether);
        uint _outputAsset = calcShare(units, mapPoolData[pool].poolUnits, mapPoolData[pool].asset);
        _decrementPoolBalances(_outputVether, _outputAsset, pool);
        _removeDataForMember(units, msg.sender, pool);
        mapPoolData[pool].poolUnits -= units;
        emit Unstaked(pool, msg.sender, _outputAsset, _outputVether, units);
        _handleTransferOut(pool, _outputAsset, msg.sender);
        _handleTransferOut(pool, _outputVether, msg.sender);
        return true;
    }

    function unstakeAsymmetric(uint basisPoints, address pool, bool toVether) public returns (uint outputAmount){
        uint _units = calcPart(basisPoints, mapPoolStakerUnits[pool][msg.sender]);
        outputAmount = unstakeExactAsymmetric(_units, pool, toVether);
        return outputAmount;
    }

    function unstakeToPool(uint basisPoints, address poolFrom, address poolTo) public returns (uint units){
        uint _units = calcPart(basisPoints, mapPoolStakerUnits[poolFrom][msg.sender]);
        units = unstakeExactToPool(_units, poolFrom, poolTo);
        return units;
    }

    function unstakeExactToPool(uint units, address poolFrom, address poolTo) public returns (uint unitsIssued){
        uint _outputAmount = unstakeExactAsymmetric(units, poolFrom, true);
        unitsIssued = stake(_outputAmount, 0, poolTo);
        return units;
    }

    function unstakeExactAsymmetric(uint units, address pool, bool toVether) public returns (uint outputAmount){
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
        _removeDataForMember(units, msg.sender, pool);
        mapPoolData[pool].poolUnits -= units;
        mapPoolData[pool].vether -= _outputVether;
        mapPoolData[pool].asset -= _outputAsset;
        emit Unstaked(pool, msg.sender, _outputAsset, _outputVether, units);
        _handleTransferOut(pool, _outputAsset, msg.sender);
        _handleTransferOut(pool, _outputVether, msg.sender);
        return outputAmount;
    }

    function _decrementPoolBalances(uint _vether, uint _asset, address _pool) internal {
        mapPoolData[_pool].vether -= _vether;
        mapPoolData[_pool].asset -= _asset; 
        mapPoolData[_pool].vetherStaked -= _vether;
        mapPoolData[_pool].assetStaked -= _asset; 
    }

    //==================================================================================//
    // Swapping functions

    function swapAssetToAsset(uint inputAmount, address assetFrom, address assetTo) public payable returns (uint outputAmount) {
        require((inputAmount > 0), "Must get Asset");
        require((assetFrom != assetTo), "Must be different Assets");
        _handleTransferIn(inputAmount, assetFrom);
        outputAmount = _swapAssetToAsset(inputAmount, assetFrom, assetTo);
        _handleTransferOut(assetTo, outputAmount, msg.sender);
        return outputAmount;
    }

    function _swapAssetToAsset(uint _inputAmount, address _assetFrom, address _assetTo) internal returns (uint _outputAmount) { 
        if(_assetFrom == VETHER){
            _outputAmount = _swapVetherToAsset(_inputAmount, _assetTo);
            emit Swapped(_assetFrom, _assetTo, _inputAmount, 0, _outputAmount, msg.sender);  
        }
        if(_assetTo == VETHER){
            _outputAmount = _swapAssetToVether(_inputAmount, _assetFrom);
            emit Swapped(_assetFrom, _assetTo, _inputAmount, 0, _outputAmount, msg.sender);
        }
        if(_assetFrom != VETHER || _assetTo != VETHER){
            uint _transferAmount = _swapAssetToVether(_inputAmount, _assetFrom);
            _outputAmount = _swapVetherToAsset(_transferAmount, _assetTo);
            emit Swapped(_assetFrom, _assetTo, _inputAmount, _transferAmount, _outputAmount, msg.sender);
        }  
        return _outputAmount; 
    }

    function _swapVetherToAsset(uint _x, address _pool) internal returns (uint _y){
        uint _X = mapPoolData[_pool].vether;
        uint _Y = mapPoolData[_pool].asset;
        _y =  calcSwapOutput(_x, _X, _Y);
        uint _fee = calcSwapFee(_x, _X, _Y);
        _updatePoolMetrics(_y, _fee, _pool, false);
        mapPoolData[_pool].vether += _x;
        mapPoolData[_pool].asset -= _y;
        return _y;
    }

    function _swapAssetToVether(uint _x, address _pool) internal returns (uint _y){
        uint _X = mapPoolData[_pool].asset;
        uint _Y = mapPoolData[_pool].vether;
        _y =  calcSwapOutput(_x, _X, _Y);
        uint _fee = calcSwapFee(_x, _X, _Y);
        _updatePoolMetrics(_y, _fee, _pool, true);
        mapPoolData[_pool].asset += _x;
        mapPoolData[_pool].vether -= _y;
        return _y;
    }

    function _updatePoolMetrics(uint _tx, uint _fee, address _pool, bool _toVether) internal {
        mapPoolData[_pool].transactionCount += 1;
        uint _avgTx = mapPoolData[_pool].averageTransaction;
        uint _avgFee = mapPoolData[_pool].averageFee;
        if(_toVether){
            mapPoolData[_pool].averageTransaction = (_avgTx.add(_tx).div(2)); 
            mapPoolData[_pool].averageFee = (_avgFee.add(_fee).div(2)); 
        } else {
            uint _txVether = calcValueInVether(_tx, _pool);
            uint _feeVether = calcValueInVether(_fee, _pool);
            mapPoolData[_pool].averageTransaction = (_avgTx.add(_txVether).div(2)); 
            mapPoolData[_pool].averageFee = (_avgFee.add(_feeVether).div(2)); 
        }
    }

    //==================================================================================//
    // Asset Transfer Functions

    function _handleTransferIn(uint _amount, address _pool) internal {
        if(_pool == address(0)){
            require((_amount == msg.value), "Must get Eth");
        } else if (_pool == VETHER){
            ERC20(VETHER).transferFrom(msg.sender, address(this), _amount); 
        } else {
            ERC20(_pool).transferFrom(msg.sender, address(this), _amount); 
        }
    }

    function _handleTransferOut(address _pool, uint _amount, address payable _recipient) internal {
        if (_pool == address(0)) {
            _recipient.transfer(_amount);
        } else if (_pool == VETHER) {
            ERC20(VETHER).transfer(_recipient, _amount);
        } else {
            ERC20(_pool).transfer(_recipient, _amount);
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

   //##############################################
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
        // y = (x * Y * X)/(x + X)^2
        uint numerator = x.mul(Y.mul(X));
        uint denominator = (x.add(X)).mul(x.add(X));
        return numerator.div(denominator);
    }

    function  calcSwapFee(uint x, uint X, uint Y) public pure returns (uint output){
        // y = (x * Y * x) / (x + X)^2
        uint numerator = x.mul(Y.mul(x));
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
