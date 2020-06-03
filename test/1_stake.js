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
var POOLS = artifacts.require("./VetherPools.sol");
var TOKEN1 = artifacts.require("./Token1.sol");
var TOKEN2 = artifacts.require("./Token2.sol");

var instanceVETH; var instancePOOLS; var instanceT1;
var acc0; var acc1; var acc2; var acc3;

contract('VETH', function (accounts) {
    constructor(accounts)
    stakeFail()
    stakeETH(acc0, _.BN2Str(_.one * 10), _.dot1BN, true)
    logETH()
    stakeETH(acc1, _.getBN(_.one * 20), _.getBN(_.one/5), false)
    logETH()
    unstakeETH(10000, acc1)
    logETH()
    unstakeETH(10000, acc0)
    logETH()
    stakeETH(acc0, _.BN2Str(_.one * 10), _.dot1BN, true)
    logETH()
    unstakeETH(5000, acc0)
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
        instancePOOLS = await POOLS.deployed();
        instanceT1 = await TOKEN1.deployed();

        const vetherAddr = await instancePOOLS.VETHER()
        assert.equal(vetherAddr, instanceVETH.address, "address is correct")

        const poolCount = await instancePOOLS.poolCount()
        assert.equal(poolCount, 0)
        // const pool0 = await instancePOOLS.arrayPools(poolCount)
        // console.log(pool0)
        // assert.equal(pool0, _.addressETH)

        let supply = await instanceVETH.totalSupply()
        await instanceVETH.approve(instancePOOLS.address, supply, { from: acc0 })
        let allowance = await instanceVETH.allowance(acc0, instancePOOLS.address)
        assert.equal(_.BN2Str(allowance), _.BN2Str(supply), 'allowance is correct')

        let supplyT1 = await instanceT1.totalSupply()
        await instanceT1.approve(instancePOOLS.address, supplyT1, { from: acc0 })
        let allowanceT1 = await instanceT1.allowance(acc0, instancePOOLS.address)
        assert.equal(_.BN2Str(allowance), _.BN2Str(supplyT1), 'allowance is correct')

        await instanceVETH.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        await instanceT1.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
        await instanceVETH.approve(instancePOOLS.address, supply, { from: acc1 })
        await instanceT1.approve(instancePOOLS.address, supplyT1, { from: acc1 })

        console.log(`Acc0: ${acc0}`)
        console.log(`Acc1: ${acc1}`)
        console.log(`Pools: ${instancePOOLS.address}`)
    });
}


async function stakeFail() {

    it("It should revert with no ETH value", async () => {
        var tx1 = await truffleAssert.reverts(instancePOOLS.stake(_.BN2Str(_.one * 100), _.BN2Str(_.one), _.addressETH));
    })

    it("It should revert with no ETH", async () => {
        var tx1 = await truffleAssert.reverts(instancePOOLS.stake(_.BN2Str(0), _.BN2Str(_.one), _.addressETH, { from: acc0, value: _.oneBN }));
    })

    it("It should revert with no VETH", async () => {
        var tx1 = await truffleAssert.reverts(instancePOOLS.stake(_.BN2Str(_.one * 100), _.BN2Str(0), _.addressETH, { from: acc0, value: _.oneBN }));
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
            V = _.getBN((await instancePOOLS.mapPoolData(addr)).vether)
            A = _.getBN((await instancePOOLS.mapPoolData(addr)).asset)
            stakerCount = _.BN2Str((await instancePOOLS.mapPoolData(addr)).stakerCount)
            poolUnits = _.getBN((await instancePOOLS.mapPoolData(addr)).poolUnits)
        }
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let units = math.calcPoolUnits(v, V.plus(v), a, A.plus(a))
        // console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let tx = await instancePOOLS.stake(v, a, addr, { from: acc, value: a })

        assert.equal((await instancePOOLS.arrayPools(0)), addr, 'pools')
        assert.equal(_.BN2Str((await instancePOOLS.poolCount())), 1, 'poolCount')
        assert.equal((await instancePOOLS.mapPoolStakers(addr, stakerCount)), acc, 'stakers')
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolStakerUnits(addr, acc))), _.BN2Str(units), 'stakerUnits')

        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).vether), V.plus(v))
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).asset), A.plus(a))
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).vetherStaked), V.plus(v))
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).assetStaked), A.plus(a))
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).stakerCount), +stakerCount + 1, 'stakerCount')
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).poolUnits), units.plus(poolUnits), 'poolUnits')

        assert.equal(_.BN2Str(await instanceVETH.balanceOf(instancePOOLS.address)), _.BN2Str(V.plus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(instancePOOLS.address)), _.BN2Str(A.plus(a)), 'ether balance')
    })
}

