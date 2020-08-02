/*
################################################
Creates 3 tokens and stakes them
################################################
*/

const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var VETHER = artifacts.require("Vether");
var VETHPOOL = artifacts.require("VetherPools");
var TOKEN1 = artifacts.require("Token1");
var TOKEN2 = artifacts.require("Token2");
var MATH = artifacts.require("MathContract");

var vether; var vetherPools; var token1;  var token2; var coreMath
var acc0; var acc1; var acc2; var acc3;

contract('VETH', function (accounts) {
    constructor(accounts)
    stakeETH(acc0, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100), true, 1)

    // Single swap
    swapVETHToETH(acc0, _.BN2Str(_.one * 10))
    swapETHToVETH(acc0, _.BN2Str(_.one * 1))
    checkROI()

    stakeTKN1(acc0, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100), true, 2)

    // // Double swap
    swapTKN1ToETH(acc0, _.BN2Str(_.one * 10))
    swapETHToTKN1(acc0, _.BN2Str(_.one * 1))
    checkROI()

    stakeTKN2(acc0, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100), true, 3)

    // // // Double swap back
    swapTKN2ToETH(acc0, _.BN2Str(_.one * 10))
    swapETHToTKN2(acc0, _.BN2Str(_.one * 1))
    checkROI()

    unstakeETH(10000, acc0)
    unstakeTKN1(10000, acc0)
    unstakeTKN2(10000, acc0)
})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]

    it("constructor events", async () => {

        vether = await VETHER.new()
        vetherPools = await VETHPOOL.new(vether.address)
        coreMath = await MATH.new()
        await vetherPools.setMath(coreMath.address)
        
        token1 = await TOKEN1.new();
        token2 = await TOKEN1.new();

        const vetherAddr = await vetherPools.VETHER()
        assert.equal(vetherAddr, vether.address, "address is correct")

        const poolCount = await vetherPools.poolCount()
        assert.equal(poolCount, 0)
        // const pool0 = await vetherPools.arrayPools(poolCount)
        // console.log(pool0)
        // assert.equal(pool0, _.ETH)

        let supply = await vether.totalSupply()
        await vether.approve(vetherPools.address, supply, { from: acc0 })
        let allowance = await vether.allowance(acc0, vetherPools.address)
        assert.equal(_.BN2Str(allowance), _.BN2Str(supply), 'allowance is correct')
        await vether.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        await vether.approve(vetherPools.address, supply, { from: acc1 })
        await vether.addExcluded(vetherPools.address, { from: acc1 })
        

        let supplyT1 = await token1.totalSupply()
        await token1.approve(vetherPools.address, supplyT1, { from: acc0 })
        let allowanceT1 = await token1.allowance(acc0, vetherPools.address)
        assert.equal(_.BN2Str(allowanceT1), _.BN2Str(supplyT1), 'allowance is correct')
        await token1.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
        await token1.approve(vetherPools.address, supplyT1, { from: acc1 })

        await token2.approve(vetherPools.address, supplyT1, { from: acc0 })
        let allowanceT2 = await token2.allowance(acc0, vetherPools.address)
        assert.equal(_.BN2Str(allowanceT2), _.BN2Str(supplyT1), 'allowance is correct')
        await token2.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
        await token2.approve(vetherPools.address, supplyT1, { from: acc1 })

        console.log(`Acc0: ${acc0}`)
        console.log(`Acc1: ${acc1}`)
        console.log(`Vether: ${vether.address}`)
        console.log(`Pools: ${vetherPools.address}`)
    });
}


