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

### Constructor

Vader Run plan:

Deploy Vader
Deploy Utils(vader.address)
Deploy vDao(vader.address, util.address)
Deploy vRouter(vader.address, util.address)
Set Genesis DAO vader.changeDAO(vDao.address)
Set Genesis Router vDao.setGenesisRouter(vRouter.address)

Vether Nuances

* Does not have DAO address, cannot change DAO.

1) modify Utils to not ask Vether for DAO address


```
1000000000000000000 // 10**18
1000000000000000000000000 //1m
0x0000000000000000000000000000000000000000
0x95D0C08e59bbC354eE2218Da9F82A04D7cdB6fDF //veth
0x75572098dc462f976127f59f8c97dfa291f81d8b // tkn

0x476B05e742Bd0Eed4C7cba11A8dDA72BE592B549 // math
0xCFE254e64Bb766bDb0998801F7b9F2E6762a92DB // vetherPools-2
```

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