async function unstakeETH(bp, acc) {

    it(`It should unstake ETH from ${acc}`, async () => {
        const addr = _.addressETH
        var V = _.getBN((await instancePOOLS.mapPoolData(addr)).vether)
        var A = _.getBN((await instancePOOLS.mapPoolData(addr)).asset)

        // let stakers = _.BN2Str((await instancePOOLS.mapPoolData(addr)).stakerCount)
        let totalUnits = _.getBN((await instancePOOLS.mapPoolData(addr)).poolUnits)
        let stakerUnits = _.getBN((await instancePOOLS.mapPoolStakerUnits(addr, acc)))
        let share = (stakerUnits.times(bp)).div(10000)
        let v = (V.times(share)).div(totalUnits)
        let a = (A.times(share)).div(totalUnits)
        // console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        let tx = await instancePOOLS.unstake(bp, addr, { from: acc})

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputVether), _.BN2Str(v), 'outputVether')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).poolUnits), totalUnits.minus(share), 'poolUnits')
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolStakerUnits(addr, acc))), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')

        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).vether), V.minus(v))
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).asset), A.minus(a))
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).vetherStaked), V.minus(v))
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).assetStaked), A.minus(a))
        assert.equal(_.BN2Str(await instanceVETH.balanceOf(instancePOOLS.address)), _.BN2Str(V.minus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(instancePOOLS.address)), _.BN2Str(A.minus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await instanceVETH.balanceOf(instancePOOLS.address)), _.BN2Str(V.minus(v)), 'vether balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(instancePOOLS.address)), _.BN2Str(A.minus(a)), 'ether balance')

    })
}


async function stakeToken1(v, a) {

    it("It should revert with no asset", async () => {
        const addr = instanceT1.address
        var tx1 = await truffleAssert.reverts(instancePOOLS.stake(
            _.BN2Str(0),
            _.BN2Str(a),
            addr));
    })

    it("It should revert with no VETH", async () => {
        const addr = instanceT1.address
        var tx1 = await truffleAssert.reverts(instancePOOLS.stake(
            _.BN2Str(v),
            _.BN2Str(0),
            addr));
    })

    it("It should stake ASSET", async () => {
        const addr = instanceT1.address
        var V; var A;
        if((await instancePOOLS.mapPoolData(addr)).poolUnits > 0){
            A = (await instancePOOLS.mapPoolData(addr)).asset
            V = (await instancePOOLS.mapPoolData(addr)).vether
        } else {
            V = 0; A = 0;
        }
        let units = math.calcPoolUnits(v, v+V, a, a+A)

        let tx = await instancePOOLS.stake(v, a, addr)
        
        assert.equal((await instancePOOLS.arrayPools(1)), addr, 'pools')
        assert.equal(_.BN2Str((await instancePOOLS.poolCount())), 2, 'poolCount')
        assert.equal((await instancePOOLS.mapPoolStakers(addr, 0)), acc0, 'stakers')
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolStakerUnits(addr, acc0))), units, 'stakerUnits')

        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).vether), v)
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).asset), a)
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).vetherStaked), v)
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).assetStaked), a)
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).stakerCount), 1, 'stakerCount')
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).poolUnits), units, 'poolUnits')

    })
}

function logETH() {
    it("logs", async () => {
        await help.logPool(instancePOOLS, _.addressETH)
    })
}

function logT1() {
    it("logs", async () => {
        await help.logPool(instancePOOLS, instanceT1.address)
    })
}