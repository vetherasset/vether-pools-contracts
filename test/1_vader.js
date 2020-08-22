const { expect } = require("chai");
var Token1 = artifacts.require('./Token1')
var Vader = artifacts.require('./Vader')
const BigNumber = require('bignumber.js')
const truffleAssert = require('truffle-assertions')

function BN2Str(BN) { return ((new BigNumber(BN)).toFixed()) }
function getBN(BN) { return (new BigNumber(BN)) }

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

var token1; var vader;
var acc0; var acc1; var acc2; var acc3; var acc4; var acc5;
const one = 10**18

before(async function() {
  accounts = await ethers.getSigners();
  acc0 = await accounts[0].getAddress()
  acc1 = await accounts[1].getAddress()
  acc2 = await accounts[2].getAddress()
  acc3 = await accounts[3].getAddress()
  acc4 = await accounts[4].getAddress()
  acc5 = await accounts[5].getAddress()

  token1 = await Token1.new();
  vader = await Vader.new();
  await token1.transfer(acc1, BN2Str(100000000 * one))
  await token1.transfer(acc2, BN2Str(100000000 * one))
  await token1.transfer(acc3, BN2Str(100000000 * one))
  await token1.transfer(acc4, BN2Str(100000000 * one))
  await token1.transfer(acc5, BN2Str(100000000 * one))
})

describe("Deploy", function() {
  it("Should deploy", async function() {
    expect(await vader.name()).to.equal("VADER PROTOCOL TOKEN");
    expect(await vader.symbol()).to.equal("VADER");
    expect(BN2Str(await vader.decimals())).to.equal('18');
    expect(BN2Str(await vader.totalSupply())).to.equal('0');
    expect(BN2Str(await vader.totalCap())).to.equal(BN2Str(3000000 * one));
    expect(BN2Str(await vader.emissionCurve())).to.equal('2048');
    expect(await vader.emitting()).to.equal(false);
    expect(BN2Str(await vader.currentEra())).to.equal('1');
    expect(BN2Str(await vader.secondsPerEra())).to.equal('1');
    // console.log(BN2Str(await vader.nextEraTime()));
    expect(await vader.DAO()).to.equal(acc0);
    expect(await vader.burnAddress()).to.equal("0x0000000000000000000000000000000000000001");
    expect(BN2Str(await vader.getDailyEmission())).to.equal(BN2Str('0'));
  });
});

describe("Upgrade", function() {
    it("DAO list token", async function() {
        // console.log(await vader.assetCount())
        expect(await vader.isListed(token1.address)).to.equal(false);
        await vader.listAssetWithClaim(token1.address, BN2Str(500000 * one), BN2Str(one));
        expect(BN2Str(await vader.getAdjustedClaimRate(token1.address))).to.equal(BN2Str(1000000000000000000));
        expect(BN2Str(await vader.assetCount())).to.equal(BN2Str(1));
        expect(await vader.isListed(token1.address)).to.equal(true);
        console.log(await vader.allAssets())
        // expect(await vader.allAssets()).to.deeplyEqual([ '0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F' ]);
      });

      it("DAO list token", async function() {
        await vader.listAssetWithClaim(acc1, BN2Str(500000 * one), BN2Str(one));
        await vader.listAssetWithClaim(acc2, BN2Str(500000 * one), BN2Str(one));
        await vader.listAssetWithClaim(acc3, BN2Str(500000 * one), BN2Str(one));
        await vader.listAssetWithClaim(acc4, BN2Str(500000 * one), BN2Str(one));
        console.log(BN2Str(await vader.assetCount()))
        console.log(await vader.allAssets())
        console.log(await vader.assetsInRange('0', '3'))
        console.log(await vader.assetsInRange('0', '9'))
      });

  it("Should upgrade acc1", async function() {
      // first, upgrade 50m
    expect(await vader.mapMemberAsset_hasClaimed(acc1, token1.address)).to.equal(false);
    let balance = await token1.balanceOf(acc1)
    await token1.approve(vader.address, balance, {from:acc1})
    expect(BN2Str(await token1.allowance(acc1, vader.address))).to.equal(BN2Str(balance));
    await vader.upgrade(token1.address, {from:acc1})
    expect(BN2Str(await vader.totalSupply())).to.equal(BN2Str(500000 * one));
    expect(BN2Str(await token1.balanceOf(acc1))).to.equal(BN2Str(99500000 * one));
    expect(BN2Str(await vader.balanceOf(acc1))).to.equal(BN2Str(500000 * one));
    expect(BN2Str(await vader.getDailyEmission())).to.equal(BN2Str('488281250000000000000'));
    expect(await vader.mapMemberAsset_hasClaimed(acc1, token1.address)).to.equal(true);
  });
  it("Address Fails second time", async function() {
    await truffleAssert.reverts(vader.upgrade(token1.address, {from:acc1}))
  });
  it("Should upgrade acc2", async function() {
    // first, upgrade 50m
    let balance = await token1.balanceOf(acc2)
    await token1.approve(vader.address, balance, {from:acc2})
    await vader.upgrade(token1.address, {from:acc2})
    expect(BN2Str(await vader.totalSupply())).to.equal(BN2Str(1000000 * one));
    expect(BN2Str(await token1.balanceOf(acc2))).to.equal(BN2Str(99500000 * one));
    expect(BN2Str(await vader.balanceOf(acc2))).to.equal(BN2Str(500000 * one));
    expect(BN2Str(await vader.getDailyEmission())).to.equal(BN2Str('976562500000000000000'));
    });
    it("Should upgrade acc3", async function() {
    // first, upgrade 50m
    let balance = await token1.balanceOf(acc3)
    await token1.approve(vader.address, balance, {from:acc3})
    await vader.upgrade(token1.address, {from:acc3})
    expect(BN2Str(await vader.totalSupply())).to.equal(BN2Str(1500000 * one));
    expect(BN2Str(await token1.balanceOf(acc3))).to.equal(BN2Str(99500000 * one));
    expect(BN2Str(await vader.balanceOf(acc3))).to.equal(BN2Str(500000 * one));
    expect(BN2Str(await vader.getDailyEmission())).to.equal(BN2Str('1464843750000000000000'));
    });
    it("Should upgrade acc4", async function() {
    // first, upgrade 50m
    let balance = await token1.balanceOf(acc4)
    await token1.approve(vader.address, balance, {from:acc4})
    await vader.upgrade(token1.address, {from:acc4})
    expect(BN2Str(await vader.totalSupply())).to.equal('1875000000000000000000000');
    expect(BN2Str(await token1.balanceOf(acc4))).to.equal(BN2Str(99500000 * one));
    expect(BN2Str(await vader.balanceOf(acc4))).to.equal('375000000000000000000000');
    expect(BN2Str(await vader.getDailyEmission())).to.equal(BN2Str('1831054687500000000000'));
    });
    it("Should upgrade acc5", async function() {
    // first, upgrade 50m
    let balance = await token1.balanceOf(acc5)
    await token1.approve(vader.address, balance, {from:acc5})
    await vader.upgrade(token1.address, {from:acc5})
    expect(BN2Str(await vader.totalSupply())).to.equal('2156250000000000000000000');
    expect(BN2Str(await token1.balanceOf(acc5))).to.equal(BN2Str(99500000 * one));
    expect(BN2Str(await vader.balanceOf(acc5))).to.equal('281250000000000000000000');
    expect(BN2Str(await vader.getDailyEmission())).to.equal(BN2Str('2105712890625000000000'));
    });
});

