const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var VETHER = artifacts.require("./Vether.sol");
var VDAO = artifacts.require("./VDao_Vether.sol");
var VROUTER = artifacts.require("./VRouter_Vether.sol");
var VPOOL = artifacts.require("./VPool_Vether.sol");
var UTILS = artifacts.require("./Utils_Vether.sol");
var TOKEN1 = artifacts.require("./Token1.sol");

var vether; var token1;  var token2; var addr1; var addr2;
var utils; var vRouter; var vRouter2; var vDao; var vDao2;
var vPoolETH; var vPoolTKN1; var vPoolTKN2;
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
        vDao = await VDAO.new(vether.address, utils.address)
        vRouter = await VROUTER.new(vether.address, vDao.address, utils.address)
        await utils.setGenesisDao(vDao.address)
        await vDao.setGenesisRouter(vRouter.address)
        await vDao.purgeDeployer()
        assert.equal(await vDao.DEPLOYER(), '0x0000000000000000000000000000000000000000', " deployer purged")
        console.log(await utils.VETHER())
        console.log(await vDao.ROUTER())

        token1 = await TOKEN1.new();
        token2 = await TOKEN1.new();

        console.log(`Acc0: ${acc0}`)
        console.log(`vether: ${vether.address}`)
        console.log(`dao: ${vDao.address}`)
        console.log(`utils: ${utils.address}`)
        console.log(`vRouter: ${vRouter.address}`)
        console.log(`token1: ${token1.address}`)

        let supply = await token1.totalSupply()
        await vether.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await vether.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await vether.approve(vRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await vether.approve(vRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await vether.approve(vRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await token1.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        await token2.transfer(acc1, _.getBN(_.BN2Int(supply)/2))
        await token1.approve(vRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token2.approve(vRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })

    });
}
function deployR2() {
    it("deloy router2", async () => {
        vRouter2 = await VROUTER.new(vether.address, vDao.address, utils.address)
        // await vDao.setGenesisRouter(vRouter2.address)
        await vRouter2.migrateRouterData(vRouter.address);
        await vRouter2.migrateTokenData(vRouter.address);
        console.log(`vRouter2: ${vRouter2.address}`)
    });
}
function deployDao2AndR3() {
    it("deloy dao and router3", async () => {

        vDao2 = await VDAO.new(vether.address, utils.address)
        console.log(`vDao2: ${vDao2.address}`)
        console.log(`VDAO: ${await utils.VDAO()}`)

        vRouter3 = await VROUTER.new(vether.address, vDao2.address, utils.address)
        await vDao2.setGenesisRouter(vRouter3.address)
        await vRouter3.migrateRouterData(vRouter2.address);
        await vRouter3.migrateTokenData(vRouter2.address);
        console.log(`vRouter3: ${vRouter3.address}`)
    });
}


