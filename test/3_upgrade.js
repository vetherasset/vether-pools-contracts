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
    stakeETH(acc0, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100), true)
    logETH()

    upgrade()

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
        await vether.approve(vetherPools.address, supply, { from: acc0 })
        let allowance = await vether.allowance(acc0, vetherPools.address)
        assert.equal(_.BN2Str(allowance), _.BN2Str(supply), 'allowance is correct')
        await vether.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        await vether.approve(vetherPools.address, supply, { from: acc1 })

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

async function upgrade() {

    it(`It should upgrade`, async () => {
        await vetherPools.upgrade(vetherPools2.address)
    })
}


function logETH() {
    it("logs", async () => {
        await help.logPool(vetherPools, _.ETH)
    })
}