describe("Be a valid ERC-20", function() {
  it("Should transfer From", async function() {
    await vader.approve(acc4, "1000", {from:acc1}) 
    expect(BN2Str(await vader.allowance(acc1, acc4))).to.equal('1000');
    await vader.transferFrom(acc1, acc4, "1000", {from:acc4})
    expect(BN2Str(await vader.balanceOf(acc4))).to.equal('375000000000000000001000');
  });
  it("Should transfer to", async function() {
    await vader.transferTo(acc4, "1000", {from:acc1}) 
    expect(BN2Str(await vader.balanceOf(acc4))).to.equal('375000000000000000002000');
  });
  it("Should burn", async function() {
    await vader.burn("500", {from:acc4})
    expect(BN2Str(await vader.balanceOf(acc4))).to.equal('375000000000000000001500');
    expect(BN2Str(await vader.totalSupply())).to.equal(BN2Str('2156249999999999999999500'));

  });
  it("Should burn from", async function() {
    await vader.approve(acc2, "500", {from:acc4}) 
    expect(BN2Str(await vader.allowance(acc4, acc2))).to.equal('500');
    await vader.burnFrom(acc4, "500", {from:acc2})
    expect(BN2Str(await vader.balanceOf(acc4))).to.equal('375000000000000000001000');
    expect(BN2Str(await vader.totalSupply())).to.equal(BN2Str('2156249999999999999999000'));

  });
});

describe("DAO Functions", function() {
  it("Non-DAO fails", async function() {
    await truffleAssert.reverts(vader.startEmissions({from:acc1}))
  });
  it("DAO changeEmissionCurve", async function() {
    await vader.changeEmissionCurve('1024')
    expect(BN2Str(await vader.emissionCurve())).to.equal('1024');
  });
  it("DAO changeIncentiveAddress", async function() {
    await vader.changeIncentiveAddress(acc3)
    expect(await vader.incentiveAddress()).to.equal(acc3);
  });
  it("DAO changeDAO", async function() {
    await vader.changeDAO(acc2)
    expect(await vader.DAO()).to.equal(acc2);
  });
  it("DAO start emitting", async function() {
    await vader.startEmissions({from:acc2})
    expect(await vader.emitting()).to.equal(true);
  });
  
  it("Old DAO fails", async function() {
    await truffleAssert.reverts(vader.startEmissions())
  });
});

describe("Emissions", function() {
  it("Should emit properly", async function() {
    expect(BN2Str(await vader.getDailyEmission())).to.equal(BN2Str('4211425781249999999998'));
    // await sleep(2000)
    await vader.transfer(acc0, BN2Str(10000 * one), {from:acc1})
    await vader.transfer(acc1, BN2Str(10000 * one), {from:acc0})
    expect(BN2Str(await vader.currentEra())).to.equal('3');
    expect(BN2Str(await vader.balanceOf(acc3))).to.equal(BN2Str('508431077003479003906246'));
    expect(BN2Str(await vader.getDailyEmission())).to.equal(BN2Str('4227892728522419929502'));
    
    await sleep(2000)
    await vader.transfer(acc0, BN2Str(10000 * one), {from:acc1})
    expect(BN2Str(await vader.currentEra())).to.equal('4');
    expect(BN2Str(await vader.balanceOf(acc3))).to.equal(BN2Str('512658969732001423835748'));
    expect(BN2Str(await vader.getDailyEmission())).to.equal(BN2Str('4236150331507815280927'));
  });

  it("DAO changeEraDuration", async function() {
    await vader.changeEraDuration('200',{from:acc2})
    expect(BN2Str(await vader.secondsPerEra())).to.equal('200');
  });
});
