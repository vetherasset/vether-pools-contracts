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
var VFACTORY = artifacts.require("./VFactory.sol");
var MATH = artifacts.require("MathContract");

var vether;  var vFactory; var coreMath;
var acc0; var acc1; var acc2; var acc3;

contract('VETH', function (accounts) {
    constructor(accounts)
    mathCheck()
})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]

    it("constructor events", async () => {

        vether = await VETHER.new()
        coreMath = await MATH.new()
        vFactory = await VFACTORY.new(vether.address, coreMath.address)
        console.log(`Acc0: ${acc0}`)
        console.log(`Acc1: ${acc1}`)
        console.log(`Pools: ${vFactory.address}`)
    });
}


async function mathCheck() {
    const a = _.getBN(1*10**18)
    const A = _.getBN(10*10**18)
    const v = _.getBN(10*10**18)
    const V = _.getBN(100*10**18)
    const s = _.getBN(1000)
    const T = _.getBN(10000)

    it(`Checks staking`, async () => {
        let veth = await coreMath.calcStakeUnits(a, A.plus(a), v, V.plus(v))
        let js = math.calcStakeUnits(a, A.plus(a), v, V.plus(v))
        assert.equal(_.BN2Str(veth), _.BN2Str(js))
        assert.equal(_.BN2Str(veth), '5500000000000000000')
    })

    it(`Checks assym withdrawal`, async () => {
        let veth = await coreMath.calcAsymmetricShare(s, T, V)
        let js = math.calcAsymmetricShare(s, T, V)
        assert.equal(_.BN2Str(veth), _.BN2Str(js))
        assert.equal(_.BN2Str(veth), '18100000000000000000')
    })

    it(`Checks swapping`, async () => {
        let veth = await coreMath.calcSwapOutput(a, A, V)
        let js = math.calcSwapOutput(a, A, V)
        assert.equal(_.BN2Str(veth), _.BN2Str(js))
        assert.equal(_.BN2Str(veth), '8264462809917355371')
    })

    it(`Checks swapping fee`, async () => {
        let veth = await coreMath.calcSwapFee(a, A, V)
        let js = math.calcSwapFee(a, A, V)
        assert.equal(_.BN2Str(veth), _.BN2Str(js))
        assert.equal(_.BN2Str(veth), '826446280991735537')
        // console.log(_.BN2Str(veth), _.BN2Str(js))
    })

    it(`Checks swapping fee`, async () => {
        const a = _.getBN(1000000000000000000)
        const A = _.getBN(100000000000000000)
        const V = _.getBN(10000000000000000000)
        let veth = await coreMath.calcSwapFee(a, A, V)
        let js = math.calcSwapFee(a, A, V)
        assert.equal(_.BN2Str(veth), _.BN2Str(js))
        assert.equal(_.BN2Str(veth), '8264462809917355371')
        console.log(_.BN2Str(veth), _.BN2Str(js))
    })
}

