# experinator
Converts Pie Smart Pools into ExperiPies 🥧


## External deployed contracts

```
Diamond implementation: 0x1f863776975a69b6078fdafab6298d3e823e0190
Balancer factory: 0x9424B1412450D0f8Fc2255FAf6046b98213B76Bd
Smart pool implementation: 0x706f00ea85a71eb5d7c2ce2ad61dbbe62b616435
```
## Deployed contracts

```
experinator: 0xd6a2AAeb7ee0243D7d3148cCDB10C0BD1bb56336
smartpool storage doctor: 0xd7Db1aE8193A12D0ee5e1cf53D7Bcf0f20D09757
experiPie storage doctor: 0xCA4Dc78E1BB0520606195DF3BBD24638fF996852
```

## How to deploy

### Deploy diamond cut

A diamond cut determines which functions are added and their implementation. To deploy the default diamond cut you need to do the following steps.

1. Clone the repo located [here](https://github.com/pie-dao/PieVaults)

2. Install dependencies and build the project

```
    yarn
    yarn typechain
```

3. Setup the .env file

4. Deploy and save the cut

```
npx buidler deploy-pie-vault-cut --network mainnet
```

Copy and save the json output after ``CUT JSON:``

5. Verify each facet using:

```
npx buidler verify [facetAddress]
```

### Deploy the experinator

Inside this repo.

```
npx hardhat deploy-experinator --cut [PATH_TO_CUT_JSON] --diamond-implementation [AN_INSTANCE_OF_AN_INITIALISED_DIAMOND] --balancer-factory [ADDRESS_OF_THE_BALANCER_V1_FACTORY] --smart-pool-implementation [SMART_POOL_IMPLEMENTAION_CONTRACT]
```

## How to migrate a Pie Smart Pool to a PieVault

Set the proxy owner and smart pool controller to the experinator contract address.

Migrate pie

```
npx harhat to-experipie --experinator 0xd6a2AAeb7ee0243D7d3148cCDB10C0BD1bb56336 --pie [smart pool address]
```

Afterwards you need to set the fees, cap and other params if necesary

## How to migrate a PieVault to a smart pool

Set the proxy owner and diamond owner to the experinator contract

Create a JSON file with the weigths in the token. Make sure the weights are in the same order as the tokens in the pool.

Example JSON file for 3 tokens with equal weight:

```json
[
    "1000000000000000000",
    "1000000000000000000",
    "1000000000000000000"
]
```

Migrate pie

```
npx hardhat to-smart-pool --pie [PIE_ADDRESS] --experinator [EXPERINATOR_ADDRESS] --weights [PATH_TO_JSON_FILE]
```

After that you need to set the fees, cap, fee benefiary and such