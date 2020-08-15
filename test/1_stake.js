/*
################################################
Stakes and unstakes ETH
################################################
*/

const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var VETHER = artifacts.require("./Vether.sol");
var VFACTORY = artifacts.require("./VFactory.sol");
var VPOOL = artifacts.require("./VPool.sol");
var MATH = artifacts.require("MathContract");
var TOKEN1 = artifacts.require("./Token1.sol");
var TOKEN2 = artifacts.require("./Token2.sol");

var vether; var vetherPools;  var coreMath; var token1; var token2;
var vPool; var vFactory;
var acc0; var acc1; var acc2; var acc3;

contract('VETH', function (accounts) {

    constructor(accounts)
    deployPool()
    logStaker(acc0)
    stakeFail()

    stakeETH(acc1, _.BN2Str(_.one * 10), _.dot1BN)
    logETH()
    logStaker(acc1)
    unstakeETH(10000, acc1)
    logETH()
    logStaker(acc1)
    unstakeETH(10000, acc0)
    logETH()
    logStaker(acc0)

    stakeETH(acc0, _.BN2Str(_.one * 10), _.dot1BN)
    stakeETH(acc1, _.BN2Str(_.one * 10), _.dot1BN)
    logETH()
    unstakeFailStart()

    unstakeAsym(5000, acc1, false)
    logETH()
    unstakeExactAsym(10000, acc1, true)
    logETH()


    unstakeFailExactAsym(10000, acc0, true)
    unstakeETH(5000, acc0)
    logETH()
    unstakeETH(10000, acc0)
    logETH()

    unstakeFailEnd(acc0)

    // stakeToken1(_.BN2Str(_.one * 10), _.BN2Str(_.one * 10))
    // logT1()
    //stakeWithAsset

    // stakeTKN1(acc0, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100), true, 2)
    // logTKN1()
    // stakeTKN2(acc0, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100), true, 3)
    // logTKN2()

    // unstakeTKN1(10000, acc0)
    // logTKN1()
    // unstakeTKN2(10000, acc0)
    // logTKN2()


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
    });
}

async function deployPool() {
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
}


async function stakeFail() {
    it("It should revert with no ETH value", async () => {
        var tx1 = await truffleAssert.reverts(vetherPools.stake(_.BN2Str(_.one * 100), _.BN2Str(_.one)));
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

async function stakeTKN1(acc, a, v, first, count) {
    it(`It should stake TKN1 from ${acc}`, async () => {
        _stakeTKN(acc, a, v, token1.address, first, count)
    })
}
async function stakeTKN2(acc, a, v, first, count) {
    it(`It should stake TKN2 from ${acc}`, async () => {
        _stakeTKN(acc, a, v, token2.address, first, count)
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
            V = _.getBN((await vetherPools.poolData()).vether)
            A = _.getBN((await vetherPools.poolData()).asset)
            stakerCount = _.BN2Str((await vetherPools.poolData()).stakerCount)
            poolUnits = _.getBN((await vetherPools.poolData()).poolUnits)
        }
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
        // console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let tx = await vetherPools.stake(v, a, { from: acc})

        // assert.equal(_.BN2Str((await vetherPools.poolData()).vether), V.plus(v))
        assert.equal(_.BN2Str((await vetherPools.poolData()).asset), A.plus(a))
        // assert.equal(_.BN2Str((await vetherPools.poolData()).vetherStaked), V.plus(v))
        assert.equal(_.BN2Str((await vetherPools.poolData()).assetStaked), A.plus(a))
        // assert.equal(_.BN2Str((await vetherPools.poolData()).stakerCount), +stakerCount + 1, 'stakerCount')
        // assert.equal(_.BN2Str((await vetherPools.poolData()).poolUnits), units.plus(poolUnits), 'poolUnits')

        // assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.plus(v)), 'vether balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.plus(a)), 'ether balance')

        console.log(`VETH: ${_.BN2Str(await vether.balanceOf(vetherPools.address))}`)
        console.log(`TKN1: ${_.BN2Str(await token1.balanceOf(vetherPools.address))}`)
        console.log(`ETH: ${_.BN2Str(await web3.eth.getBalance(vetherPools.address))}`)
}

async function unstakeETH(bp, acc) {

    it(`It should unstake ETH for ${acc}`, async () => {
        var V = _.getBN((await vetherPools.poolData()).vether)
        var A = _.getBN((await vetherPools.poolData()).asset)

        let totalUnits = _.getBN((await vetherPools.totalSupply()))
        let stakeData = (await vetherPools.getMemberData(acc))
        let stakerUnits = _.getBN(await vetherPools.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)
        let v = _.floorBN((V.times(share)).div(totalUnits))
        let a = _.floorBN((A.times(share)).div(totalUnits))
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        let tx = await vetherPools.unstake(bp, { from: acc})
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputVether), _.BN2Str(_.floorBN(v)), 'outputVether')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputAsset), _.BN2Str(_.floorBN(a)), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await vetherPools.totalSupply())), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await vetherPools.poolData()).vether), _.BN2Int(V.minus(v)))
        assert.equal(_.BN2Str((await vetherPools.poolData()).asset), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str((await vetherPools.poolData()).vetherStaked), _.BN2Int(V.minus(v)))
        assert.equal(_.BN2Str((await vetherPools.poolData()).assetStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Int(V.minus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakeData2 = (await vetherPools.getMemberData(acc))
        // assert.equal(stakeData2.vether, v, '0')
        // assert.equal(stakeData2.asset, a, '0')
        assert.equal(_.BN2Str(await vetherPools.balanceOf(acc)), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
    })
}

async function unstakeAsym(bp, acc, toVeth) {

    it(`It should assym unstake from ${acc}`, async () => {
        var V = _.getBN((await vetherPools.poolData()).vether)
        var A = _.getBN((await vetherPools.poolData()).asset)

        let totalUnits = _.getBN((await vetherPools.totalSupply()))
        let stakerUnits = _.getBN(await vetherPools.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)

        let a; let v;
        if(toVeth){
            a = 0
            v = math.calcAsymmetricShare(share, totalUnits, V)
        } else {
            a = math.calcAsymmetricShare(share, totalUnits, A)
            v = 0
        }

        let tx = await vetherPools.unstakeAsymmetric(bp, toVeth, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputVether), _.BN2Str(v), 'outputVether')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await vetherPools.totalSupply())), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await vetherPools.poolData()).vether), V.minus(v))
        assert.equal(_.BN2Str((await vetherPools.poolData()).asset), A.minus(a))
        assert.equal(_.BN2Str((await vetherPools.poolData()).vetherStaked), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await vetherPools.poolData()).assetStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.minus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakerUnits2 = _.getBN(await vetherPools.balanceOf(acc))
        assert.equal(_.BN2Str(stakerUnits2), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
    })
}

