// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.4;

import "./VPool.sol";

contract VFactory {

    using SafeMath for uint;

    address public VETHER;
    address public MATH;

    mapping(address=>address) private mapToken_Pool;

    constructor (address vether, address math) public payable {
        VETHER = vether;
        MATH = math;
    }

    function deployPool(uint inputVether, uint inputAsset, address token) public payable returns(address payable newPoolAddress){
        require(token != VETHER, "Token must not be Vether");
        require((inputAsset > 0 && inputVether > 0), "Must get both assets for new pool");
        VPool newPool = new VPool(VETHER, token, MATH);
        address newPoolAddr = address(newPool);
        newPoolAddress = address(uint160(newPoolAddr));
        mapToken_Pool[token] = newPoolAddress;
        _createPool(inputVether, inputAsset, token, newPoolAddress);
        return newPoolAddress;
    }

    function _createPool(uint _inputVether, uint _inputAsset, address _token, address payable _pool) internal {
        VPool newPool = VPool(_pool);
        uint _actualInputAsset = _handleTransferIn(_token, _inputAsset);
        uint _actualInputVether = _handleTransferIn(VETHER, _inputVether);
        if(_token == address(0)){
            ERC20(VETHER).approve(_pool, _actualInputVether);
            newPool.stakeForMember{value:_actualInputAsset}(_actualInputVether, _actualInputAsset, msg.sender);
        } else {
            ERC20(_token).approve(_pool, _actualInputAsset);
            ERC20(VETHER).approve(_pool, _actualInputVether);
            newPool.stakeForMember(_actualInputVether, _actualInputAsset, msg.sender);
        }
    }

    function getPoolAddress(address token) public view returns(address pool){
        return mapToken_Pool[token];
    }

    //==================================================================================//
    // Universal Swapping Functions

    function swap(uint inputAmount, address fromAsset, address toAsset) public payable returns (uint outputAmount, uint fee) {
        require(fromAsset != toAsset, "Asset must not be the same");
        address addrFrom = getPoolAddress(fromAsset); address addrTo = getPoolAddress(toAsset);
        VPool fromPool = VPool(addrFrom); VPool toPool = VPool(addrTo);
        uint _actualAmount = _handleTransferIn(fromAsset, inputAmount);
        if(fromAsset == VETHER){
            ERC20(VETHER).approve(addrTo, _actualAmount);                       // Approve pool to spend VETHER
            (outputAmount, fee) = toPool.buyTo(_actualAmount, msg.sender);      // Buy to token
        } else if(toAsset == VETHER) {
            ERC20(fromAsset).approve(addrFrom, _actualAmount);                  // Approve pool to spend token
            (outputAmount, fee) = fromPool.sellTo(_actualAmount, msg.sender);   // Sell to token
        } else {
            ERC20(fromAsset).approve(addrFrom, _actualAmount);                  // Approve pool to spend token
            (uint _yy, uint _feey) = fromPool.sell(_actualAmount);              // Sell to VETHER
            ERC20(VETHER).approve(addrTo, _yy);                                 // Approve pool to spend VETHER
            (uint _zz, uint _feez) = toPool.buyTo(_yy, msg.sender);             // Buy to token
            outputAmount = _zz;
            fee = _feez + toPool.calcValueInAsset(_feey);
        }
        return (outputAmount, fee);
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

}