function stakeETH(acc, a, v, first, count) {
    it(`It should stake ETH from ${acc}`, async () => {
        var V; var A;
        let addr = _.ETH
        console.log('addr', addr)
        console.log(`VETH: ${_.BN2Str(await vether.balanceOf(vetherPools.address))}`)
        console.log(`TKN1: ${_.BN2Str(await token1.balanceOf(vetherPools.address))}`)
        console.log(`ETH: ${_.BN2Str(await web3.eth.getBalance(vetherPools.address))}`)
        if(first){
            V = _.getBN(0); 
            A = _.getBN(0);
            stakerCount = 1;
            poolUnits = 0;
        } else {
            V = _.getBN((await vetherPools.poolData(addr)).vether)
            A = _.getBN((await vetherPools.poolData(addr)).asset)
            stakerCount = _.BN2Str((await vetherPools.getPoolStakerCount(addr)))
            poolUnits = _.getBN((await vetherPools.poolData(addr)).poolUnits)
        }
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
        // console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let tx = await vetherPools.stake(v, a, addr, { from: acc, value: a })

        assert.equal((await vetherPools.arrayPools(count-1)), addr, 'pools')
        assert.equal(_.BN2Str((await vetherPools.poolCount())), count, 'poolCount')
        // assert.equal(((await vetherPools.getPoolStaker(addr, stakerCount-1)), acc, 'stakers'))

        // assert.equal(_.BN2Str((await vetherPools.poolData(addr)).vether), V.plus(v))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).asset), A.plus(a))
        // assert.equal(_.BN2Str((await vetherPools.poolData(addr)).vetherStaked), V.plus(v))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).assetStaked), A.plus(a))
        // assert.equal(_.BN2Str((await vetherPools.getPoolStakerCount(addr))), +stakerCount + 1, 'stakerCount')
        // assert.equal(_.BN2Str((await vetherPools.poolData(addr)).poolUnits), units.plus(poolUnits), 'poolUnits')

        assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.plus(v)), 'vether balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.plus(a)), 'ether balance')

        console.log(`VETH: ${_.BN2Str(await vether.balanceOf(vetherPools.address))}`)
        console.log(`TKN1: ${_.BN2Str(await token1.balanceOf(vetherPools.address))}`)
        console.log(`ETH: ${_.BN2Str(await web3.eth.getBalance(vetherPools.address))}`)

        await help.logPool(vetherPools, _.ETH, 'ETH')
    })
}

async function stakeTKN1(acc, a, v, first, count) {
    it(`It should stake TKN1 from ${acc}`, async () => {
        await _stakeTKN(acc, a, v, token1.address, first, count)
        await help.logPool(vetherPools, token1.address, 'TKN1')
    })
}
async function stakeTKN2(acc, a, v, first, count) {
    it(`It should stake TKN2 from ${acc}`, async () => {
        await _stakeTKN(acc, a, v, token2.address, first, count)
        await help.logPool(vetherPools, token2.address, 'TKN2')
    })
}

async function _stakeTKN(acc, a, v, addr, first, count) {
    var V; var A;

        console.log('addr', addr)
        console.log(`VETH: ${_.BN2Str(await vether.balanceOf(vetherPools.address))}`)
        console.log(`TKN1: ${_.BN2Str(await token1.balanceOf(vetherPools.address))}`)
        console.log(`ETH: ${_.BN2Str(await web3.eth.getBalance(vetherPools.address))}`)
        if(first){
            V = _.getBN(0); 
            A = _.getBN(0);
            stakerCount = 0;
            poolUnits = 0;
        } else {
            V = _.getBN((await vetherPools.poolData(addr)).vether)
            A = _.getBN((await vetherPools.poolData(addr)).asset)
            stakerCount = _.BN2Str((await vetherPools.poolData(addr)).stakerCount)
            poolUnits = _.getBN((await vetherPools.poolData(addr)).poolUnits)
        }
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
        // console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let tx = await vetherPools.stake(v, a, addr, { from: acc})

        assert.equal((await vetherPools.arrayPools(count-1)), addr, 'pools')
        assert.equal(_.BN2Str((await vetherPools.poolCount())), count, 'poolCount')
        // assert.equal((await vetherPools.mapPoolStakers(addr, stakerCount)), acc, 'stakers')

        // assert.equal(_.BN2Str((await vetherPools.poolData(addr)).vether), V.plus(v))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).asset), A.plus(a))
        // assert.equal(_.BN2Str((await vetherPools.poolData(addr)).vetherStaked), V.plus(v))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).assetStaked), A.plus(a))
        // assert.equal(_.BN2Str((await vetherPools.poolData(addr)).stakerCount), +stakerCount + 1, 'stakerCount')
        // assert.equal(_.BN2Str((await vetherPools.poolData(addr)).poolUnits), units.plus(poolUnits), 'poolUnits')

        // assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.plus(v)), 'vether balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.plus(a)), 'ether balance')

        console.log(`VETH: ${_.BN2Str(await vether.balanceOf(vetherPools.address))}`)
        console.log(`TKN1: ${_.BN2Str(await token1.balanceOf(vetherPools.address))}`)
        console.log(`ETH: ${_.BN2Str(await web3.eth.getBalance(vetherPools.address))}`)
}


