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
var VFACTORY = artifacts.require("./VFactory.sol");
var VPOOL = artifacts.require("./VPool.sol");
var TOKEN1 = artifacts.require("Token1");
var TOKEN2 = artifacts.require("Token2");
var MATH = artifacts.require("MathContract");

var vether; var token1;  var token2; var coreMath; var vFactory;
var vetherPools; var vetherPools1; var vetherPools2;
var acc0; var acc1; var acc2; var acc3;

contract('VETH', function (accounts) {
    constructor(accounts)
    deployPools()

    stakeETH(acc1, _.BN2Str(_.one * 10), _.dot1BN)

    // Single swap
    swapVETHToETH(acc0, _.BN2Str(_.one * 10))
    swapETHToVETH(acc0, _.BN2Str(_.one * 1))

    stakeTKN1(acc1, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100))

    // // Double swap
    swapTKN1ToETH(acc0, _.BN2Str(_.one * 10))
    swapETHToTKN1(acc0, _.BN2Str(_.one * 1))

    stakeTKN2(acc1, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100))

    // // // Double swap back
    swapTKN2ToETH(acc0, _.BN2Str(_.one * 10))
    swapETHToTKN2(acc0, _.BN2Str(_.one * 1))

    unstakeETH(10000, acc0)
    unstakeTKN1(10000, acc1)
    unstakeTKN2(10000, acc1)
})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        vether = await VETHER.new()
        coreMath = await MATH.new()
        token1 = await TOKEN1.new();
        token2 = await TOKEN1.new();
        vFactory = await VFACTORY.new(vether.address, coreMath.address)

        console.log(`Acc0: ${acc0}`)
        console.log(`vFactory: ${vFactory.address}`)
        console.log(`vether: ${vether.address}`)
        console.log(`token1: ${token1.address}`)
        console.log(`coreMath: ${coreMath.address}`)

        let supply = await vether.totalSupply()
        await vether.approve(vFactory.address, supply, { from: acc0 })
        await vether.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        let supplyT1 = await token1.totalSupply()
        await token1.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
        await token2.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
        await token1.approve(vFactory.address, supply, { from: acc0 })
        await token1.approve(vFactory.address, supply, { from: acc1 })
        await token2.approve(vFactory.address, supply, { from: acc0 })
        await token2.approve(vFactory.address, supply, { from: acc1 })
    });
}

