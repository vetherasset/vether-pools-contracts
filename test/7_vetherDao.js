const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var VETHER = artifacts.require("./Vether.sol");
var DAO = artifacts.require("./Dao_Vether.sol");
var ROUTER = artifacts.require("./Router_Vether.sol");
var POOL = artifacts.require("./Pool_Vether.sol");
var UTILS = artifacts.require("./Utils_Vether.sol");
var TOKEN1 = artifacts.require("./Token1.sol");

var vether; var token1;  var token2; var addr1; var addr2;
var utils; var router; var router2; var Dao; var Dao2;
var poolETH; var poolTKN1; var poolTKN2;
var acc0; var acc1; var acc2; var acc3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
function assertBn(string, _one, _two){
    assert.equal(_.BN2Str(_one), _.BN2Str(_two), string)
}
function lassertBn(string, _one, _two){
    console.log(string, _.BN2Str(_one), _.BN2Str(_two))
}

function assertStr(string, _one, _two){
    assert.equal(_one, _two, string)
}
function lassertStr(string, _one, _two){
    console.log(string, _one, _two)
}
function log(thing){
    console.log(thing)
}
function logBn(thing){
    console.log(_.BN2Str(thing))
}

contract('SPT', function (accounts) {

    constructor(accounts)
    createPool()
    stakeTKN1(acc1)
    swapPassR1(acc0, _.BN2Str(_.one * 10))
    lockFail()
    lockETH(acc0)
    lockTKN(acc1)

    deployR2()
    voteRouterR2(acc0)
    tryToMoveR2()
    swapFailR1(acc0, _.BN2Str(_.one * 10))
    swapPassR2(acc0, _.BN2Str(_.one * 10))

    deployDao2AndR3()
    voteDao2(acc0)
    tryToMoveDao2()
    swapFailR2(acc0, _.BN2Str(_.one * 10))
    swapPassR3(acc0, _.BN2Str(_.one * 10))

    unlockETH(acc0)
    unlockTKN(acc1)
    unstake2(acc0)
    // unstake2(acc1)

})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        vether = await VETHER.new()
        utils = await UTILS.new(vether.address)
        Dao = await DAO.new(vether.address, utils.address)
        router = await ROUTER.new(vether.address, Dao.address, utils.address)
        await utils.setGenesisDao(Dao.address)
        await Dao.setGenesisRouter(router.address)
        await Dao.purgeDeployer()
        assert.equal(await Dao.DEPLOYER(), '0x0000000000000000000000000000000000000000', " deployer purged")
        console.log(await utils.VETHER())
        console.log(await Dao.ROUTER())

        token1 = await TOKEN1.new();
        token2 = await TOKEN1.new();

        console.log(`Acc0: ${acc0}`)
        console.log(`vether: ${vether.address}`)
        console.log(`dao: ${Dao.address}`)
        console.log(`utils: ${utils.address}`)
        console.log(`router: ${router.address}`)
        console.log(`token1: ${token1.address}`)

        let supply = await token1.totalSupply()
        await vether.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await vether.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await vether.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await vether.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await vether.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await token1.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        await token2.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })

    });
}
function deployR2() {
    it("deloy router2", async () => {
        router2 = await ROUTER.new(vether.address, Dao.address, utils.address)
        // await Dao.setGenesisRouter(router2.address)
        await router2.migrateRouterData(router.address);
        await router2.migrateTokenData(router.address);
        console.log(`router2: ${router2.address}`)
    });
}
function deployDao2AndR3() {
    it("deloy dao and router3", async () => {

        Dao2 = await DAO.new(vether.address, utils.address)
        console.log(`Dao2: ${Dao2.address}`)
        console.log(`DAO: ${await utils.DAO()}`)

        router3 = await ROUTER.new(vether.address, Dao2.address, utils.address)
        await Dao2.setGenesisRouter(router3.address)
        await router3.migrateRouterData(router2.address);
        await router3.migrateTokenData(router2.address);
        console.log(`router3: ${router3.address}`)
    });
}


