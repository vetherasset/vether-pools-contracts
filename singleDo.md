do(pool, aIn, vIn, aOut, vOut)

stake: do(pool, 10, 10, 0, 0)
asymmStake: do(pool, 0, 10, 0, 0)
stake&Swap: do(pool, 10, 10, 0, 5)
swap: do(pool, 10, 0, 0, 10)
withdraw: do(pool, 0, 0, 10, 10)
asymmWithdraw: do(pool, 0, 0, 0, 20)
partialAsymmWithdraw: do(pool, 0, 0, 5, 15)
partialWithdraw: do(pool, 0, 0, 5, 5)

function do(address pool, uint assetIn, uint vetherIn, uint assetOut, uint vetherOut) public {
        // Firstly add liquidity
        _addLiquidity(pool, assetIn, vetherIn);

        // Then get staking units
        uint _stakerUnits = mapAsset_ExchangeData[asset].stakerUnits[msg.sender];
        uint _total = mapAsset_ExchangeData[_asset].poolUnits;

        // Check that total claim doesn't exceed ownership
        require(assetOut.add(vetherOut) <= _stakerUnits.mul(2), "Must be less than double");

        // Remove assets from each side
        uint outputAsset = _removeLiquidityForSide(getUnits(assetOut, _stakerUnits));
        uint outputVether = _removeLiquidityForSide(getUnits(vetherOut, _stakerUnits));
        
        // Get latest balances
        uint _balanceVETH = mapAsset_ExchangeData[_asset].balanceVETH;
        uint _balanceAsset = mapAsset_ExchangeData[_asset].balanceAsset;

        if(vetherOut > _stakerUnits) {              // Process asymm withdrawal
            // Get amount of asset to swap
            uint assetToSwap = getShare(_stakerUnits.sub(assetOut), _total, _balanceAsset)
            // Swap to vether
            _swapAssetToVETH(pool, assetToSwap)
        } else if (assetOut > _stakerUnits) {
            // get amount of vether
            uint vetherToSwap = getShare(_stakerUnits.sub(vetherOut), _total, _balanceVETH)
            // swap to asset
            _swapVetherToAsset(pool, vetherToSwap)
        }
    }

    function getUnits(uint inputUnits, uint stakerUnits) public returns (uint units){
        if(inputUnits = stakerUnits){
            return inputUnits
        } else {
            return inputUnits.mod(stakerUnits)
        }
    }

    function removeLiquidityAsymmetric(address asset, uint unitsVether, uint unitsAsset) public returns (bool success){
        uint _stakerUnits = mapAsset_ExchangeData[asset].stakerUnits[msg.sender]
        uint _total = mapAsset_ExchangeData[_asset].poolUnits;
        uint _balanceVETH = mapAsset_ExchangeData[_asset].balanceVETH;
        uint _balanceAsset = mapAsset_ExchangeData[_asset].balanceAsset;
        uint _outputVETH; uint _outputAsset; 
        if(toVether){
            _outputVETH = getAsymmetricShare(_stakerUnits, _total, _balanceVETH);
            _outputAsset = 0;
        } else {
            _outputVETH = 0;
            _outputAsset = getAsymmetricShare(_stakerUnits, _total, _balanceAsset);
        }
        _handleTransferOut(asset, _outputVETH, _outputAsset, msg.sender)
        return true;
    }




