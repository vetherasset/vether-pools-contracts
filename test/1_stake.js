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
    stakeETH(_.BN2Str(_._1 * 10), _._01BN)
    logETH()
    stakeETHFromAcc1(_.BN2Str(_._1 * 10), _._01BN)
    logETH()
    // stakeToken1(_.BN2Str(_._1 * 10), _.BN2Str(_._1 * 10))
    // logT1()

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
    });
}


async function stakeETH(v, a) {

    it("It should revert with no ETH value", async () => {
        var tx1 = await truffleAssert.reverts(instancePOOLS.stake(_.BN2Str(_._1 * 100), _.BN2Str(_._1), _.addressETH));
    })

    it("It should revert with no ETH", async () => {
        var tx1 = await truffleAssert.reverts(instancePOOLS.stake(_.BN2Str(0), _.BN2Str(_._1), _.addressETH, { from: acc0, value: _._1BN }));
    })

    it("It should revert with no VETH", async () => {
        var tx1 = await truffleAssert.reverts(instancePOOLS.stake(_.BN2Str(_._1 * 100), _.BN2Str(0), _.addressETH, { from: acc0, value: _._1BN }));
    })

    it("It should stake ETH", async () => {
        const addr = _.addressETH
        var V; var A;
        if((await instancePOOLS.mapPoolData(addr)).poolUnits > 0){
            A = (await instancePOOLS.mapPoolData(addr)).asset
            V = (await instancePOOLS.mapPoolData(addr)).vether
        } else {
            V = 0; A = 0;
        }
        let units = math.calcPoolUnits(v, v+V, a, a+A)
        
        let tx = await instancePOOLS.stake(v, a, addr, { from: acc0, value: a })

        assert.equal((await instancePOOLS.arrayPools(0)), addr, 'pools')
        assert.equal(_.BN2Str((await instancePOOLS.poolCount())), 1, 'poolCount')
        assert.equal((await instancePOOLS.mapPoolStakers(addr, 0)), acc0, 'stakers')
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolStakerUnits(addr, acc0))), _.BN2Str(units), 'stakerUnits')

        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).vether), v)
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).asset), a)
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).vetherStaked), v)
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).assetStaked), a)
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).stakerCount), 1, 'stakerCount')
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).poolUnits), _.BN2Str(units), 'poolUnits')

    })
}

async function stakeETHFromAcc1(v, a) {

    it("It should stake ETH", async () => {
        const addr = _.addressETH
        var V; var A;
        if((await instancePOOLS.mapPoolData(addr)).poolUnits > 0){
            A = (await instancePOOLS.mapPoolData(addr)).asset
            V = (await instancePOOLS.mapPoolData(addr)).vether
        } else {
            V = 0; A = 0;
        }
        // let stakers = _.BN2Str((await instancePOOLS.mapPoolData(addr)).stakerCount)
        let units = math.calcPoolUnits(v, v+V, a, a+A)
        
        let tx = await instancePOOLS.stake(v, a, addr, { from: acc1, value: a })

        assert.equal((await instancePOOLS.arrayPools(0)), addr, 'pools')
        assert.equal(_.BN2Str((await instancePOOLS.poolCount())), 1, 'poolCount')
        assert.equal((await instancePOOLS.mapPoolStakers(addr, 1)), acc1, 'stakers')
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolStakerUnits(addr, acc1))), _.BN2Str(units), 'stakerUnits')

        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).vether), v+V)
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).asset), a+A)
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).vetherStaked), v+V)
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).assetStaked), a+A)
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).stakerCount), 2, 'stakerCount')
        assert.equal(_.BN2Str((await instancePOOLS.mapPoolData(addr)).poolUnits), _.BN2Str(units), 'poolUnits')

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