async function swapVETHToETH(acc, v) {

    it(`It should buy ETH with VETH from ${acc}`, async () => {

        const toAsset = _.ETH
        const V = _.getBN((await vetherPools.poolData(toAsset)).vether)
        const A = _.getBN((await vetherPools.poolData(toAsset)).asset)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let a = math.calcSwapOutput(v, V, A)
        let fee = math.calcSwapFee(v, V, A)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await vetherPools.swap(v, vether.address, toAsset)

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(v))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(a))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str((await vetherPools.poolData(toAsset)).asset), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str((await vetherPools.poolData(toAsset)).vether), _.BN2Str(V.plus(v)))

        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.minus(a)), 'ether balance')
        assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.plus(v)), 'vether balance')

        await help.logPool(vetherPools, _.ETH, 'ETH')
    })
}

async function swapETHToVETH(acc, a) {

    it(`It should sell ETH to VETH from ${acc}`, async () => {

        await vether.addExcluded(vetherPools.address, { from: acc1 })

        const withAsset = _.ETH
        const V = _.getBN((await vetherPools.poolData(withAsset)).vether)
        const A = _.getBN((await vetherPools.poolData(withAsset)).asset)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let v = math.calcSwapOutput(a, A, V)
        let fee = math.calcSwapFee(a, A, V)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await vetherPools.swap(a, withAsset, vether.address, { from: acc, value: a })

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(a))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(v))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str((await vetherPools.poolData(withAsset)).asset), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await vetherPools.poolData(withAsset)).vether), _.BN2Str(V.minus(v)))

        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.plus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.minus(v)), 'vether balance')

        await help.logPool(vetherPools, _.ETH, 'ETH')
    })
}

async function swapTKN1ToETH(acc, x) {
    it(`It should buy ETH with TKN1 from ${acc}`, async () => {
        await _swapTKNToETH(acc, x, token1.address)
        await help.logPool(vetherPools, token1.address, 'TKN1')

    })
}

async function swapTKN2ToETH(acc, x) {
    it(`It should buy ETH with TKN2 from ${acc}`, async () => {
        _swapTKNToETH(acc, x, token2.address)
        await help.logPool(vetherPools, token2.address, 'TKN2')

    })
}

async function _swapTKNToETH(acc, x, withAsset) {

    console.log(`VETH: ${_.BN2Str(await vether.balanceOf(vetherPools.address))}`)
    console.log(`TKN1: ${_.BN2Str(await token1.balanceOf(vetherPools.address))}`)
    console.log(`TKN2: ${_.BN2Str(await token2.balanceOf(vetherPools.address))}`)
    console.log(`ETH: ${_.BN2Str(await web3.eth.getBalance(vetherPools.address))}`)

    await help.logPool(vetherPools, token1.address, 'TKN1')
    await help.logPool(vetherPools, _.ETH, 'ETH')

        const toAsset = _.ETH
        const X = _.getBN((await vetherPools.poolData(withAsset)).asset)
        const Y = _.getBN((await vetherPools.poolData(withAsset)).vether)
        const V = _.getBN((await vetherPools.poolData(toAsset)).vether)
        const Z = _.getBN((await vetherPools.poolData(toAsset)).asset)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let y = math.calcSwapOutput(x, X, Y)
        let feey = math.calcSwapFee(x, X, Y)
        let z = math.calcSwapOutput(y, V, Z)
        let feez = math.calcSwapFee(y, V, Z)
        let fee = math.calcValueIn(feey, V.plus(y), Z.minus(z)).plus(feez)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await vetherPools.swap(x, withAsset, toAsset)

        console.log(_.BN2Str(tx.receipt.logs[0].args.inputAmount))
        console.log(_.BN2Str(tx.receipt.logs[0].args.transferAmount))
        console.log(_.BN2Str(tx.receipt.logs[0].args.outputAmount))
        console.log(_.BN2Str(tx.receipt.logs[0].args.fee))

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.transferAmount), _.BN2Str(y))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(z))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))


        assert.equal(_.BN2Str((await vetherPools.poolData(withAsset)).asset), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str((await vetherPools.poolData(withAsset)).vether), _.BN2Str(Y.minus(y)))
        assert.equal(_.BN2Str((await vetherPools.poolData(toAsset)).vether), _.BN2Str(V.plus(y)))
        assert.equal(_.BN2Str((await vetherPools.poolData(toAsset)).asset), _.BN2Str(Z.minus(z)))

        // assert.equal(_.BN2Str(await token1.balanceOf(vetherPools.address)), _.BN2Str(X.plus(x)), 'token1 balance')
        // assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.plus(Y)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(Z.minus(z)), 'ether balance')

        console.log(`VETH: ${_.BN2Str(await vether.balanceOf(vetherPools.address))}`)
        console.log(`TKN1: ${_.BN2Str(await token1.balanceOf(vetherPools.address))}`)
        console.log(`TKN2: ${_.BN2Str(await token2.balanceOf(vetherPools.address))}`)
        console.log(`ETH: ${_.BN2Str(await web3.eth.getBalance(vetherPools.address))}`)

        await help.logPool(vetherPools, token1.address, 'TKN1')
        await help.logPool(vetherPools, _.ETH, 'ETH')
}

