let Vether = artifacts.require("./Vether.sol");
let VetherPools = artifacts.require("./VetherPools1.sol");

module.exports = function(deployer, network) {
  deployer.deploy(Vether);
  deployer.deploy(VetherPools);
};
