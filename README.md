# Vether Pools - Incentivised Liquidity Powered By Vether

## Smart Contract


### ERC-20

### Vether Public Get Methods


### Vether Public Transactions


### Constructor


**Rinkeby Testnet**

## Testing - Buidler

The test suite uses [Buidler](https://buidler.dev/) as the preferred testing suite, since it compiles and tests faster. 
The test suite implements 7 routines that can be tested individually.

```
npx buidler compile
```

Execute all at once:
```
npx builder test
```

Or execute individually:
```
npx builder test/1_coin.js
```

## Testing - Truffle
 Truffle testing can also be done:

```
truffle compile && truffle migrate --reset
```

Execute all at once:
```
truffle test
```

Or execute individually:
```
truffle test test/1_coin.js
```

## Analysis

Find in [/analysis](https://github.com/vetherasset/vether-pools-contracts/blob/master/analysis)
```
yarn analysis
```

### [Vether Function Graph](https://github.com/vetherasset/vether-contracts/blob/master/analysis/Vether-Graph.png)
```
surya graph contracts/VetherPools.sol | dot -Tpng > analysis/Vether-Graph.png
```

### [Dependency Graph](https://github.com/vetherasset/vether-contracts/blob/master/analysis/Vether-Inheritance.png)
```
surya inheritance contracts/VetherPools.sol | dot -Tpng > analysis/Vether-Inheritance.png
```

### [Description Report](https://github.com/vetherasset/vether-contracts/blob/master/analysis/Vether-Report.md)
```
surya mdreport analysis/Vether-Report.md contracts/VetherPools.sol
```

### [Describe - Raw](https://github.com/vetherasset/vether-contracts/blob/master/analysis/Vether-Describe.md)
```
surya describe contracts/VetherPools.sol
```

Parse
```
surya parse contracts/VetherPools.sol
```




