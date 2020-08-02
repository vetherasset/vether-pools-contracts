var Token1 = artifacts.require("./Token1.sol") 
var Token2 = artifacts.require("./Token2.sol") 
var Vether = artifacts.require("./Vether.sol") 
var Math = artifacts.require("./Math.sol") 
var Pools = artifacts.require("./VetherPool.sol");
var Pools2 = artifacts.require("./VetherPool.sol");

module.exports = async() => {
    const token1 = await Token1.new();
    Token1.setAsDeployed(token1)
    const token2 = await Token2.new();
    Token2.setAsDeployed(token2)
    const vether = await Vether.new();
    Vether.setAsDeployed(vether)
    // const math = await Math.new();
    // Math.setAsDeployed(math)
    const pools = await Pools.new(vether.address);
    Pools.setAsDeployed(pools)
    const pools2 = await Pools2.new(vether.address);
    Pools2.setAsDeployed(pools2)
};