async function createPool() {
    it("It should deploy Eth Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        await router.createPool(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        poolETH = await POOL.at(_pool)
        console.log(`Pools: ${poolETH.address}`)
        const baseAddr = await poolETH.VETHER()
        assert.equal(baseAddr, vether.address, "address is correct")
        assert.equal(_.BN2Str(await vether.balanceOf(poolETH.address)), _.BN2Str(_.one * 10*0.999), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(poolETH.address)), _.BN2Str(_.dot1BN), 'ether balance')

        let supply = await vether.totalSupply()
        await vether.approve(poolETH.address, supply, { from: acc0 })
        await vether.approve(poolETH.address, supply, { from: acc1 })
    })

    it("It should deploy TKN1 Pools", async () => {

        await token1.approve(router.address, '-1', { from: acc0 })
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        await router.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        poolTKN1 = await POOL.at(_pool)
        console.log(`Pools1: ${poolTKN1.address}`)
        const baseAddr = await poolTKN1.VETHER()
        assert.equal(baseAddr, vether.address, "address is correct")

        await vether.approve(poolTKN1.address, '-1', { from: acc0 })
        await vether.approve(poolTKN1.address, '-1', { from: acc1 })
        await token1.approve(poolTKN1.address, '-1', { from: acc0 })
        await token1.approve(poolTKN1.address, '-1', { from: acc1 })
    })
    it("It should deploy TKN2 Pools", async () => {

        await token2.approve(router.address, '-1', { from: acc0 })
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        await router.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        poolTKN2 = await POOL.at(_pool)
        console.log(`Pools2: ${poolTKN2.address}`)
        const baseAddr = await poolTKN2.VETHER()
        assert.equal(baseAddr, vether.address, "address is correct")

        await vether.approve(poolTKN2.address, '-1', { from: acc0 })
        await vether.approve(poolTKN2.address, '-1', { from: acc1 })
        await token2.approve(poolTKN2.address, '-1', { from: acc0 })
        await token2.approve(poolTKN2.address, '-1', { from: acc1 })
    })
}

async function stakeTKN1(acc) {
    it("It should lock", async () => {
        await router.stake(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address, { from: acc})
    })
}

async function lockFail() {
    it("It should revert for not pool", async () => {
        let balance = await token1.balanceOf(acc0)
        await token1.approve(Dao.address, balance)
        await truffleAssert.reverts(Dao.lock(token1.address, balance, { from: acc0 }));
    })
    it("It should revert for no balance", async () => {
        let balance = await token1.balanceOf(acc1)
        await token1.approve(Dao.address, balance)
        await truffleAssert.reverts(Dao.lock(token1.address, balance, { from: acc1 }));
    })
}

async function lockETH(acc) {
    it("It should lock", async () => {
        let balance = await poolETH.balanceOf(acc)
        let weight = await utils.getShareOfBaseAmount(_.ETH, acc)
        await Dao.lock(poolETH.address, balance, { from: acc })
        assert.equal(await Dao.wasMember(acc), true)
        assert.equal(_.BN2Str(await Dao.mapMemberPool_Balance(acc, poolETH.address)), _.BN2Str(balance))
        assert.equal(_.BN2Str(await Dao.totalWeight()), _.BN2Str(weight))
        assert.equal(_.BN2Str(await Dao.mapMember_Weight(acc)), _.BN2Str(weight))
    })
}

async function lockTKN(acc) {
    it("It should lock", async () => {
        let balance = await poolTKN1.balanceOf(acc)
        let weight = await utils.getShareOfBaseAmount(token1.address, acc)
        let totalWeight = _.getBN(await Dao.totalWeight());
        let startWeight = _.getBN(await Dao.mapMember_Weight(acc));
        lassertBn('totalWeight', await Dao.totalWeight())
        await Dao.lock(poolTKN1.address, balance, { from: acc })
        assert.equal(await Dao.wasMember(acc), true)
        assert.equal(_.BN2Str(await Dao.mapMemberPool_Balance(acc, poolTKN1.address)), _.BN2Str(balance))
        assert.equal(_.BN2Str(await Dao.totalWeight()), _.BN2Str(totalWeight.plus(weight)))
        assert.equal(_.BN2Str(await Dao.mapMember_Weight(acc)), _.BN2Str(startWeight.plus(weight)))
        lassertBn('totalWeight', await Dao.totalWeight())
    })
}

async function voteRouterR2() {
    it("It should vote", async () => {
        let memberWeight = await Dao.mapMember_Weight(acc0)
        await Dao.voteRouterChange(router2.address, { from: acc0 })
        lassertBn('totalWeight', await Dao.totalWeight())
        assertBn('mapAddress_Votes', await Dao.mapAddress_Votes(router2.address), memberWeight)
        assertBn('mapAddressMember_Votes', await Dao.mapAddressMember_Votes(router2.address, acc0),memberWeight)
        assertStr('hasQuorum', await Dao.hasQuorum(router2.address),false)
        assertStr('proposedRouter', await Dao.proposedRouter(),'0x0000000000000000000000000000000000000000')
        assertStr('proposedRouterChange', await Dao.proposedRouterChange(),false)
        lassertBn('routerChangeStart', await Dao.routerChangeStart(),0)
    })
    it("It should vote again", async () => {
        let memberWeight = await Dao.mapMember_Weight(acc0)
        let memberWeight1 = _.getBN(await Dao.mapMember_Weight(acc1))
        await Dao.voteRouterChange(router2.address, { from: acc1 })
        lassertBn('totalWeight', await Dao.totalWeight())
        assertBn('mapAddress_Votes', await Dao.mapAddress_Votes(router2.address), memberWeight1.plus(memberWeight))
        assertBn('mapAddressMember_Votes', await Dao.mapAddressMember_Votes(router2.address, acc0),memberWeight)
        assertStr('hasQuorum', await Dao.hasQuorum(router2.address),true)
        assertStr('proposedRouter', await Dao.proposedRouter(),router2.address)
        assertStr('proposedRouterChange', await Dao.proposedRouterChange(),true)
        lassertBn('routerChangeStart', await Dao.routerChangeStart(),0)
    })
}



