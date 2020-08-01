/*
################################################
Upgrades
################################################
*/

const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var VETHER = artifacts.require("./Vether.sol");
var VETHPOOL = artifacts.require("./VetherPools.sol");
var VETHPOOL2 = artifacts.require("./VetherPools.sol");

var vether; var vetherPools; var vetherPools2;
var acc0; var acc1; var acc2; var acc3;

contract('VETH', function (accounts) {
    constructor(accounts)
    stakeETH(acc0, _.BN2Str(_.one * 5), _.BN2Str(_.one * 50), true)
    stakeETH(acc1, _.BN2Str(_.one * 5), _.BN2Str(_.one * 50), false)
    logETH()

    stakeETH2(acc0, _.BN2Str(_.one * 5), _.BN2Str(_.one * 50), true)
    logETH2()

    // stakeSendETH2(acc0, _.BN2Str(_.one * 5), 0, false)
    // logETH2()
    // stakeETH2(acc0, _.BN2Str(0), _.BN2Str(_.one * 50), false)
    // logETH2()

    upgrade(acc1)
    logETH2()
    unstakeETH(10000, acc0)
    logETH2()
    unstakeETH(10000, acc1)
    logETH2()
})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]

    it("constructor events", async () => {

        vether = await VETHER.new()
        vetherPools = await VETHPOOL.new(vether.address)
        vetherPools2 = await VETHPOOL2.new(vether.address)

        const vetherAddr = await vetherPools.VETHER()
        assert.equal(vetherAddr, vether.address, "address is correct")

        const vetherAddr2 = await vetherPools2.VETHER()
        assert.equal(vetherAddr2, vether.address, "address2 is correct")

        const poolCount = await vetherPools.poolCount()
        assert.equal(poolCount, 0)

        let supply = await vether.totalSupply()
        await vether.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        await vether.approve(vetherPools.address, supply, { from: acc0 })
        await vether.approve(vetherPools.address, supply, { from: acc1 })
        await vether.approve(vetherPools2.address, supply, { from: acc0 })
        await vether.approve(vetherPools2.address, supply, { from: acc1 })

        console.log(`Acc0: ${acc0}`)
        console.log(`Acc1: ${acc1}`)
        console.log(`Vether: ${vether.address}`)
        console.log(`Pools: ${vetherPools.address}`)
        console.log(`Pools2: ${vetherPools2.address}`)
    });
}


async function stakeETH(acc, a, v, first) {

    it(`It should stake ETH from ${acc}`, async () => {
        // console.log(`testing for ${acc}, ${v}, ${a}, ${first}`)

        const addr = _.ETH
        var V; var A;
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
        
        let tx = await vetherPools.stake(v, a, addr, { from: acc, value: a })

        assert.equal((await vetherPools.arrayPools(0)), addr, 'pools')
        assert.equal(_.BN2Str((await vetherPools.poolCount())), 1, 'poolCount')
        assert.equal((await vetherPools.mapPoolStakers(addr, stakerCount)), acc, 'stakers')

        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).vether), V.plus(v))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).asset), A.plus(a))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).vetherStaked), V.plus(v))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).assetStaked), A.plus(a))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).stakerCount), +stakerCount + 1, 'stakerCount')
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).poolUnits), units.plus(poolUnits), 'poolUnits')

        assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.plus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.plus(a)), 'ether balance')
    })
}
async function stakeETH2(acc, a, v, first) {

    it(`It should stake ETH from ${acc}`, async () => {
        // console.log(`testing for ${acc}, ${v}, ${a}, ${first}`)

        const addr = _.ETH
        var V; var A;
        if(first){
            V = _.getBN(0); 
            A = _.getBN(0);
            stakerCount = 0;
            poolUnits = 0;
        } else {
            V = _.getBN((await vetherPools2.poolData(addr)).vether)
            A = _.getBN((await vetherPools2.poolData(addr)).asset)
            stakerCount = 0 //_.BN2Str((await vetherPools2.poolData(addr)).stakerCount)
            poolUnits = _.getBN((await vetherPools2.poolData(addr)).poolUnits)
        }
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
        // console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let tx = await vetherPools2.stake(v, a, addr, { from: acc, value: a })

        assert.equal((await vetherPools2.arrayPools(0)), addr, 'pools')
        assert.equal(_.BN2Str((await vetherPools2.poolCount())), 1, 'poolCount')
        assert.equal((await vetherPools2.mapPoolStakers(addr, stakerCount)), acc, 'stakers')

        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).vether), V.plus(v))
        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).asset), A.plus(a))
        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).vetherStaked), V.plus(v))
        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).assetStaked), A.plus(a))
        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).stakerCount), +stakerCount + 1, 'stakerCount')
        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).poolUnits), units.plus(poolUnits), 'poolUnits')

        assert.equal(_.BN2Str(await vether.balanceOf(vetherPools2.address)), _.BN2Str(V.plus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools2.address)), _.BN2Str(A.plus(a)), 'ether balance')
    })
}

