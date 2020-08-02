# Vether Pools - Incentivised Liquidity Powered By Vether

Vether Pools is a liquidity pool protocol that allows asset-agnostic provision of liquidity. Traders can swap between assets at arbitrarily low fees, but a liquidity-sensitive fee maximises revenue for stakers during periods of high demand. 

## Smart Contract

Vether Pools has the following intended design:

Staking
* Stake any asset into any pool
* Move capital between pools (unstake and stake in a single transaction)
* Withdraw partial or full capital from any pool to any asset

Swapping
* Swap from any asset to any asset



1000000000000000000 // 10**18
1000000000000000000000000 //1m
0x0000000000000000000000000000000000000000
0x95D0C08e59bbC354eE2218Da9F82A04D7cdB6fDF


### ERC-20

### Vether Public Get Methods
**WIP**

### Vether Public Transactions
**WIP**

### Core Math

```solidity

function  calcSwapOutput(uint x, uint X, uint Y) public pure returns (uint output){
        // y = (x * Y * X)/(x + X)^2
        uint numerator = x.mul(Y.mul(X));
        uint denominator = (x.add(X)).mul(x.add(X));
        return numerator.div(denominator);
    }

    function  calcSwapFee(uint x, uint X, uint Y) public pure returns (uint output){
        // y = (x * Y * x) / (x + X)^2
        uint numerator = x.mul(Y.mul(x));
        uint denominator = (x.add(X)).mul(x.add(X));
        return numerator.div(denominator);
    }

    function calcStakeUnits(uint a, uint A, uint v, uint V) public pure returns (uint units){
        // units = ((V + A) * (v * A + V * a))/(4 * V * A)
        // (part1 * (part2 + part3)) / part4
        uint part1 = V.add(A);
        uint part2 = v.mul(A);
        uint part3 = V.mul(a);
        uint numerator = part1.mul((part2.add(part3)));
        uint part4 = 4 * (V.mul(A));
        return numerator.div(part4);
    }

    function calcAsymmetricShare(uint s, uint T, uint A) public pure returns (uint share){
        // share = (s * A * (2 * T^2 - 2 * T * s + s^2))/T^3
        // (part1 * (part2 - part3 + part4)) / part5
        uint part1 = s.mul(A);
        uint part2 = T.mul(T).mul(2);
        uint part3 = T.mul(s).mul(2);
        uint part4 = s.mul(s);
        uint numerator = part1.mul(part2.sub(part3).add(part4));
        uint part5 = T.mul(T).mul(T);
        return numerator.div(part5);
    }
```

### Constructor
**WIP**


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