async function swapETHToTKN1(acc, x) {
    it(`It should sell ETH with TKN1 from ${acc}`, async () => {
        await _swapETHToTKN(acc, x, token1.address)
        await help.logPool(vetherPools, token1.address, 'TKN1')

    })
}

async function swapETHToTKN2(acc, x) {
    it(`It should sell ETH to TKN2 from ${acc}`, async () => {
        await _swapETHToTKN(acc, x, token2.address)
        await help.logPool(vetherPools, token2.address, 'TKN2')

    })
}

async function _swapETHToTKN(acc, x, toAsset) {

        await vether.addExcluded(vetherPools.address, { from: acc1 })

        const withAsset = _.ETH 
        const X = _.getBN((await vetherPools.poolData(withAsset)).asset)
        const Y = _.getBN((await vetherPools.poolData(withAsset)).vether)
        const V = _.getBN((await vetherPools.poolData(toAsset)).vether)
        const Z = _.getBN((await vetherPools.poolData(toAsset)).asset)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let y = math.calcSwapOutput(x, X, Y)
        let feey = math.calcSwapFee(x, X, Y)
        let z = math.calcSwapOutput(y, V, Z)
        let feez = math.calcSwapFee(y, V, Z)
        let fee = math.calcValueIn(feey, V.plus(y), Z.minus(z)).plus(feez)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await vetherPools.swap(x, withAsset, toAsset, { from: acc, value: x })

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.transferAmount), _.BN2Str(y))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(z))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str((await vetherPools.poolData(withAsset)).asset), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str((await vetherPools.poolData(withAsset)).vether), _.BN2Str(Y.minus(y)))
        assert.equal(_.BN2Str((await vetherPools.poolData(toAsset)).vether), _.BN2Str(V.plus(y)))
        assert.equal(_.BN2Str((await vetherPools.poolData(toAsset)).asset), _.BN2Str(Z.minus(z)))

        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(X.plus(x)), 'ether balance')
        // assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.plus(Y)), 'vether balance')
        // assert.equal(_.BN2Str(await pool.balanceOf(vetherPools.address)), _.BN2Str(Z.minus(z)), 'token1 balance')

        await help.logPool(vetherPools, _.ETH, 'ETH')
}



