/*
################################################
Utility functions
Such as Bignumbers
################################################
*/

var BigNumber = require('bignumber.js');

const delay = ms => new Promise(res => setTimeout(res, ms));


const _1 = 1 * 10 ** 18;
const _1BN = new BigNumber(1 * 10 ** 18)
const _01BN = new BigNumber(1 * 10 ** 17)
const _001BN = new BigNumber(1 * 10 ** 16)
const addressETH = "0x0000000000000000000000000000000000000000"

function getBN(BN) { return (new BigNumber(BN))}

function BN2Int(BN) { return +(new BigNumber(BN)).toFixed() }

function BN2Str(BN) { return (new BigNumber(BN)).toFixed() }

function int2BN(int) { return (new BigNumber(int)) }

function int2Str(int) { return ((int).toString()) }

function int2Num(int) { return (int / (_1)) }

function ETH(x) {
  return new BigNumber(x * _1);
}
function ETH01(x) {

  return new BigNumber(x * 10 ** 16);
}
function ETH001(x) {
  return new BigNumber(x * 10 ** 15);
}
function floorBN(BN){
  return (new BigNumber(BN)).integerValue(1)
}

function assertLog(thing1, thing2, test) {
  return console.log(thing1, thing2, test)
}
function logType(thing) {
  return console.log("%s type", thing, typeof thing)
}

module.exports = {
  BN2Int: BN2Int
  ,
  BN2Str: BN2Str,
  getBN,
  int2BN: int2BN
  ,
  int2Str: int2Str
  ,
  int2Num: int2Num
  ,
  ETH: ETH
  ,
  ETH01: ETH01
  ,
  ETH001: ETH001
  ,
  floorBN
  ,
  assertLog
  ,
  logType
  ,
  addressETH: addressETH,
  _1:_1,
  _1BN:_1BN, _01BN:_01BN, _001BN:_001BN

};
