async function tryToMoveR2() {
    it("It should move again", async () => {
        await truffleAssert.reverts(Dao.moveRouter());
        console.log(`mapAddress_Votes: ${await Dao.mapAddress_Votes(router2.address)}`)
        console.log(`mapAddressMember_Votes: ${await Dao.mapAddressMember_Votes(router2.address, acc1)}`)
        console.log(`hasQuorum: ${await Dao.hasQuorum(router2.address)}`)
        console.log(`proposedRouter: ${await Dao.proposedRouter()}`)
        console.log(`proposedRouterChange: ${await Dao.proposedRouterChange()}`)
        console.log(`routerChangeStart: ${await Dao.routerChangeStart()}`)
        console.log(`routerHasMoved: ${await Dao.routerHasMoved()}`)
        console.log(`ROUTER: ${await Dao.ROUTER()}`)
    })
    it("It should try to move again", async () => {
        await sleep(2000)
        await Dao.moveRouter()
        console.log(`mapAddress_Votes: ${await Dao.mapAddress_Votes(router2.address)}`)
        console.log(`mapAddressMember_Votes: ${await Dao.mapAddressMember_Votes(router2.address, acc1)}`)
        console.log(`hasQuorum: ${await Dao.hasQuorum(router2.address)}`)
        console.log(`proposedRouter: ${await Dao.proposedRouter()}`)
        console.log(`proposedRouterChange: ${await Dao.proposedRouterChange()}`)
        console.log(`routerChangeStart: ${await Dao.routerChangeStart()}`)
        console.log(`routerHasMoved: ${await Dao.routerHasMoved()}`)
        console.log(`ROUTER: ${await Dao.ROUTER()}`)
    })
}

async function voteDao2() {
    it("It should vote", async () => {
        
        await Dao.voteDaoChange(Dao2.address, { from: acc0 })
        console.log(`mapAddress_Votes: ${await Dao.mapAddress_Votes(Dao2.address)}`)
        console.log(`mapAddressMember_Votes: ${await Dao.mapAddressMember_Votes(Dao2.address, acc0)}`)
        console.log(`hasQuorum: ${await Dao.hasQuorum(Dao2.address)}`)
        console.log(`proposedDao: ${await Dao.proposedDao()}`)
        console.log(`proposedDaoChange: ${await Dao.proposedDaoChange()}`)
        console.log(`daoChangeStart: ${await Dao.daoChangeStart()}`)
    })
    it("It should vote again", async () => {
        await Dao.voteDaoChange(Dao2.address, { from: acc1 })
        console.log(`mapAddress_Votes: ${await Dao.mapAddress_Votes(Dao2.address)}`)
        console.log(`mapAddressMember_Votes: ${await Dao.mapAddressMember_Votes(Dao2.address, acc1)}`)
        console.log(`hasQuorum: ${await Dao.hasQuorum(Dao2.address)}`)
        console.log(`proposedDao: ${await Dao.proposedDao()}`)
        console.log(`proposedDaoChange: ${await Dao.proposedDaoChange()}`)
        console.log(`daoChangeStart: ${await Dao.daoChangeStart()}`)
    })
}

async function tryToMoveDao2() {
    it("It should revert for address(0)", async () => {
        await truffleAssert.reverts(Dao.moveRouter());
    })
    it("It should move again", async () => {
        await truffleAssert.reverts(Dao.moveDao());
        console.log(`mapAddress_Votes: ${await Dao.mapAddress_Votes(Dao2.address)}`)
        console.log(`mapAddressMember_Votes: ${await Dao.mapAddressMember_Votes(Dao2.address, acc1)}`)
        console.log(`hasQuorum: ${await Dao.hasQuorum(Dao2.address)}`)
        console.log(`proposedDao: ${await Dao.proposedDao()}`)
        console.log(`proposedDaoChange: ${await Dao.proposedDaoChange()}`)
        console.log(`daoChangeStart: ${await Dao.daoChangeStart()}`)
        console.log(`daoHasMoved: ${await Dao.daoHasMoved()}`)
        console.log(`DAO: ${await Dao.DAO()}`)
    })
    it("It should try to move again", async () => {
        await sleep(2000)
        await Dao.moveDao()
        console.log(`mapAddress_Votes: ${await Dao.mapAddress_Votes(Dao2.address)}`)
        console.log(`mapAddressMember_Votes: ${await Dao.mapAddressMember_Votes(Dao2.address, acc1)}`)
        console.log(`hasQuorum: ${await Dao.hasQuorum(Dao2.address)}`)
        console.log(`proposedDao: ${await Dao.proposedDao()}`)
        console.log(`proposedDaoChange: ${await Dao.proposedDaoChange()}`)
        console.log(`daoChangeStart: ${await Dao.daoChangeStart()}`)
        console.log(`daoHasMoved: ${await Dao.daoHasMoved()}`)
        console.log(`DAO: ${await Dao.DAO()}`)
        console.log(`DAO: ${await utils.DAO()}`)
    })
}

