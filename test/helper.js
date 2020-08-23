/*
################################################
Stake based help functions to test
Useful for tests that require state
################################################
*/

var BigNumber = require('bignumber.js');
const _ = require('./utils')
const math = require('./math.js');

const usdPool = { "token": (2 * _.one).toString(), "mai": (2 * _.one).toString() };

async function calcValueInVeth(instance, token) {
  var result;
  var tokenBal; var maiBal; 
  if (token == _.addressETH) {
    tokenBal = new BigNumber((await instance.mapToken_ExchangeData(token)).tokenAmt);
    maiBal = new BigNumber((await instance.mapToken_ExchangeData(token)).baseAmt);
    result = (_.oneBN.times(maiBal)).div(tokenBal)
  } else {
    tokenBal = new BigNumber((await instance.mapToken_ExchangeData(token)).tokenAmt);
    maiBal = new BigNumber((await instance.mapToken_ExchangeData(token)).baseAmt);
    result = (_.oneBN.times(maiBal)).div(tokenBal)
  }
  return result.toFixed()
}

async function calcValueInToken() {
  var usdBal = new BigNumber(usdPool.tokenAmt)
  var maiBal = new BigNumber(usdPool.mai)
  return ((_.oneBN.times(usdBal)).div(maiBal)).toFixed()
}
async function calcEtherPriceInUSD(instance, amount) {
  const _amount = new BigNumber(amount)
  const etherPriceInVeth = new BigNumber(await calcValueInVeth(instance, _.addressETH))
  const maiPriceInUSD = new BigNumber(await calcValueInToken())
  const ethPriceInUSD = (maiPriceInUSD.times(etherPriceInVeth)).div(_.oneBN)
  return ((_amount.times(ethPriceInUSD)).div(_.oneBN)).toFixed()
}
async function calcEtherPPinVADER(instance, amount) {
  var tokenBal = new BigNumber((await instance.mapToken_ExchangeData(_.addressETH)).tokenAmt);
  var maiBal = new BigNumber((await instance.mapToken_ExchangeData(_.addressETH)).baseAmt);
  const outputVeth = math.calcCLPSwap(amount, tokenBal, maiBal);
  return outputVeth;
}
async function calcVADERPPInUSD(amount) {
  var usdBal = new BigNumber(usdPool.tokenAmt)
  var maiBal = new BigNumber(usdPool.mai)
  const outputUSD = math.calcCLPSwap(amount.toString(), maiBal, usdBal);
  return outputUSD;
}
async function checkLiquidateCDP(instance, _collateral, _debt) {
  var tokenBal = new BigNumber((await instance.mapToken_ExchangeData(_.addressETH)).tokenAmt);
  var maiBal = new BigNumber((await instance.mapToken_ExchangeData(_.addressETH)).baseAmt);
  const outputVeth = math.calcCLPLiquidation(_collateral, tokenBal, maiBal);
  var canLiquidate
  if (outputVeth < _debt) {
    canLiquidate = true;
  } else {
    canLiquidate = false;
  }
  return canLiquidate;
}
async function logPool(instance, addressToken, ticker) {
  console.log(instance.address)
  const poolData = await instance.getPoolData(addressToken)
  const token = _.BN2Token(poolData.tokenAmt);
  const vader = _.BN2Token(poolData.baseAmt);
  const tokenAmtStaked = _.BN2Token(poolData.tokenAmtStaked);
  const baseAmtStaked = _.BN2Token(poolData.baseAmtStaked);
  const fees = _.BN2Token(poolData.fees);
  const volume = _.BN2Token(poolData.volume);
  const txCount = _.getBN(poolData.txCount);
  const poolUnits = _.BN2Token(poolData.poolUnits);
  console.log("\n-------------------Token-Vader Details -------------------")
  console.log(`ADDRESS: ${addressToken}`)
  console.log(`MAPPINGS: [ ${token} ${ticker} | ${vader} VADER ]`)
  console.log(`STAKES: [ ${tokenAmtStaked}  ${ticker} | ${baseAmtStaked} VADER ]`)
  console.log(`UNITS: [ ${poolUnits} units ]`)
  console.log(`AVE: [ ${fees} fees, ${volume} volume, ${txCount} txCount ]`)
  console.log("-----------------------------------------------------------\n")
}
async function logStaker(instance, acc, token) {
  let stakeData = (await instance.getMemberData(token, acc))
  console.log("\n-------------------Staker Details -------------------")
  console.log(`ADDRESS: ${acc} | POOL: ${token}`)
  console.log(`StakeData: [ ${_.BN2Token(stakeData.baseAmtStaked)} VADER | ${_.BN2Token(stakeData.tokenAmtStaked)} ETH ]`)
  console.log(`StakeData: [ ${_.BN2Token(stakeData.stakerUnits)} UNITS ]`)
  console.log("-----------------------------------------------------------\n")
}
async function logETHBalances(acc0, acc1, ETH) {
  const acc0TokenBal = await web3.eth.getBalance(acc0)
  const acc1TokenBal = await web3.eth.getBalance(acc1)
  const addressETHBalance = await web3.eth.getBalance(ETH)
  console.log(" ")
  console.log("----------------------ETH BALANCES---------------------")
  console.log('acc0:       ', acc0TokenBal / (_.one))
  console.log('acc1:       ', acc1TokenBal / (_.one))
  console.log('_.addressETH: ', _.addressETHBalance / (_.one))
}
async function logVADERBalances(instance, acc0, acc1, VADERAddress) {
  // instance = await VADER.deployed();
  const acc0VADERBalance = _.BN2Int(await instance.balanceOf(acc0))
  const acc1VADERBalance = _.BN2Int(await instance.balanceOf(acc1))
  const addressVADERBalance = _.BN2Int(await instance.balanceOf(VADERAddress))
  console.log(" ")
  console.log("-----------------------VADER BALANCES--------------------")
  console.log('acc0:       ', acc0VADERBalance / (_.one))
  console.log('acc1:       ', acc1VADERBalance / (_.one))
  console.log('addressVADER: ', addressVADERBalance / (_.one))

}

async function logCDP(instance, CDPAddress) {
  // instance = await VADER.deployed();
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
  logVADERBalances: logVADERBalances
  ,
  logETHBalances: logETHBalances
  ,
  logPool: logPool
  ,
  logStaker: logStaker
  ,
  checkLiquidateCDP: checkLiquidateCDP
  ,
  calcVADERPPInUSD: calcVADERPPInUSD
  ,
  calcEtherPPinVADER: calcEtherPPinVADER
  ,
  calcEtherPriceInUSD: calcEtherPriceInUSD
  ,
  calcValueInToken: calcValueInToken
  ,
  calcValueInVeth: calcValueInVeth
  ,


}