async function unstakeExactAsym(bp, acc, toVeth) {

    it(`It should assym unstake from ${acc}`, async () => {
        var V = _.getBN((await vetherPools.poolData()).vether)
        var A = _.getBN((await vetherPools.poolData()).asset)

        let totalUnits = _.getBN((await vetherPools.totalSupply()))
        let stakerUnits = _.getBN(await vetherPools.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)

        let a; let v;
        if(toVeth){
            a = 0
            v = math.calcAsymmetricShare(share, totalUnits, V)
        } else {
            a = math.calcAsymmetricShare(share, totalUnits, A)
            v = 0
        }

        let tx = await vetherPools.unstakeExactAsymmetric(share, toVeth, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputVether), _.BN2Str(v), 'outputVether')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[1].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await vetherPools.totalSupply())), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await vetherPools.poolData()).vether), V.minus(v))
        assert.equal(_.BN2Str((await vetherPools.poolData()).asset), A.minus(a))
        assert.equal(_.BN2Str((await vetherPools.poolData()).vetherStaked), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await vetherPools.poolData()).assetStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.minus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakerUnits2 = _.getBN(await vetherPools.balanceOf(acc))
        assert.equal(_.BN2Str(stakerUnits2), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
    })
}

async function unstakeFailExactAsym(bp, acc, toVeth) {

    it(`It should assym unstake from ${acc}`, async () => {
        let stakerUnits = _.getBN(await vetherPools.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)

        await truffleAssert.reverts(vetherPools.unstakeExactAsymmetric(share, toVeth, { from: acc}))
    })
}

async function unstakeFailStart() {

    it("It should revert if unstaking 0 BP", async () => {
        await truffleAssert.reverts(vetherPools.unstake(0));
    })

    it("It should revert if unstaking 10001 BP", async () => {
        await truffleAssert.reverts(vetherPools.unstake('10001'));
    })

    it("It should revert if unstaking higher units", async () => {
        let units = _.getBN(await vetherPools.balanceOf(acc0))
        let unitsMore = units.plus(1)
        await truffleAssert.reverts(vetherPools.unstakeExact(_.BN2Str(unitsMore)));
    })
}

async function unstakeFailEnd(acc) {

    it("It should revert if unstaking unstaked member", async () => {
        await truffleAssert.reverts(vetherPools.unstake(0, {from: acc}));
    })
    it("It should revert if unstaking assym", async () => {
        await truffleAssert.reverts(vetherPools.unstake(0, {from: acc}));
    })
}

async function unstakeTKN1(bp, acc) {

    it(`It should unstake TKN1 for ${acc}`, async () => {
        _unstakeTKN(bp, acc, token1.address)
    })
}

async function unstakeTKN2(bp, acc) {

    it(`It should unstake TKN2 for ${acc}`, async () => {
        _unstakeTKN(bp, acc, token2.address)
    })
}

async function _unstakeTKN(bp, acc, addr) {

        var V = _.getBN((await vetherPools.poolData()).vether)
        var A = _.getBN((await vetherPools.poolData()).asset)

        // let stakers = _.BN2Str((await vetherPools.poolData()).stakerCount)
        let totalUnits = _.getBN((await vetherPools.poolData()).poolUnits)
        let stakeData = (await vetherPools.getMemberData(acc))
        let stakerUnits = _.getBN(stakeData.stakeUnits)
        let share = (stakerUnits.times(bp)).div(10000)
        let v = (V.times(share)).div(totalUnits)
        let a = (A.times(share)).div(totalUnits)
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        // assert.equal(stakeData.vether, _.BN2Str(v), 'vether')
        // assert.equal(stakeData.asset, _.BN2Str(a), 'asset')
        
        let tx = await vetherPools.unstake(bp, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputVether), _.floorBN(v), 'outputVether')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await vetherPools.poolData()).poolUnits), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await vetherPools.poolData()).vether), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await vetherPools.poolData()).asset), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str((await vetherPools.poolData()).vetherStaked), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str((await vetherPools.poolData()).assetStaked), _.BN2Str(A.minus(a)))
        // assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.minus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.minus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.minus(v)), 'vether balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakeData2 = (await vetherPools.getMemberData(acc))
        // assert.equal(stakeData.vether, v, 'vether')
        // assert.equal(stakeData.asset, a, 'asset')
        assert.equal(_.BN2Str(stakeData2.stakeUnits), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
}

function logETH() {
    it("logs", async () => {
        await help.logPool(vetherPools, _.ETH ,"ETH")
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

function logStaker(acc) {
    it("logs", async () => {
        await help.logStaker(vetherPools, acc, _.ETH)
    })
}