async function deployPools() {
    it("It should deploy Eth Pool", async () => {
        var POOL = await vFactory.deployPool.call(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        await vFactory.deployPool(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        vetherPools = await VPOOL.at(POOL)
        console.log(`Pools: ${vetherPools.address}`)
        const vetherAddr = await vetherPools.VETHER()
        assert.equal(vetherAddr, vether.address, "address is correct")

        let supply = await vether.totalSupply()
        await vether.approve(vetherPools.address, supply, { from: acc0 })
        await vether.approve(vetherPools.address, supply, { from: acc1 })
        await vether.addExcluded(vetherPools.address, { from: acc1 })
    })

    it("It should deploy TKN1 Pools", async () => {

        await token1.approve(vFactory.address, '-1', { from: acc0 })
        var POOL = await vFactory.deployPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        await vFactory.deployPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        vetherPools1 = await VPOOL.at(POOL)
        console.log(`Pools1: ${vetherPools1.address}`)
        const vetherAddr = await vetherPools1.VETHER()
        assert.equal(vetherAddr, vether.address, "address is correct")

        await vether.approve(vetherPools1.address, '-1', { from: acc0 })
        await vether.approve(vetherPools1.address, '-1', { from: acc1 })
        await token1.approve(vetherPools1.address, '-1', { from: acc0 })
        await token1.approve(vetherPools1.address, '-1', { from: acc1 })
        await vether.addExcluded(vetherPools1.address, { from: acc1 })
    })
    it("It should deploy TKN2 Pools", async () => {

        await token2.approve(vFactory.address, '-1', { from: acc0 })
        var POOL = await vFactory.deployPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        await vFactory.deployPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        vetherPools2 = await VPOOL.at(POOL)
        console.log(`Pools2: ${vetherPools2.address}`)
        const vetherAddr = await vetherPools2.VETHER()
        assert.equal(vetherAddr, vether.address, "address is correct")

        await vether.approve(vetherPools2.address, '-1', { from: acc0 })
        await vether.approve(vetherPools2.address, '-1', { from: acc1 })
        await token2.approve(vetherPools2.address, '-1', { from: acc0 })
        await token2.approve(vetherPools2.address, '-1', { from: acc1 })
        await vether.addExcluded(vetherPools2.address, { from: acc1 })
    })
}

async function stakeETH(acc, v, a) {

    it(`It should stake ETH from ${acc}`, async () => {

        var V = _.getBN((await vetherPools.poolData()).vether)
        var A = _.getBN((await vetherPools.poolData()).asset)
        poolUnits = _.getBN((await vetherPools.totalSupply()))
        console.log('start data', _.BN2Str(V), _.BN2Str(A), _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
        console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let tx = await vetherPools.stake(v, a, { from: acc, value: a })

        assert.equal(_.BN2Str((await vetherPools.poolData()).vether), _.BN2Str(V.plus(v)))
        assert.equal(_.BN2Str((await vetherPools.poolData()).asset), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await vetherPools.poolData()).vetherStaked), _.BN2Str(V.plus(v)))
        assert.equal(_.BN2Str((await vetherPools.poolData()).assetStaked), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await vetherPools.totalSupply())), _.BN2Str(units.plus(poolUnits)), 'poolUnits')
        assert.equal(_.BN2Str(await vetherPools.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.plus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.plus(a)), 'ether balance')

        let stakeData = (await vetherPools.getMemberData(acc))
        assert.equal(stakeData.vether, v, 'vether')
        assert.equal(stakeData.asset, a, 'asset')

        // assert.equal(_.BN2Str(await vetherPools.allowance(acc, vetherPools.address)), _.BN2Str(units), 'units')

        const assetBal = _.BN2Asset(await web3.eth.getBalance(vetherPools.address));
        const vetherBal = _.BN2Asset(await vether.balanceOf(vetherPools.address));
        console.log(`BALANCES: [ ${assetBal} ETH | ${vetherBal} VETH ]`)
    })
}

async function stakeTKN1(acc, a, v) {
    it(`It should stake TKN1 from ${acc}`, async () => {
        await _stakeTKN(acc, a, v, token1, vetherPools1)
        await help.logPool(vetherPools1, token1.address, 'TKN1')
    })
}
async function stakeTKN2(acc, a, v) {
    it(`It should stake TKN2 from ${acc}`, async () => {
        await _stakeTKN(acc, a, v, token2, vetherPools2)
        await help.logPool(vetherPools2, token2.address, 'TKN2')
    })
}

async function _stakeTKN(acc, a, v, token, pools) {
    var V = _.getBN((await pools.poolData()).vether)
    var A = _.getBN((await pools.poolData()).asset)
    poolUnits = _.getBN((await pools.totalSupply()))
    console.log('start data', _.BN2Str(V), _.BN2Str(A), _.BN2Str(poolUnits))

    let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
    console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
    
    let tx = await pools.stake(v, a, {from: acc})
    // console.log(tx.receipt.logs)
    assert.equal(_.BN2Str((await pools.poolData()).vether), _.BN2Str(V.plus(v)))
    assert.equal(_.BN2Str((await pools.poolData()).asset), _.BN2Str(A.plus(a)))
    assert.equal(_.BN2Str((await pools.poolData()).vetherStaked), _.BN2Str(V.plus(v)))
    assert.equal(_.BN2Str((await pools.poolData()).assetStaked), _.BN2Str(A.plus(a)))
    assert.equal(_.BN2Str((await pools.totalSupply())), _.BN2Str(units.plus(poolUnits)), 'poolUnits')
    assert.equal(_.BN2Str(await pools.balanceOf(acc)), _.BN2Str(units), 'units')
    assert.equal(_.BN2Str(await vether.balanceOf(pools.address)), _.BN2Str(V.plus(v)), 'vether balance')
    assert.equal(_.BN2Str(await token.balanceOf(pools.address)), _.BN2Str(A.plus(a)), 'ether balance')

    let stakeData = (await pools.getMemberData(acc))
    assert.equal(stakeData.vether, v, 'vether')
    assert.equal(stakeData.asset, a, 'asset')
}