async function unstakeETH(bp, acc) {

    it(`It should unstake ETH for ${acc}`, async () => {
        const addr = _.ETH
        var V = _.getBN((await vetherPools.poolData(addr)).vether)
        var A = _.getBN((await vetherPools.poolData(addr)).asset)

        // let stakers = _.BN2Str((await vetherPools.poolData(addr)).stakerCount)
        let totalUnits = _.getBN((await vetherPools.poolData(addr)).poolUnits)
        let stakeData = (await vetherPools.getMemberStakeData(acc, addr))
        let stakerUnits = _.getBN(stakeData.stakeUnits)
        let share = (stakerUnits.times(bp)).div(10000)
        let v = (V.times(share)).div(totalUnits)
        let a = (A.times(share)).div(totalUnits)
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        // assert.equal(stakeData.vether, _.BN2Str(v), 'vether')
        // assert.equal(stakeData.asset, _.BN2Str(a), 'asset')
        
        let tx = await vetherPools.unstake(bp, addr, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputVether), _.floorBN(v), 'outputVether')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).poolUnits), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).vether), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).asset), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).vetherStaked), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).assetStaked), _.BN2Str(A.minus(a)))
        // assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.minus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.minus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.minus(v)), 'vether balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakeData2 = (await vetherPools.getMemberStakeData(acc, addr))
        // assert.equal(stakeData.vether, v, 'vether')
        // assert.equal(stakeData.asset, a, 'asset')
        assert.equal(_.BN2Str(stakeData2.stakeUnits), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')

        await help.logPool(vetherPools, _.ETH, 'ETH')
    })
}

async function unstakeTKN1(bp, acc) {

    it(`It should unstake TKN1 for ${acc}`, async () => {
        await _unstakeTKN(bp, acc, token1.address)
        await help.logPool(vetherPools, token1.address, 'TKN1')

    })
}

async function unstakeTKN2(bp, acc) {

    it(`It should unstake TKN2 for ${acc}`, async () => {
        await _unstakeTKN(bp, acc, token2.address)
        await help.logPool(vetherPools, token2.address, 'TKN2')

    })
}

async function _unstakeTKN(bp, acc, addr) {

        var V = _.getBN((await vetherPools.poolData(addr)).vether)
        var A = _.getBN((await vetherPools.poolData(addr)).asset)

        // let stakers = _.BN2Str((await vetherPools.poolData(addr)).stakerCount)
        let totalUnits = _.getBN((await vetherPools.poolData(addr)).poolUnits)
        let stakeData = (await vetherPools.getMemberStakeData(acc, addr))
        let stakerUnits = _.getBN(stakeData.stakeUnits)
        let share = (stakerUnits.times(bp)).div(10000)
        let v = (V.times(share)).div(totalUnits)
        let a = (A.times(share)).div(totalUnits)
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        // assert.equal(stakeData.vether, _.BN2Str(v), 'vether')
        // assert.equal(stakeData.asset, _.BN2Str(a), 'asset')
        
        let tx = await vetherPools.unstake(bp, addr, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputVether), _.floorBN(v), 'outputVether')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).poolUnits), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).vether), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).asset), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).vetherStaked), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).assetStaked), _.BN2Str(A.minus(a)))
        // assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.minus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.minus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.minus(v)), 'vether balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakeData2 = (await vetherPools.getMemberStakeData(acc, addr))
        // assert.equal(stakeData.vether, v, 'vether')
        // assert.equal(stakeData.asset, a, 'asset')
        assert.equal(_.BN2Str(stakeData2.stakeUnits), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
}


async function logETH() {
    it("logs", async () => {
        await help.logPool(vetherPools, _.ETH, 'ETH')
    })
}
function logTKN1() {
    it("logs", async () => {
        await help.logPool(vetherPools, token1.address, 'TKN1')
    })
}function logTKN2() {
    it("logs", async () => {
        await help.logPool(vetherPools, token2.address, 'TKN2')
    })
}

function checkROI() {
    it("checks ROI", async () => {
        let poolROI = await vetherPools.getPoolROI(_.ETH)
        console.log('poolROI', _.BN2Str(poolROI))
        let memberROI0 = await vetherPools.getMemberROI(acc0, _.ETH)
        console.log('memberROI0', _.BN2Str(memberROI0))
        let memberROI1 = await vetherPools.getMemberROI(acc1, _.ETH)
        console.log('memberROI1', _.BN2Str(memberROI1))

        let assetStaked = _.BN2Str((await vetherPools.poolData(_.ETH)).assetStaked)
        console.log('assetStaked', _.BN2Asset(assetStaked))
        let _assetStakedInVether = _.BN2Str((await vetherPools.calcValueInVether(assetStaked, _.ETH)))
        console.log('_assetStakedInVether', _.BN2Asset(_assetStakedInVether))

    })
}

