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

Base Run plan:

Deploy Base
Deploy Utils(base.address)
Deploy Dao(base.address, util.address)
Deploy router(base.address, util.address)
Set Genesis DAO base.changeDAO(Dao.address)
Set Genesis Router Dao.setGenesisRouter(router.address)

Vether Nuances

* Does not have DAO address, cannot change DAO.

1) Modify Utils to not ask Vether for DAO address, set DAO address in deploy
2) Modify Router to set DAO address in deploy (and Pool to also set)
3) Modify DAO to not ask Vether for DAO address

Deploy Vether
Deploy Utils(vether.address)
Deploy Dao(vether.address, util.address)
Deploy router(vether.address, Dao.address, util.address)
Set Genesis DAO utils.setGenesisDao(Dao.address)
Set Genesis Router Dao.setGenesisRouter(router.address)

### Upgrade DAO && Router
Deploy new Dao(vether.address, util.address)
Set Genesis DAO utils.setGenesisDao(Dao.address)
Deploy new router(vether.address, Dao.address, util.address)
Migrate Data to new Router
Set Genesis Router Dao.setGenesisRouter(router.address)
Vote for new DAO:
* 

### Upgrade DAO && Router
* Deploy Router
* Migrate Data
* Vote Router
* Move Router

## Addresses

### Kovan
0xdA9e97139937BaD5e6d1d1aBB4C9Ab937a432B7C vether
0x3CF73D6E97cB3A8EA3aEd66E0AE22e0257CD1100 USDT

#### Version1
0xc93c4a2D15815843fB4cC7b3bD0bec5135c31245 utils
0x5D63b1e364473cDe7bf5Ff13673F0CE8BeaA8de3 Dao
0x252704c3bb1eB9EE3505Bee6985e2935e406fd7d router
0x30925908521cE64FEa1C0371BC7C8535091fF9e1 router2

#### Version2
0xA490d3ba44b0058FfE3AB6Ff3e262D281c1D8abB utils
0xcB841b295fe7B151AeD65359D2B7BD120f2E1371 Dao
0xBc6f2527B99D26263122cb08Df275954f799347C router
0x9298319b33204655d7c0badd989b857ebb95b5c4 router2

0xf4C5e6046fC4394C26D9C6fE37dF0fF5969F6BF1 vpt-usdt
0xE563Ecdc4c62389A4790106C2C43F1Df2568F9d9 vpt-eth

#### Version3 
0xA490d3ba44b0058FfE3AB6Ff3e262D281c1D8abB utils
0xce25e8C1262f29D72D687F67AeD9A8620d8758FA Dao
0xc490DAdA24D628c5A6a476f00dFef3528D7df434 router

0xEc6e21fdF4D9F660fa4e91ae164d25413B577325 Dao2
0xAc3277BCe7b1f74abC42ce3E8302b62931864bC1 router2

0x25c778E8b62C15Df6586e66f0AC69775199fa5d9 vpt-usdt
0x63933653d869099d5d282f76d6b23692c7d2c32c vpt-eth

## Bugs

* amount in swap
* checkApprovals()


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