async function swapVETHToETH(acc, v) {

    it(`It should buy ETH with VETH from ${acc}`, async () => {

        const V = _.getBN((await vetherPools.poolData()).vether)
        const A = _.getBN((await vetherPools.poolData()).asset)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let a = math.calcSwapOutput(v, V, A)
        let fee = math.calcSwapFee(v, V, A)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await vetherPools.buy(v)

        assert.equal(_.BN2Str(tx.receipt.logs[1].args.inputAmount), _.BN2Str(v))
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputAmount), _.BN2Str(a))
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str((await vetherPools.poolData()).asset), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str((await vetherPools.poolData()).vether), _.BN2Str(V.plus(v)))

        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.minus(a)), 'ether balance')
        assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.plus(v)), 'vether balance')

        await help.logPool(vetherPools, _.ETH, 'ETH')
    })
}

async function swapETHToVETH(acc, a) {

    it(`It should sell ETH to VETH from ${acc}`, async () => {

        await vether.addExcluded(vetherPools.address, { from: acc1 })

        const V = _.getBN((await vetherPools.poolData()).vether)
        const A = _.getBN((await vetherPools.poolData()).asset)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let v = math.calcSwapOutput(a, A, V)
        let fee = math.calcSwapFee(a, A, V)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await vetherPools.sell(a, { from: acc, value: a })

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(a))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(v))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str((await vetherPools.poolData()).asset), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await vetherPools.poolData()).vether), _.BN2Str(V.minus(v)))

        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.plus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.minus(v)), 'vether balance')

        await help.logPool(vetherPools, _.ETH, 'ETH')
    })
}

async function swapTKN1ToETH(acc, x) {
    it(`It should swap TKN1 to ETH from ${acc}`, async () => {
        await _swapTKNToETH(acc, x, token1, vetherPools1)
        await help.logPool(vetherPools1, token1.address, 'TKN1')
    })
}

async function swapTKN2ToETH(acc, x) {
    it(`It should swap TKN2 to ETH from ${acc}`, async () => {
        await _swapTKNToETH(acc, x, token2, vetherPools2)
        await help.logPool(vetherPools2, token2.address, 'TKN2')

    })
}

async function _swapTKNToETH(acc, x, token, pools) {

        const toAsset = _.ETH
        const X = _.getBN((await pools.poolData()).asset)
        const Y = _.getBN((await pools.poolData()).vether)
        const V = _.getBN((await vetherPools.poolData()).vether)
        const Z = _.getBN((await vetherPools.poolData()).asset)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let y = math.calcSwapOutput(x, X, Y)
        let feey = math.calcSwapFee(x, X, Y)
        let z = math.calcSwapOutput(y, V, Z)
        let feez = math.calcSwapFee(y, V, Z)
        let fee = math.calcValueIn(feey, V.plus(y), Z.minus(z)).plus(feez)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await pools.swap(x, toAsset)
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.inputAmount), _.BN2Str(x))
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.transferAmount), _.BN2Str(0))
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputAmount), _.BN2Str(y))
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.fee), _.BN2Str(feey))
        assert.equal(_.BN2Str(tx.receipt.logs[4].args.inputAmount), _.BN2Str(y))
        assert.equal(_.BN2Str(tx.receipt.logs[4].args.transferAmount), _.BN2Str(0))
        assert.equal(_.BN2Str(tx.receipt.logs[4].args.outputAmount), _.BN2Str(z))
        assert.equal(_.BN2Str(tx.receipt.logs[4].args.fee), _.BN2Str(feez))

        assert.equal(_.BN2Str((await pools.poolData()).asset), _.BN2Str(X.plus(x)))
        assert.equal(_.BN2Str((await pools.poolData()).vether), _.BN2Str(Y.minus(y)))
        assert.equal(_.BN2Str((await vetherPools.poolData()).vether), _.BN2Str(V.plus(y)))
        assert.equal(_.BN2Str((await vetherPools.poolData()).asset), _.BN2Str(Z.minus(z)))

        assert.equal(_.BN2Str(await token.balanceOf(pools.address)), _.BN2Str(X.plus(x)), 'token1 balance')
        assert.equal(_.BN2Str(await vether.balanceOf(pools.address)), _.BN2Str(Y.minus(y)), 'vether balance')
        assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.plus(y)), 'vether balance eth')
        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(Z.minus(z)), 'ether balance')

        await help.logPool(pools, token.address, 'TKN1')
        await help.logPool(pools, _.ETH, 'ETH')
}