async function swapPassR1(acc, b) {

    it(`It should buy ETH with BASE from ${acc}`, async () => {
        console.log(`vether: ${await utils.VETHER()}`)
        // console.log(`DAO: ${await vether.DAO()}`)
        console.log(`ROUTER: ${await Dao.ROUTER()}`)
        await _passSwap(acc, b, router)
        await help.logPool(utils, _.ETH, 'ETH')
        
    })
}

async function swapPassR2(acc, b) {

    it(`It should buy ETH with BASE from ${acc}`, async () => {
        console.log(`vether: ${await utils.VETHER()}`)
        // console.log(`DAO: ${await vether.DAO()}`)
        console.log(`ROUTER: ${await Dao.ROUTER()}`)
        await _passSwap(acc, b, router2)
        await help.logPool(utils, _.ETH, 'ETH')

    })
}

async function swapPassR3(acc, b) {

    it(`It should buy ETH with BASE from ${acc}`, async () => {
        console.log(`vether: ${await utils.VETHER()}`)
        // console.log(`DAO: ${await vether.DAO()}`)
        assert.equal(await Dao2.ROUTER(), router3.address)
        await _passSwap(acc, b, router3)
        await help.logPool(utils, _.ETH, 'ETH')

    })
}

async function _passSwap(acc, b, router) {

    it(`It should buy ETH with BASE from ${acc}`, async () => {
        let tx = await router.buy(b, _.ETH)
    })
    it(`It should sell ETH to BASE from ${acc}`, async () => {
        await router.sell(b, _.ETH)
    })
    it(`It should sell ETH to TKN1 from ${acc}`, async () => {
        await router.swap(b, _.ETH, token1.address, {from:acc, value: b})
    })
    it(`It should sell TKN1 to TKN2 from ${acc}`, async () => {
        await router.swap(b, token1.address, token2.address)
    })
}

async function swapFailR1(acc, b) {
    it("It should revert for old router", async () => {
        await truffleAssert.reverts(router.buy(b, _.ETH));
    })
}
async function swapFailR2(acc, b) {
    it("It should revert for old router", async () => {
        await truffleAssert.reverts(router2.buy(b, _.ETH));
    })
}

async function unlockETH(acc) {
    it("It should unlock", async () => {
        let balance = await poolETH.balanceOf(acc)
        // await poolETH.approve(Dao.address, balance, { from: acc })
        await Dao.unlock(poolETH.address, { from: acc })
        console.log(`wasMember: ${await Dao.wasMember(acc)}`)
        console.log(`mapMemberPool_Balance: ${await Dao.mapMemberPool_Balance(acc, _.ETH)}`)
        console.log(`totalWeight: ${await Dao.totalWeight()}`)
        console.log(`mapMember_Weight: ${await Dao.mapMember_Weight(acc)}`)
    })
}

async function unlockTKN(acc) {
    it("It should unlock", async () => {
        let balance = await poolTKN1.balanceOf(acc)
        // console.log(`balance: ${balance}`)
        // await poolTKN1.approve(Dao.address, balance, { from: acc })
        await Dao.unlock(poolTKN1.address, { from: acc })
        console.log(`wasMember: ${await Dao.wasMember(acc)}`)
        console.log(`mapMemberPool_Balance: ${await Dao.mapMemberPool_Balance(acc, _.ETH)}`)
        console.log(`totalWeight: ${await Dao.totalWeight()}`)
        console.log(`mapMember_Weight: ${await Dao.mapMember_Weight(acc)}`)
    })
}

async function unstake2() {
    it("It should unstake ETH", async () => {
        await router3.unstake(10000, _.ETH)
    })
    it("It should unstake TKN1", async () => {
        await router3.unstake(10000, token1.address)
    })
    it("It should unstake TKN2", async () => {
        await router3.unstake(10000, token2.address)
    })
}