async function createPool() {
    it("It should deploy Eth Pool", async () => {
        var POOL = await vRouter.createPool.call(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        await vRouter.createPool(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        vPoolETH = await VPOOL.at(POOL)
        console.log(`Pools: ${vPoolETH.address}`)
        const vaderAddr = await vPoolETH.VETHER()
        assert.equal(vaderAddr, vether.address, "address is correct")
        assert.equal(_.BN2Str(await vether.balanceOf(vPoolETH.address)), _.BN2Str(_.one * 10*0.999), 'vether balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(vPoolETH.address)), _.BN2Str(_.dot1BN), 'ether balance')

        let supply = await vether.totalSupply()
        await vether.approve(vPoolETH.address, supply, { from: acc0 })
        await vether.approve(vPoolETH.address, supply, { from: acc1 })
    })

    it("It should deploy TKN1 Pools", async () => {

        await token1.approve(vRouter.address, '-1', { from: acc0 })
        var POOL = await vRouter.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        await vRouter.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        vPoolTKN1 = await VPOOL.at(POOL)
        console.log(`Pools1: ${vPoolTKN1.address}`)
        const vaderAddr = await vPoolTKN1.VETHER()
        assert.equal(vaderAddr, vether.address, "address is correct")

        await vether.approve(vPoolTKN1.address, '-1', { from: acc0 })
        await vether.approve(vPoolTKN1.address, '-1', { from: acc1 })
        await token1.approve(vPoolTKN1.address, '-1', { from: acc0 })
        await token1.approve(vPoolTKN1.address, '-1', { from: acc1 })
    })
    it("It should deploy TKN2 Pools", async () => {

        await token2.approve(vRouter.address, '-1', { from: acc0 })
        var POOL = await vRouter.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        await vRouter.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        vPoolTKN2 = await VPOOL.at(POOL)
        console.log(`Pools2: ${vPoolTKN2.address}`)
        const vaderAddr = await vPoolTKN2.VETHER()
        assert.equal(vaderAddr, vether.address, "address is correct")

        await vether.approve(vPoolTKN2.address, '-1', { from: acc0 })
        await vether.approve(vPoolTKN2.address, '-1', { from: acc1 })
        await token2.approve(vPoolTKN2.address, '-1', { from: acc0 })
        await token2.approve(vPoolTKN2.address, '-1', { from: acc1 })
    })
}

async function stakeTKN1(acc) {
    it("It should lock", async () => {
        await vRouter.stake(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address, { from: acc})
    })
}

async function lockFail() {
    it("It should revert for not pool", async () => {
        let balance = await token1.balanceOf(acc0)
        await token1.approve(vDao.address, balance)
        await truffleAssert.reverts(vDao.lock(token1.address, balance, { from: acc0 }));
    })
    it("It should revert for no balance", async () => {
        let balance = await token1.balanceOf(acc1)
        await token1.approve(vDao.address, balance)
        await truffleAssert.reverts(vDao.lock(token1.address, balance, { from: acc1 }));
    })
}

async function lockETH(acc) {
    it("It should lock", async () => {
        let balance = await vPoolETH.balanceOf(acc)
        let weight = await utils.getShareOfBaseAmount(_.ETH, acc)
        await vDao.lock(vPoolETH.address, balance, { from: acc })
        assert.equal(await vDao.wasMember(acc), true)
        assert.equal(_.BN2Str(await vDao.mapMemberPool_Balance(acc, vPoolETH.address)), _.BN2Str(balance))
        assert.equal(_.BN2Str(await vDao.totalWeight()), _.BN2Str(weight))
        assert.equal(_.BN2Str(await vDao.mapMember_Weight(acc)), _.BN2Str(weight))
    })
}

async function lockTKN(acc) {
    it("It should lock", async () => {
        let balance = await vPoolTKN1.balanceOf(acc)
        let weight = await utils.getShareOfBaseAmount(token1.address, acc)
        let totalWeight = _.getBN(await vDao.totalWeight());
        let startWeight = _.getBN(await vDao.mapMember_Weight(acc));
        lassertBn('totalWeight', await vDao.totalWeight())
        await vDao.lock(vPoolTKN1.address, balance, { from: acc })
        assert.equal(await vDao.wasMember(acc), true)
        assert.equal(_.BN2Str(await vDao.mapMemberPool_Balance(acc, vPoolTKN1.address)), _.BN2Str(balance))
        assert.equal(_.BN2Str(await vDao.totalWeight()), _.BN2Str(totalWeight.plus(weight)))
        assert.equal(_.BN2Str(await vDao.mapMember_Weight(acc)), _.BN2Str(startWeight.plus(weight)))
        lassertBn('totalWeight', await vDao.totalWeight())
    })
}

async function voteRouterR2() {
    it("It should vote", async () => {
        let memberWeight = await vDao.mapMember_Weight(acc0)
        await vDao.voteRouterChange(vRouter2.address, { from: acc0 })
        lassertBn('totalWeight', await vDao.totalWeight())
        assertBn('mapAddress_Votes', await vDao.mapAddress_Votes(vRouter2.address), memberWeight)
        assertBn('mapAddressMember_Votes', await vDao.mapAddressMember_Votes(vRouter2.address, acc0),memberWeight)
        assertStr('hasQuorum', await vDao.hasQuorum(vRouter2.address),false)
        assertStr('proposedRouter', await vDao.proposedRouter(),'0x0000000000000000000000000000000000000000')
        assertStr('proposedRouterChange', await vDao.proposedRouterChange(),false)
        lassertBn('routerChangeStart', await vDao.routerChangeStart(),0)
    })
    it("It should vote again", async () => {
        let memberWeight = await vDao.mapMember_Weight(acc0)
        let memberWeight1 = _.getBN(await vDao.mapMember_Weight(acc1))
        await vDao.voteRouterChange(vRouter2.address, { from: acc1 })
        lassertBn('totalWeight', await vDao.totalWeight())
        assertBn('mapAddress_Votes', await vDao.mapAddress_Votes(vRouter2.address), memberWeight1.plus(memberWeight))
        assertBn('mapAddressMember_Votes', await vDao.mapAddressMember_Votes(vRouter2.address, acc0),memberWeight)
        assertStr('hasQuorum', await vDao.hasQuorum(vRouter2.address),true)
        assertStr('proposedRouter', await vDao.proposedRouter(),vRouter2.address)
        assertStr('proposedRouterChange', await vDao.proposedRouterChange(),true)
        lassertBn('routerChangeStart', await vDao.routerChangeStart(),0)
    })
}



async function tryToMoveR2() {
    it("It should move again", async () => {
        await truffleAssert.reverts(vDao.moveRouter());
        console.log(`mapAddress_Votes: ${await vDao.mapAddress_Votes(vRouter2.address)}`)
        console.log(`mapAddressMember_Votes: ${await vDao.mapAddressMember_Votes(vRouter2.address, acc1)}`)
        console.log(`hasQuorum: ${await vDao.hasQuorum(vRouter2.address)}`)
        console.log(`proposedRouter: ${await vDao.proposedRouter()}`)
        console.log(`proposedRouterChange: ${await vDao.proposedRouterChange()}`)
        console.log(`routerChangeStart: ${await vDao.routerChangeStart()}`)
        console.log(`routerHasMoved: ${await vDao.routerHasMoved()}`)
        console.log(`ROUTER: ${await vDao.ROUTER()}`)
    })
    it("It should try to move again", async () => {
        await sleep(2000)
        await vDao.moveRouter()
        console.log(`mapAddress_Votes: ${await vDao.mapAddress_Votes(vRouter2.address)}`)
        console.log(`mapAddressMember_Votes: ${await vDao.mapAddressMember_Votes(vRouter2.address, acc1)}`)
        console.log(`hasQuorum: ${await vDao.hasQuorum(vRouter2.address)}`)
        console.log(`proposedRouter: ${await vDao.proposedRouter()}`)
        console.log(`proposedRouterChange: ${await vDao.proposedRouterChange()}`)
        console.log(`routerChangeStart: ${await vDao.routerChangeStart()}`)
        console.log(`routerHasMoved: ${await vDao.routerHasMoved()}`)
        console.log(`ROUTER: ${await vDao.ROUTER()}`)
    })
}

async function voteDao2() {
    it("It should vote", async () => {
        
        await vDao.voteDaoChange(vDao2.address, { from: acc0 })
        console.log(`mapAddress_Votes: ${await vDao.mapAddress_Votes(vDao2.address)}`)
        console.log(`mapAddressMember_Votes: ${await vDao.mapAddressMember_Votes(vDao2.address, acc0)}`)
        console.log(`hasQuorum: ${await vDao.hasQuorum(vDao2.address)}`)
        console.log(`proposedDao: ${await vDao.proposedDao()}`)
        console.log(`proposedDaoChange: ${await vDao.proposedDaoChange()}`)
        console.log(`daoChangeStart: ${await vDao.daoChangeStart()}`)
    })
    it("It should vote again", async () => {
        await vDao.voteDaoChange(vDao2.address, { from: acc1 })
        console.log(`mapAddress_Votes: ${await vDao.mapAddress_Votes(vDao2.address)}`)
        console.log(`mapAddressMember_Votes: ${await vDao.mapAddressMember_Votes(vDao2.address, acc1)}`)
        console.log(`hasQuorum: ${await vDao.hasQuorum(vDao2.address)}`)
        console.log(`proposedDao: ${await vDao.proposedDao()}`)
        console.log(`proposedDaoChange: ${await vDao.proposedDaoChange()}`)
        console.log(`daoChangeStart: ${await vDao.daoChangeStart()}`)
    })
}

async function tryToMoveDao2() {
    it("It should revert for address(0)", async () => {
        await truffleAssert.reverts(vDao.moveRouter());
    })
    it("It should move again", async () => {
        await truffleAssert.reverts(vDao.moveDao());
        console.log(`mapAddress_Votes: ${await vDao.mapAddress_Votes(vDao2.address)}`)
        console.log(`mapAddressMember_Votes: ${await vDao.mapAddressMember_Votes(vDao2.address, acc1)}`)
        console.log(`hasQuorum: ${await vDao.hasQuorum(vDao2.address)}`)
        console.log(`proposedDao: ${await vDao.proposedDao()}`)
        console.log(`proposedDaoChange: ${await vDao.proposedDaoChange()}`)
        console.log(`daoChangeStart: ${await vDao.daoChangeStart()}`)
        console.log(`daoHasMoved: ${await vDao.daoHasMoved()}`)
        console.log(`VDAO: ${await vDao.VDAO()}`)
    })
    it("It should try to move again", async () => {
        await sleep(2000)
        await vDao.moveDao()
        console.log(`mapAddress_Votes: ${await vDao.mapAddress_Votes(vDao2.address)}`)
        console.log(`mapAddressMember_Votes: ${await vDao.mapAddressMember_Votes(vDao2.address, acc1)}`)
        console.log(`hasQuorum: ${await vDao.hasQuorum(vDao2.address)}`)
        console.log(`proposedDao: ${await vDao.proposedDao()}`)
        console.log(`proposedDaoChange: ${await vDao.proposedDaoChange()}`)
        console.log(`daoChangeStart: ${await vDao.daoChangeStart()}`)
        console.log(`daoHasMoved: ${await vDao.daoHasMoved()}`)
        console.log(`VDAO: ${await vDao.VDAO()}`)
        console.log(`VDAO: ${await utils.VDAO()}`)
    })
}

async function swapPassR1(acc, b) {

    it(`It should buy ETH with BASE from ${acc}`, async () => {
        console.log(`vether: ${await utils.VETHER()}`)
        // console.log(`DAO: ${await vether.DAO()}`)
        console.log(`ROUTER: ${await vDao.ROUTER()}`)
        await _passSwap(acc, b, vRouter)
        await help.logPool(utils, _.ETH, 'ETH')
        
    })
}

async function swapPassR2(acc, b) {

    it(`It should buy ETH with BASE from ${acc}`, async () => {
        console.log(`vether: ${await utils.VETHER()}`)
        // console.log(`DAO: ${await vether.DAO()}`)
        console.log(`ROUTER: ${await vDao.ROUTER()}`)
        await _passSwap(acc, b, vRouter2)
        await help.logPool(utils, _.ETH, 'ETH')

    })
}

async function swapPassR3(acc, b) {

    it(`It should buy ETH with BASE from ${acc}`, async () => {
        console.log(`vether: ${await utils.VETHER()}`)
        // console.log(`DAO: ${await vether.DAO()}`)
        assert.equal(await vDao2.ROUTER(), vRouter3.address)
        await _passSwap(acc, b, vRouter3)
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
        await truffleAssert.reverts(vRouter.buy(b, _.ETH));
    })
}
async function swapFailR2(acc, b) {
    it("It should revert for old router", async () => {
        await truffleAssert.reverts(vRouter2.buy(b, _.ETH));
    })
}

async function unlockETH(acc) {
    it("It should unlock", async () => {
        let balance = await vPoolETH.balanceOf(acc)
        // await vPoolETH.approve(vDao.address, balance, { from: acc })
        await vDao.unlock(vPoolETH.address, { from: acc })
        console.log(`wasMember: ${await vDao.wasMember(acc)}`)
        console.log(`mapMemberPool_Balance: ${await vDao.mapMemberPool_Balance(acc, _.ETH)}`)
        console.log(`totalWeight: ${await vDao.totalWeight()}`)
        console.log(`mapMember_Weight: ${await vDao.mapMember_Weight(acc)}`)
    })
}

async function unlockTKN(acc) {
    it("It should unlock", async () => {
        let balance = await vPoolTKN1.balanceOf(acc)
        // console.log(`balance: ${balance}`)
        // await vPoolTKN1.approve(vDao.address, balance, { from: acc })
        await vDao.unlock(vPoolTKN1.address, { from: acc })
        console.log(`wasMember: ${await vDao.wasMember(acc)}`)
        console.log(`mapMemberPool_Balance: ${await vDao.mapMemberPool_Balance(acc, _.ETH)}`)
        console.log(`totalWeight: ${await vDao.totalWeight()}`)
        console.log(`mapMember_Weight: ${await vDao.mapMember_Weight(acc)}`)
    })
}

async function unstake2() {
    it("It should unstake ETH", async () => {
        await vRouter3.unstake(10000, _.ETH)
    })
    it("It should unstake TKN1", async () => {
        await vRouter3.unstake(10000, token1.address)
    })
    it("It should unstake TKN2", async () => {
        await vRouter3.unstake(10000, token2.address)
    })
}

