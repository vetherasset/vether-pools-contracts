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

var VETHER = artifacts.require("./Vether.sol");
var VETHPOOL = artifacts.require("./VetherPool.sol");
var TOKEN1 = artifacts.require("./Token1.sol");
var TOKEN2 = artifacts.require("./Token2.sol");

var instanceVETH; var instanceVETHPOOL; var instanceT1;
var acc0; var acc1; var acc2; var acc3;

contract('VETH', function (accounts) {
    constructor(accounts)
    stakeFail()

    stakeETH(acc0, _.BN2Str(_.one * 10), _.dot1BN, true)
    logETH()
    logStaker(acc0)
    stakeETH(acc1, _.getBN(_.one * 20), _.getBN(_.one/5), false)
    logETH()
    logStaker(acc1)
    unstakeETH(10000, acc1)
    logETH()
    logStaker(acc1)
    unstakeETH(10000, acc0)
    logETH()
    logStaker(acc0)
    stakeETH(acc0, _.BN2Str(_.one * 10), _.dot1BN, true)
    logETH()
    stakeETHForMember(acc0, acc1, _.BN2Str(_.one * 10), _.dot1BN, true)
    logETH()
    unstakeETH(5000, acc0)
    logETH()
    unstakeETH(10000, acc1)
    logETH()
    unstakeAsym(5000, acc0, false)
    logETH()
    unstakeAsym(5000, acc0, true)
    logETH()
    unstakeETH(10000, acc0)
    logETH()

    // stakeToken1(_.BN2Str(_.one * 10), _.BN2Str(_.one * 10))
    // logT1()
    //stakeWithAsset


})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]

    it("constructor events", async () => {

        instanceVETH = await VETHER.deployed();
        instanceVETHPOOL = await VETHPOOL.deployed();
        instanceT1 = await TOKEN1.deployed();

        const vetherAddr = await instanceVETHPOOL.VETHER()
        assert.equal(vetherAddr, instanceVETH.address, "address is correct")

        const poolCount = await instanceVETHPOOL.poolCount()
        assert.equal(poolCount, 0)
        // const pool0 = await instanceVETHPOOL.arrayPools(poolCount)
        // console.log(pool0)
        // assert.equal(pool0, _.addressETH)

        let supply = await instanceVETH.totalSupply()
        await instanceVETH.approve(instanceVETHPOOL.address, supply, { from: acc0 })
        let allowance = await instanceVETH.allowance(acc0, instanceVETHPOOL.address)
        assert.equal(_.BN2Str(allowance), _.BN2Str(supply), 'allowance is correct')

        let supplyT1 = await instanceT1.totalSupply()
        await instanceT1.approve(instanceVETHPOOL.address, supplyT1, { from: acc0 })
        let allowanceT1 = await instanceT1.allowance(acc0, instanceVETHPOOL.address)
        assert.equal(_.BN2Str(allowance), _.BN2Str(supplyT1), 'allowance is correct')

        await instanceVETH.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        await instanceT1.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
        await instanceVETH.approve(instanceVETHPOOL.address, supply, { from: acc1 })
        await instanceT1.approve(instanceVETHPOOL.address, supplyT1, { from: acc1 })

        console.log(`Acc0: ${acc0}`)
        console.log(`Acc1: ${acc1}`)
        console.log(`Pools: ${instanceVETHPOOL.address}`)
    });
}


async function stakeFail() {

    it("It should revert with no ETH value", async () => {
        var tx1 = await truffleAssert.reverts(instanceVETHPOOL.stake(_.BN2Str(_.one * 100), _.BN2Str(_.one), _.addressETH));
    })

    it("It should revert with no ETH", async () => {
        var tx1 = await truffleAssert.reverts(instanceVETHPOOL.stake(_.BN2Str(0), _.BN2Str(_.one), _.addressETH, { from: acc0, value: _.oneBN }));
    })

    it("It should revert with no VETH", async () => {
        var tx1 = await truffleAssert.reverts(instanceVETHPOOL.stake(_.BN2Str(_.one * 100), _.BN2Str(0), _.addressETH, { from: acc0, value: _.oneBN }));
    })
}