async function swapETHToTKN1(acc, x) {
    it(`It should sell ETH with TKN1 from ${acc}`, async () => {
        await _swapETHToTKN(acc, x, token1, vetherPools1)
        await help.logPool(vetherPools1, token1.address, 'TKN1')
    })
}

async function swapETHToTKN2(acc, x) {
    it(`It should sell ETH to TKN2 from ${acc}`, async () => {
        await _swapETHToTKN(acc, x, token1, vetherPools1)
        await help.logPool(vetherPools2, token2.address, 'TKN2')

    })
}

async function _swapETHToTKN(acc, x, token, pools) {

    const X = _.getBN((await vetherPools.poolData()).asset)
    const Y = _.getBN((await vetherPools.poolData()).vether)
    const V = _.getBN((await pools.poolData()).vether)
    const Z = _.getBN((await pools.poolData()).asset)
    // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

    let y = math.calcSwapOutput(x, X, Y)
    let feey = math.calcSwapFee(x, X, Y)
    let z = math.calcSwapOutput(y, V, Z)
    let feez = math.calcSwapFee(y, V, Z)
    let fee = math.calcValueIn(feey, V.plus(y), Z.minus(z)).plus(feez)
    // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
    
    let tx = await vetherPools.swap(x, token.address, {from:acc, value: x})

    assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.transferAmount), _.BN2Str(0))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(y))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(feey))
    assert.equal(_.BN2Str(tx.receipt.logs[3].args.inputAmount), _.BN2Str(y))
    assert.equal(_.BN2Str(tx.receipt.logs[3].args.transferAmount), _.BN2Str(0))
    assert.equal(_.BN2Str(tx.receipt.logs[3].args.outputAmount), _.BN2Str(z))
    assert.equal(_.BN2Str(tx.receipt.logs[3].args.fee), _.BN2Str(feez))

    assert.equal(_.BN2Str((await vetherPools.poolData()).asset), _.BN2Str(X.plus(x)))
    assert.equal(_.BN2Str((await vetherPools.poolData()).vether), _.BN2Str(Y.minus(y)))
    assert.equal(_.BN2Str((await pools.poolData()).vether), _.BN2Str(V.plus(y)))
    assert.equal(_.BN2Str((await pools.poolData()).asset), _.BN2Str(Z.minus(z)))

    assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(X.plus(x)), 'token1 balance')
    assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(Y.minus(y)), 'vether balance')
    assert.equal(_.BN2Str(await vether.balanceOf(pools.address)), _.BN2Str(V.plus(y)), 'vether balance eth')
    assert.equal(_.BN2Str(await token.balanceOf(pools.address)), _.BN2Str(Z.minus(z)), 'ether balance')

    await help.logPool(pools, token.address, 'TKN1')
    await help.logPool(vetherPools, _.ETH, 'ETH')
}



