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
    stakeETH(acc0, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100), true)
    logETH()
    buyVETH(acc0, _.BN2Str(_.one * 1))
    logETH()
    sellVETH(acc0, _.BN2Str(_.one * 10))
    logETH()
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


async function stakeETH(acc, a, v, first) {

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
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolStakerUnits(addr, acc))), _.BN2Str(units), 'stakerUnits')

        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).vether), V.plus(v))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).asset), A.plus(a))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).vetherStaked), V.plus(v))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).assetStaked), A.plus(a))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).stakerCount), +stakerCount + 1, 'stakerCount')
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).poolUnits), units.plus(poolUnits), 'poolUnits')

        assert.equal(_.BN2Str(await instanceVETH.balanceOf(instanceVETHPOOL.address)), _.BN2Str(V.plus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(instanceVETHPOOL.address)), _.BN2Str(A.plus(a)), 'ether balance')
    })
}

async function buyVETH(acc, a) {

    it(`It should buy VETH from ${acc}`, async () => {

        const addr = _.addressETH
        const V = _.getBN((await instanceVETHPOOL.mapPoolData(addr)).vether)
        const A = _.getBN((await instanceVETHPOOL.mapPoolData(addr)).asset)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let v = math.calcSwapOutput(a, A, V)
        let fee = math.calcSwapFee(a, A, V)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await instanceVETHPOOL.buyVETH(a, { from: acc, value: a })

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(a))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outPutAmount), _.BN2Str(v))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).asset), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).vether), _.BN2Str(V.minus(v)))

        assert.equal(_.BN2Str(await web3.eth.getBalance(instanceVETHPOOL.address)), _.BN2Str(A.plus(a)), 'ether balance')
        assert.equal(_.BN2Str(await instanceVETH.balanceOf(instanceVETHPOOL.address)), _.BN2Str(V.minus(v)), 'vether balance')

    })
}

async function sellVETH(acc, v) {

    it(`It should buy VETH from ${acc}`, async () => {

        const addr = _.addressETH
        const V = _.getBN((await instanceVETHPOOL.mapPoolData(addr)).vether)
        const A = _.getBN((await instanceVETHPOOL.mapPoolData(addr)).asset)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let a = math.calcSwapOutput(v, V, A)
        let fee = math.calcSwapFee(v, V, A)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await instanceVETHPOOL.sellVETH(v)

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(v))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outPutAmount), _.BN2Str(a))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).asset), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str((await instanceVETHPOOL.mapPoolData(addr)).vether), _.BN2Str(V.plus(v)))

        assert.equal(_.BN2Str(await web3.eth.getBalance(instanceVETHPOOL.address)), _.BN2Str(A.minus(a)), 'ether balance')
        assert.equal(_.BN2Str(await instanceVETH.balanceOf(instanceVETHPOOL.address)), _.BN2Str(V.plus(v)), 'vether balance')

    })
}


function logETH() {
    it("logs", async () => {
        await help.logPool(instanceVETHPOOL, _.addressETH)
    })
}