async function stakeETH(acc, v, a, first) {

    it(`It should stake ETH from ${acc}`, async () => {
        // console.log(`testing for ${acc}, ${v}, ${a}, ${first}`)

        const addr = _.addressETH
        var V; var A;
        if(first){
            V = _.getBN(0); 
            A = _.getBN(0);
            stakerCount = 0;
            poolUnits = 0;
        } else {
            V = _.getBN((await instanceVETHPOOL.mapPoolData(addr)).vether)
            A = _.getBN((await instanceVETHPOOL.mapPoolData(addr)).asset)
            stakerCount = _.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).stakerCount)
            poolUnits = _.getBN((await instanceVETHPOOL.mapPoolData(addr)).poolUnits)
        }
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
        // console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let tx = await instanceVETHPOOL.stake(v, a, addr, { from: acc, value: a })

        assert.equal((await instanceVETHPOOL.arrayPools(0)), addr, 'pools')
        assert.equal(_.BN2Str((await instanceVETHPOOL.poolCount())), 1, 'poolCount')
        assert.equal((await instanceVETHPOOL.mapPoolStakers(addr, stakerCount)), acc, 'stakers')

        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).vether), V.plus(v))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).asset), A.plus(a))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).vetherStaked), V.plus(v))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).assetStaked), A.plus(a))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).stakerCount), +stakerCount + 1, 'stakerCount')
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).poolUnits), units.plus(poolUnits), 'poolUnits')

        assert.equal(_.BN2Str(await instanceVETH.balanceOf(instanceVETHPOOL.address)), _.BN2Str(V.plus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(instanceVETHPOOL.address)), _.BN2Str(A.plus(a)), 'ether balance')

        let stakeData = (await instanceVETHPOOL.getMemberStakeData(acc, addr))
        assert.equal(stakeData.vether, v, 'vether')
        assert.equal(stakeData.asset, a, 'asset')
        assert.equal(_.BN2Str(stakeData.stakeUnits), _.BN2Str(units), 'stakerUnits')
    })
}
async function stakeETHForMember(acc, member, v, a) {

    it(`It should stake ETH for ${member}`, async () => {
        // console.log(`testing for ${acc}, ${v}, ${a}, ${first}`)

        const addr = _.addressETH
        var V; var A;
        V = _.getBN((await instanceVETHPOOL.mapPoolData(addr)).vether)
        A = _.getBN((await instanceVETHPOOL.mapPoolData(addr)).asset)
        stakerCount = _.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).stakerCount)
        poolUnits = _.getBN((await instanceVETHPOOL.mapPoolData(addr)).poolUnits)
    
        let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
        // console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let tx = await instanceVETHPOOL.stakeForMember(v, a, addr, member, { from: acc, value: a })

        assert.equal((await instanceVETHPOOL.arrayPools(0)), addr, 'pools')
        assert.equal(_.BN2Str((await instanceVETHPOOL.poolCount())), 1, 'poolCount')
        assert.equal((await instanceVETHPOOL.mapPoolStakers(addr, stakerCount)), member, 'stakers')

        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).vether), V.plus(v))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).asset), A.plus(a))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).vetherStaked), V.plus(v))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).assetStaked), A.plus(a))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).stakerCount), +stakerCount + 1, 'stakerCount')
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).poolUnits), units.plus(poolUnits), 'poolUnits')

        assert.equal(_.BN2Str(await instanceVETH.balanceOf(instanceVETHPOOL.address)), _.BN2Str(V.plus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(instanceVETHPOOL.address)), _.BN2Str(A.plus(a)), 'ether balance')

        let stakeData = (await instanceVETHPOOL.getMemberStakeData(acc, addr))
        assert.equal(stakeData.vether, v, 'vether')
        assert.equal(stakeData.asset, a, 'asset')
        assert.equal(_.BN2Str(stakeData.stakeUnits), _.BN2Str(units), 'stakerUnits')
    })
}

async function unstakeETH(bp, acc) {

    it(`It should unstake ETH for ${acc}`, async () => {
        const addr = _.addressETH
        var V = _.getBN((await instanceVETHPOOL.mapPoolData(addr)).vether)
        var A = _.getBN((await instanceVETHPOOL.mapPoolData(addr)).asset)

        // let stakers = _.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).stakerCount)
        let totalUnits = _.getBN((await instanceVETHPOOL.mapPoolData(addr)).poolUnits)
        let stakeData = (await instanceVETHPOOL.getMemberStakeData(acc, addr))
        let stakerUnits = _.getBN(stakeData.stakeUnits)
        let share = (stakerUnits.times(bp)).div(10000)
        let v = (V.times(share)).div(totalUnits)
        let a = (A.times(share)).div(totalUnits)
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        // assert.equal(stakeData.vether, _.BN2Str(v), 'vether')
        // assert.equal(stakeData.asset, _.BN2Str(a), 'asset')
        
        let tx = await instanceVETHPOOL.unstake(bp, addr, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputVether), _.BN2Str(v), 'outputVether')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).poolUnits), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).vether), V.minus(v))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).asset), A.minus(a))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).vetherStaked), V.minus(v))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).assetStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await instanceVETH.balanceOf(instanceVETHPOOL.address)), _.BN2Str(V.minus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(instanceVETHPOOL.address)), _.BN2Str(A.minus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await instanceVETH.balanceOf(instanceVETHPOOL.address)), _.BN2Str(V.minus(v)), 'vether balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(instanceVETHPOOL.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakeData2 = (await instanceVETHPOOL.getMemberStakeData(acc, addr))
        // assert.equal(stakeData.vether, v, 'vether')
        // assert.equal(stakeData.asset, a, 'asset')
        assert.equal(_.BN2Str(stakeData2.stakeUnits), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
    })
}