async function unstakeETH(bp, acc) {

    it(`It should unstake ETH for ${acc}`, async () => {
        let poolROI = await vetherPools.getPoolROI()
        console.log('poolROI-ETH', _.BN2Str(poolROI))
        let poolAge = await vetherPools.getPoolAge()
        console.log('poolAge-ETH', _.BN2Str(poolAge))
        let poolAPY = await vetherPools.getPoolAPY()
        console.log('poolAPY-ETH', _.BN2Str(poolAPY))
        let memberROI0 = await vetherPools.getMemberROI(acc0)
        console.log('memberROI0', _.BN2Str(memberROI0))
        let memberROI1 = await vetherPools.getMemberROI(acc1)
        console.log('memberROI1', _.BN2Str(memberROI1))

        var V = _.getBN((await vetherPools.poolData()).vether)
        var A = _.getBN((await vetherPools.poolData()).asset)

        let totalUnits = _.getBN((await vetherPools.totalSupply()))
        let stakerUnits = _.getBN(await vetherPools.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)
        let v = _.floorBN((V.times(share)).div(totalUnits))
        let a = _.floorBN((A.times(share)).div(totalUnits))
        // let vs = (await vetherPools.poolData()).vetherStaked
        // let as = (await vetherPools.poolData()).assetStaked
        // let vsShare = _.floorBN((V.times(share)).div(totalUnits))
        // let asShare = _.floorBN((A.times(share)).div(totalUnits))
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        let tx = await vetherPools.unstake(bp, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputVether), _.BN2Str(v), 'outputVether')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await vetherPools.totalSupply())), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await vetherPools.poolData()).vether), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await vetherPools.poolData()).asset), _.BN2Str(A.minus(a)))
        // assert.equal(_.BN2Str((await vetherPools.poolData()).vetherStaked), _.BN2Str(V.minus(v)))
        // assert.equal(_.BN2Str((await vetherPools.poolData()).assetStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.minus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakerUnits2 = _.getBN(await vetherPools.balanceOf(acc))
        assert.equal(_.BN2Str(stakerUnits2), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
    })
}

async function unstakeTKN1(bp, acc) {

    it(`It should unstake TKN1 for ${acc}`, async () => {
        let poolROI = await vetherPools1.getPoolROI()
        console.log('poolROI-TKN1', _.BN2Str(poolROI))
        let memberROI0 = await vetherPools1.getMemberROI(acc0)
        console.log('memberROI0', _.BN2Str(memberROI0))
        let memberROI1 = await vetherPools1.getMemberROI(acc1)
        console.log('memberROI1', _.BN2Str(memberROI1))

        await _unstakeTKN(bp, acc, vetherPools1, token1)
        await help.logPool(vetherPools1, token1.address, 'TKN1')

    })
}

async function unstakeTKN2(bp, acc) {

    it(`It should unstake TKN2 for ${acc}`, async () => {
        let poolROI = await vetherPools2.getPoolROI()
        console.log('poolROI-TKN2', _.BN2Str(poolROI))
        let memberROI0 = await vetherPools2.getMemberROI(acc0)
        console.log('memberROI0', _.BN2Str(memberROI0))
        let memberROI1 = await vetherPools2.getMemberROI(acc1)
        console.log('memberROI1', _.BN2Str(memberROI1))

        await _unstakeTKN(bp, acc, vetherPools2, token2)
        await help.logPool(vetherPools2, token2.address, 'TKN2')

    })
}

async function _unstakeTKN(bp, acc, pools, token) {

        var V = _.getBN((await pools.poolData()).vether)
        var A = _.getBN((await pools.poolData()).asset)

        let totalUnits = _.getBN((await pools.totalSupply()))
        let stakerUnits = _.getBN(await pools.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)
        let v = _.floorBN((V.times(share)).div(totalUnits))
        let a = _.floorBN((A.times(share)).div(totalUnits))
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        let tx = await pools.unstake(bp, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputVether), _.BN2Str(v), 'outputVether')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await pools.totalSupply())), _.BN2Str(totalUnits.minus(share)), 'poolUnits')

        assert.equal(_.BN2Str((await pools.poolData()).vether), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await pools.poolData()).asset), _.BN2Str(A.minus(a)))
        // assert.equal(_.BN2Str((await pools.poolData()).vetherStaked), _.BN2Str(V.minus(v)))
        // assert.equal(_.BN2Str((await pools.poolData()).assetStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await vether.balanceOf(pools.address)), _.BN2Str(V.minus(v)), 'vether balance')
        assert.equal(_.BN2Str(await token.balanceOf(pools.address)), _.BN2Str(A.minus(a)), 'asset balance')

        let stakerUnits2 = _.getBN(await pools.balanceOf(acc))
        assert.equal(_.BN2Str(stakerUnits2), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
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
        console.log('assetStakedInVether', _.BN2Asset(_assetStakedInVether))
    })
}

