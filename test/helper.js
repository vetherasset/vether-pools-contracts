/*
################################################
Stake based help functions to test
Useful for tests that require state
################################################
*/

var BigNumber = require('bignumber.js');
const _ = require('./utils')
const math = require('./math.js');

const usdPool = { "asset": (2 * _.one).toString(), "mai": (2 * _.one).toString() };

async function calcValueInVeth(instance, token) {
  var result;
  var assetBal; var maiBal; 
  if (token == _.addressETH) {
    assetBal = new BigNumber((await instance.mapAsset_ExchangeData(token)).asset);
    maiBal = new BigNumber((await instance.mapAsset_ExchangeData(token)).vether);
    result = (_.oneBN.times(maiBal)).div(assetBal)
  } else {
    assetBal = new BigNumber((await instance.mapAsset_ExchangeData(token)).asset);
    maiBal = new BigNumber((await instance.mapAsset_ExchangeData(token)).vether);
    result = (_.oneBN.times(maiBal)).div(assetBal)
  }
  return result.toFixed()
}

async function calcValueInAsset() {
  var usdBal = new BigNumber(usdPool.asset)
  var maiBal = new BigNumber(usdPool.mai)
  return ((_.oneBN.times(usdBal)).div(maiBal)).toFixed()
}
async function calcEtherPriceInUSD(instance, amount) {
  const _amount = new BigNumber(amount)
  const etherPriceInVeth = new BigNumber(await calcValueInVeth(instance, _.addressETH))
  const maiPriceInUSD = new BigNumber(await calcValueInAsset())
  const ethPriceInUSD = (maiPriceInUSD.times(etherPriceInVeth)).div(_.oneBN)
  return ((_amount.times(ethPriceInUSD)).div(_.oneBN)).toFixed()
}
async function calcEtherPPinVETH(instance, amount) {
  var assetBal = new BigNumber((await instance.mapAsset_ExchangeData(_.addressETH)).asset);
  var maiBal = new BigNumber((await instance.mapAsset_ExchangeData(_.addressETH)).vether);
  const outputVeth = math.calcCLPSwap(amount, assetBal, maiBal);
  return outputVeth;
}
async function calcVETHPPInUSD(amount) {
  var usdBal = new BigNumber(usdPool.asset)
  var maiBal = new BigNumber(usdPool.mai)
  const outputUSD = math.calcCLPSwap(amount.toString(), maiBal, usdBal);
  return outputUSD;
}
async function checkLiquidateCDP(instance, _collateral, _debt) {
  var assetBal = new BigNumber((await instance.mapAsset_ExchangeData(_.addressETH)).asset);
  var maiBal = new BigNumber((await instance.mapAsset_ExchangeData(_.addressETH)).vether);
  const outputVeth = math.calcCLPLiquidation(_collateral, assetBal, maiBal);
  var canLiquidate
  if (outputVeth < _debt) {
    canLiquidate = true;
  } else {
    canLiquidate = false;
  }
  return canLiquidate;
}
async function logPool(instance, addressAsset) {
  const asset = _.BN2Asset((await instance.poolData(addressAsset)).asset);
  const vether = _.BN2Asset((await instance.poolData(addressAsset)).vether);
  const assetStaked = _.BN2Asset((await instance.poolData(addressAsset)).assetStaked);
  const vetherStaked = _.BN2Asset((await instance.poolData(addressAsset)).vetherStaked);
  const stakerCount = _.getBN((await instance.poolData(addressAsset)).stakerCount);
  const poolUnits = _.BN2Asset((await instance.poolData(addressAsset)).poolUnits);
  const fees = _.BN2Asset((await instance.poolData(addressAsset)).fees);
  const volume = _.BN2Asset((await instance.poolData(addressAsset)).volume);
  const txCount = _.getBN((await instance.poolData(addressAsset)).txCount);
  console.log("\n-------------------Asset-Vether Details -------------------")
  console.log(`ADDRESS: ${addressAsset}`)
  console.log(`MAPPINGS: [ ${asset} ETH | ${vether} VETH ]`)
  console.log(`STAKES: [ ${assetStaked} ETH | ${vetherStaked} VETH ]`)
  console.log(`UNITS: [ ${stakerCount} stakers, ${poolUnits} units ]`)
  console.log(`AVE: [ ${fees} fees, ${volume} volume, ${txCount} txCount ]`)
  console.log("-----------------------------------------------------------\n")
}
async function logStaker(instance, acc, pool) {
  let stakeData = (await instance.getMemberStakeData(acc, pool))
  let poolCount = (await instance.getMemberPoolCount(acc))
  console.log("\n-------------------Staker Details -------------------")
  console.log(`ADDRESS: ${acc} | POOL: ${pool}`)
  console.log(`POOLCOUNT: [ ${poolCount} ]`)
  console.log(`StakeData: [ ${_.BN2Asset(stakeData.vether)} VETH | ${_.BN2Asset(stakeData.asset)} ETH ]`)
  console.log("-----------------------------------------------------------\n")
}
async function logETHBalances(acc0, acc1, ETH) {
  const acc0AssetBal = await web3.eth.getBalance(acc0)
  const acc1AssetBal = await web3.eth.getBalance(acc1)
  const addressETHBalance = await web3.eth.getBalance(ETH)
  console.log(" ")
  console.log("----------------------ETH BALANCES---------------------")
  console.log('acc0:       ', acc0AssetBal / (_.one))
  console.log('acc1:       ', acc1AssetBal / (_.one))
  console.log('_.addressETH: ', _.addressETHBalance / (_.one))
}
async function logVETHBalances(instance, acc0, acc1, VETHAddress) {
  // instance = await VETH.deployed();
  const acc0VETHBalance = _.BN2Int(await instance.balanceOf(acc0))
  const acc1VETHBalance = _.BN2Int(await instance.balanceOf(acc1))
  const addressVETHBalance = _.BN2Int(await instance.balanceOf(VETHAddress))
  console.log(" ")
  console.log("-----------------------VETH BALANCES--------------------")
  console.log('acc0:       ', acc0VETHBalance / (_.one))
  console.log('acc1:       ', acc1VETHBalance / (_.one))
  console.log('addressVETH: ', addressVETHBalance / (_.one))

}

async function logCDP(instance, CDPAddress) {
  // instance = await VETH.deployed();
  const CDP = new BigNumber(await instance.mapAddress_MemberData.call(CDPAddress)).toFixed();
  const Collateral = new BigNumber((await instance.mapCDP_Data.call(CDP)).collateral).toFixed();
  const Debt = new BigNumber((await instance.mapCDP_Data.call(CDP)).debt).toFixed();
  console.log(" ")
  console.log("-----------------------CDP DETAILS----------------------")
  console.log('CDP:        ', CDP)
  console.log('Collateral: ', Collateral / (_.one))
  console.log('Debt:       ', Debt / (_.one))

}

module.exports = {
  logCDP: logCDP
  ,
  logVETHBalances: logVETHBalances
  ,
  logETHBalances: logETHBalances
  ,
  logPool: logPool
  ,
  logStaker: logStaker
  ,
  checkLiquidateCDP: checkLiquidateCDP
  ,
  calcVETHPPInUSD: calcVETHPPInUSD
  ,
  calcEtherPPinVETH: calcEtherPPinVETH
  ,
  calcEtherPriceInUSD: calcEtherPriceInUSD
  ,
  calcValueInAsset: calcValueInAsset
  ,
  calcValueInVeth: calcValueInVeth
  ,


}