async function unstakeAsym(bp, acc, toVeth) {

    it(`It should assym unstake from ${acc}`, async () => {
        const addr = _.addressETH
        var V = _.getBN((await instanceVETHPOOL.mapPoolData(addr)).vether)
        var A = _.getBN((await instanceVETHPOOL.mapPoolData(addr)).asset)

        
        let totalUnits = _.getBN((await instanceVETHPOOL.mapPoolData(addr)).poolUnits)
        let stakeData = (await instanceVETHPOOL.getMemberStakeData(acc, addr))
        let stakerUnits = _.getBN(stakeData.stakeUnits)
        let share = (stakerUnits.times(bp)).div(10000)

        let a; let v;
        if(toVeth){
            a = 0
            v = math.calcAsymmetricShare(share, totalUnits, V)
        } else {
            a = math.calcAsymmetricShare(share, totalUnits, A)
            v = 0
        }

        let tx = await instanceVETHPOOL.unstakeAsymmetric(bp, addr, toVeth, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputVether), _.BN2Str(v), 'outputVether')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).poolUnits), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).vether), V.minus(v))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).asset), A.minus(a))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).vetherStaked), V.minus(v))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).assetStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await instanceVETH.balanceOf(instanceVETHPOOL.address)), _.BN2Str(V.minus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(instanceVETHPOOL.address)), _.BN2Str(A.minus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await instanceVETH.balanceOf(instanceVETHPOOL.address)), _.BN2Str(V.minus(v)), 'vether balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(instanceVETHPOOL.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakeData2 = (await instanceVETHPOOL.getMemberStakeData(acc, addr))
        // assert.equal(stakeData.vether, v, 'vether')
        // assert.equal(stakeData.asset, a, 'asset')
        assert.equal(_.BN2Str(stakeData2.stakeUnits), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
    })
}


async function stakeToken1(v, a) {

    it("It should revert with no asset", async () => {
        const addr = instanceT1.address
        var tx1 = await truffleAssert.reverts(instanceVETHPOOL.stake(
            _.BN2Str(0),
            _.BN2Str(a),
            addr));
    })

    it("It should revert with no VETH", async () => {
        const addr = instanceT1.address
        var tx1 = await truffleAssert.reverts(instanceVETHPOOL.stake(
            _.BN2Str(v),
            _.BN2Str(0),
            addr));
    })

    it("It should stake ASSET", async () => {
        const addr = instanceT1.address
        var V; var A;
        if((await instanceVETHPOOL.mapPoolData(addr)).poolUnits > 0){
            A = (await instanceVETHPOOL.mapPoolData(addr)).asset
            V = (await instanceVETHPOOL.mapPoolData(addr)).vether
        } else {
            V = 0; A = 0;
        }
        let units = math.calcPoolUnits(v, v+V, a, a+A)

        let tx = await instanceVETHPOOL.stake(v, a, addr)
        
        assert.equal((await instanceVETHPOOL.arrayPools(1)), addr, 'pools')
        assert.equal(_.BN2Str((await instanceVETHPOOL.poolCount())), 2, 'poolCount')
        assert.equal((await instanceVETHPOOL.mapPoolStakers(addr, 0)), acc0, 'stakers')
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolStakerUnits(addr, acc0))), units, 'stakerUnits')

        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).vether), v)
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).asset), a)
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).vetherStaked), v)
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).assetStaked), a)
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).stakerCount), 1, 'stakerCount')
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).poolUnits), units, 'poolUnits')

    })
}

function logETH() {
    it("logs", async () => {
        await help.logPool(instanceVETHPOOL, _.addressETH)
    })
}

function logT1() {
    it("logs", async () => {
        await help.logPool(instanceVETHPOOL, instanceT1.address)
    })
}

function logStaker(acc) {
    it("logs", async () => {
        await help.logStaker(instanceVETHPOOL, acc, _.addressETH)
    })
}