async function stakeSendETH2(acc, a, v, first) {

    it(`It should stake ETH from ${acc}`, async () => {
        // console.log(`testing for ${acc}, ${v}, ${a}, ${first}`)

        const addr = _.ETH
        var V; var A;
        if(first){
            V = _.getBN(0); 
            A = _.getBN(0);
            stakerCount = 0;
            poolUnits = 0;
        } else {
            V = _.getBN((await vetherPools2.poolData(addr)).vether)
            A = _.getBN((await vetherPools2.poolData(addr)).asset)
            stakerCount = 0 //_.BN2Str((await vetherPools2.poolData(addr)).stakerCount)
            poolUnits = _.getBN((await vetherPools2.poolData(addr)).poolUnits)
        }
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
        // console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(V.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let receipt = await web3.eth.sendTransaction({ from: acc, to: vetherPools2.address, value:a})

        assert.equal((await vetherPools2.arrayPools(0)), addr, 'pools')
        assert.equal(_.BN2Str((await vetherPools2.poolCount())), 1, 'poolCount')
        assert.equal((await vetherPools2.mapPoolStakers(addr, stakerCount)), acc, 'stakers')

        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).vether), V.plus(v))
        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).asset), A.plus(a))
        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).vetherStaked), V.plus(v))
        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).assetStaked), A.plus(a))
        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).stakerCount), +stakerCount + 1, 'stakerCount')
        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).poolUnits), units.plus(poolUnits), 'poolUnits')

        assert.equal(_.BN2Str(await vether.balanceOf(vetherPools2.address)), _.BN2Str(V.plus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools2.address)), _.BN2Str(A.plus(a)), 'ether balance')
    })
}

async function upgrade(acc) {

    it(`It should upgrade`, async () => {

        const addr = _.ETH
        V = _.getBN((await vetherPools2.poolData(addr)).vether)
        A = _.getBN((await vetherPools2.poolData(addr)).asset)
        v = _.getBN(await vetherPools.getStakerShareVether(acc, addr))
        a = _.getBN(await vetherPools.getStakerShareAsset(acc, addr))
        stakerCount = _.BN2Str((await vetherPools2.poolData(addr)).stakerCount)
        poolUnits = _.getBN((await vetherPools2.poolData(addr)).poolUnits)

        console.log(_.BN2Str(v), _.BN2Str(V), _.BN2Str(a), _.BN2Str(A))
        let units = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))

        let tx = await vetherPools.upgrade(vetherPools2.address, {from:acc})
        // console.log(tx.receipt.logs)

        assert.equal((await vetherPools2.arrayPools(0)), addr, 'pools')
        assert.equal(_.BN2Str((await vetherPools2.poolCount())), 1, 'poolCount')
        assert.equal((await vetherPools2.mapPoolStakers(addr, stakerCount)), acc, 'stakers')

        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).vether), V.plus(v))
        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).asset), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).vetherStaked), V.plus(v))
        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).assetStaked), A.plus(a))
        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).stakerCount), +stakerCount + 1, 'stakerCount')
        assert.equal(_.BN2Str((await vetherPools2.poolData(addr)).poolUnits), units.plus(poolUnits), 'poolUnits')

        assert.equal(_.BN2Str(await vether.balanceOf(vetherPools2.address)), _.BN2Str(V.plus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools2.address)), _.BN2Str(A.plus(a)), 'ether balance')
    })
}

async function unstakeETH(bp, acc) {

    it(`It should unstake ETH for ${acc}`, async () => {
        const addr = _.ETH
        let vetherPools = vetherPools2
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

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputVether), _.BN2Str(v), 'outputVether')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAsset), _.BN2Str(a), 'outputAsset')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).poolUnits), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).vether), V.minus(v))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).asset), A.minus(a))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).vetherStaked), V.minus(v))
        assert.equal(_.BN2Str((await vetherPools.poolData(addr)).assetStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.minus(v)), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.minus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await vether.balanceOf(vetherPools.address)), _.BN2Str(V.minus(v)), 'vether balance')
        // assert.equal(_.BN2Str(await web3.eth.getBalance(vetherPools.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakeData2 = (await vetherPools.getMemberStakeData(acc, addr))
        // assert.equal(stakeData.vether, v, 'vether')
        // assert.equal(stakeData.asset, a, 'asset')
        assert.equal(_.BN2Str(stakeData2.stakeUnits), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
    })
}


function logETH() {
    it("logs", async () => {
        await help.logPool(vetherPools, _.ETH)
    })
}
function logETH2() {
    it("logs", async () => {
        await help.logPool(vetherPools2, _.ETH)
    })
}



