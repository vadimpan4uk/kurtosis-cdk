/* eslint-disable no-await-in-loop, no-use-before-define, no-lonely-if, import/no-dynamic-require */
/* eslint-disable no-console, no-inner-declarations, no-undef, import/no-unresolved, no-restricted-syntax */
import {expect} from "chai";
import { createInterface, Interface } from 'node:readline';

import axios from 'axios';

import path = require("path");
import fs = require("fs");

import * as dotenv from "dotenv";
dotenv.config({path: path.resolve(__dirname, "../../.env")});
import yargs from "yargs/yargs";

const { once } = require('events');
/**
 * predefined example:
[
    {
        "isContract": true,
        "name": "USDT",
        "balance": "1000000000",
        "address": "0x1CDD2EaB61112697626F7b4bB0e23Da4FeBF7B7C"
    },
    {
        "isContract": false,
        "name": "some deployer",
        "balance": "1000000000",
        "address": "0x02d655B0396e40dA9fD80C0528f9C3fb488895Df"
    }
]
 */

const defaultBalance = "100000000000000000000000";

const argv = yargs(process.argv.slice(2))
    .options({
        test: {type: "boolean", default: false},
        input: {type: "string", default: "./deploy_parameters.json"},
        out: {type: "string", default: "./genesis.json"},
        predefined: {type: "string", default: "[]"},
    })
    .parse() as any;

const DEFAULT_MNEMONIC = "unable surround banana canvas slot valid pizza main dismiss fence then path";
process.env.HARDHAT_NETWORK = "hardhat";
process.env.MNEMONIC = argv.test ? DEFAULT_MNEMONIC : process.env.MNEMONIC;
import {ethers, upgrades} from "hardhat";
import {MemDB, ZkEVMDB, getPoseidon, smtUtils} from "@0xpolygonhermez/zkevm-commonjs";

import {deployPolygonZkEVMDeployer, create2Deployment, getCreate2Address} from "../helpers/deployment-helpers";
import {ProxyAdmin} from "../../typechain-types";
import {Addressable} from "ethers";

import "../helpers/utils";

const deployParameters = require(argv.input);
const pathOutputJson = path.join(__dirname, argv.out);

/*
 * bytes32 internal constant _ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;
 * bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
 */
const _ADMIN_SLOT = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103" as any;
const _IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as any;

// Genesis mainnet address:
const mainnetZkEVMDeployerAddress = "0xCB19eDdE626906eB1EE52357a27F62dd519608C2";
const mainnetZkEVMTimelockAddress = "0xBBa0935Fa93Eb23de7990b47F0D96a8f75766d13";
const mainnetProxyAdminAddress = "0x0F99738B2Fc14D77308337f3e2596b63aE7BCC4A";
const mainnetZkEVMBridgeImplementationAddress = "0x5ac4182A1dd41AeEf465E40B82fd326BF66AB82C";
const mainnetZkEVMBridgeProxyAddress = "0x2a3DD3EB832aF982ec71669E178424b10Dca2EDe";
const mainnetGlobalExitRootL2ImplementationAddress = "0x0200143Fa295EE4dffEF22eE2616c2E008D81688";

const keylessDeployerMainnet = "0x9d90066e7478496e2284E54c3548106bb4F90E50";
const deployerMainnet = "0x4c1665d6651ecEfa59B9B3041951608468b18891";

const mainnetMultisig = "0x4c1665d6651ecEfa59B9B3041951608468b18891";
const mainnetInitialZkEVMDeployerOwner = "0x4c1665d6651ecEfa59B9B3041951608468b18891";
const mainnetMinDelayTimelock = 864000;

const globalExitRootL2Address = "0xa40d5f56745a118d0906a34e69aec8c0db1cb8fa";
const zkevmAddressL2 = ethers.ZeroAddress;

async function main() {
    // Constant variables
    const attemptsDeployProxy = 20;
    const balanceBrige = BigInt("0xffffffffffffffffffffffffffffffff"); // 128 bits

    let timelockAdminAddress;
    let initialZkEVMDeployerOwner;
    let salt;
    let minDelayTimelock;

    let bridgeImplementationAddress;
    let finalBridgeImplAddress;

    let proxyBridgeAddress;
    let finalBridgeProxyAddress;

    let proxyAdminAddress;
    let finalProxyAdminAddress;

    let finalTimelockContractAdress;

    let finalzkEVMDeployerAdress;

    const finalGlobalExitRootL2ProxyAddress = globalExitRootL2Address;

    let finalGlobalExitRootL2ImplAddress;

    let finalKeylessDeployer;
    let finalDeployer;

    const genesis = [];

    // Check if it's mainnet deployment
    const isMainnet = deployParameters["isMainnet"] === true ? true : false;

    if (isMainnet === true) {
        timelockAdminAddress = mainnetMultisig;
        minDelayTimelock = mainnetMinDelayTimelock;
        salt = "0x0000000000000000000000000000000000000000000000000000000000000000"; // salt mock
        initialZkEVMDeployerOwner = mainnetInitialZkEVMDeployerOwner;

        finalzkEVMDeployerAdress = mainnetZkEVMDeployerAddress;
        finalTimelockContractAdress = mainnetZkEVMTimelockAddress;
        finalProxyAdminAddress = mainnetProxyAdminAddress;
        finalBridgeImplAddress = mainnetZkEVMBridgeImplementationAddress;
        finalBridgeProxyAddress = mainnetZkEVMBridgeProxyAddress;
        finalGlobalExitRootL2ImplAddress = mainnetGlobalExitRootL2ImplementationAddress;
        finalKeylessDeployer = keylessDeployerMainnet;
        finalDeployer = deployerMainnet;
    } else {
        // load deploy parameters
        const mandatoryDeploymentParameters = [
            "timelockAdminAddress",
            "minDelayTimelock",
            "salt",
            "initialZkEVMDeployerOwner",
        ];

        for (const parameterName of mandatoryDeploymentParameters) {
            if (deployParameters[parameterName] === undefined || deployParameters[parameterName] === "") {
                throw new Error(`Missing parameter: ${parameterName}`);
            }
        }
        ({timelockAdminAddress, minDelayTimelock, salt, initialZkEVMDeployerOwner} = deployParameters);
    }

    // Load deployer
    await ethers.provider.send("hardhat_impersonateAccount", [initialZkEVMDeployerOwner]);
    await ethers.provider.send("hardhat_setBalance", [initialZkEVMDeployerOwner, "0xffffffffffffffff"]); // 18 ethers aprox
    const deployer = await ethers.getSigner(initialZkEVMDeployerOwner);

    // Deploy PolygonZkEVMDeployer if is not deployed already
    const [zkEVMDeployerContract, keylessDeployer] = await deployPolygonZkEVMDeployer(
        initialZkEVMDeployerOwner,
        deployer
    );
    if (isMainnet === false) {
        finalDeployer = deployer.address;
        finalKeylessDeployer = keylessDeployer;
        finalzkEVMDeployerAdress = zkEVMDeployerContract.target;
    }
    /*
     * Deploy Bridge
     * Deploy admin --> implementation --> proxy
     */

    // Deploy proxy admin:
    const proxyAdminFactory = await ethers.getContractFactory(
        "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin",
        deployer
    );
    const deployTransactionAdmin = (await proxyAdminFactory.getDeployTransaction()).data;
    const dataCallAdmin = proxyAdminFactory.interface.encodeFunctionData("transferOwnership", [deployer.address]);
    [proxyAdminAddress] = await create2Deployment(
        zkEVMDeployerContract,
        salt,
        deployTransactionAdmin,
        dataCallAdmin,
        deployer,
        null
    );

    if (isMainnet === false) {
        finalProxyAdminAddress = proxyAdminAddress;
    }

    // Deploy implementation PolygonZkEVMBridge
    const polygonZkEVMBridgeFactory = await ethers.getContractFactory("PolygonZkEVMBridgeV2", deployer);
    const deployTransactionBridge = (await polygonZkEVMBridgeFactory.getDeployTransaction()).data;
    // Mandatory to override the gasLimit since the estimation with create are mess up D:
    const overrideGasLimit = BigInt(5500000);
    [bridgeImplementationAddress] = await create2Deployment(
        zkEVMDeployerContract,
        salt,
        deployTransactionBridge,
        null,
        deployer,
        overrideGasLimit
    );

    if (isMainnet === false) {
        finalBridgeImplAddress = bridgeImplementationAddress;
    }
    // Do not initialize the bridge!

    /*
     * deploy proxy
     * Do not initialize directly the proxy since we want to deploy the same code on L2 and this will alter the bytecode deployed of the proxy
     */
    const transparentProxyFactory = await ethers.getContractFactory(
        "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy",
        deployer
    );
    const initializeEmptyDataProxy = "0x";
    const deployTransactionProxy = (
        await transparentProxyFactory.getDeployTransaction(
            bridgeImplementationAddress as string, // must have bytecode
            proxyAdminAddress as string,
            initializeEmptyDataProxy
        )
    ).data;

    [proxyBridgeAddress] = await create2Deployment(
        zkEVMDeployerContract,
        salt,
        deployTransactionProxy,
        null,
        deployer,
        null
    );

    if (isMainnet === false) {
        finalBridgeProxyAddress = proxyBridgeAddress;
    }

    // Import OZ manifest the deployed contracts, its enough to import just the proyx, the rest are imported automatically ( admin/impl)
    await upgrades.forceImport(proxyBridgeAddress as string, polygonZkEVMBridgeFactory, "transparent" as any);

    /*
     *Deployment Global exit root manager
     */
    const PolygonZkEVMGlobalExitRootL2Factory = await ethers.getContractFactory(
        "PolygonZkEVMGlobalExitRootL2",
        deployer
    );
    let polygonZkEVMGlobalExitRootL2;
    for (let i = 0; i < attemptsDeployProxy; i++) {
        try {
            polygonZkEVMGlobalExitRootL2 = await upgrades.deployProxy(PolygonZkEVMGlobalExitRootL2Factory, [], {
                initializer: false,
                constructorArgs: [finalBridgeProxyAddress],
                unsafeAllow: ["constructor", "state-variable-immutable"],
            });
            break;
        } catch (error: any) {
            console.log(`attempt ${i}`);
            console.log("upgrades.deployProxy of polygonZkEVMGlobalExitRootL2 ", error.message);
        }

        // reach limits of attempts
        if (i + 1 === attemptsDeployProxy) {
            throw new Error("polygonZkEVMGlobalExitRootL2 contract has not been deployed");
        }
    }

    // Assert admin address
    expect(await upgrades.erc1967.getAdminAddress(polygonZkEVMGlobalExitRootL2?.target as string)).to.be.equal(
        proxyAdminAddress
    );
    expect(await upgrades.erc1967.getAdminAddress(proxyBridgeAddress as string)).to.be.equal(proxyAdminAddress);

    const timelockContractFactory = await ethers.getContractFactory("PolygonZkEVMTimelock", deployer);
    const timelockContract = await timelockContractFactory.deploy(
        minDelayTimelock,
        [timelockAdminAddress],
        [timelockAdminAddress],
        timelockAdminAddress,
        zkevmAddressL2
    );
    await timelockContract.waitForDeployment();
    if (isMainnet === false) {
        finalTimelockContractAdress = timelockContract.target;
    }

    // Transfer ownership of the proxyAdmin to timelock
    const proxyAdminInstance = proxyAdminFactory.attach(proxyAdminAddress as string) as ProxyAdmin;
    await (await proxyAdminInstance.connect(deployer).transferOwnership(finalTimelockContractAdress as string)).wait();

    // Recreate genesis with the current information:

    // ZKEVMDeployer
    const zkEVMDeployerInfo = await getAddressInfo(zkEVMDeployerContract.target);
    genesis.push({
        contractName: "PolygonZkEVMDeployer",
        balance: defaultBalance,
        nonce: zkEVMDeployerInfo.nonce.toString(),
        address: finalzkEVMDeployerAdress,
        bytecode: zkEVMDeployerInfo.bytecode,
        storage: zkEVMDeployerInfo.storage,
    });

    // Proxy Admin
    const proxyAdminInfo = await getAddressInfo(proxyAdminAddress as string);
    genesis.push({
        contractName: "ProxyAdmin",
        balance: defaultBalance,
        nonce: proxyAdminInfo.nonce.toString(),
        address: finalProxyAdminAddress,
        bytecode: proxyAdminInfo.bytecode,
        storage: proxyAdminInfo.storage,
    });

    // Bridge implementation
    const bridgeImplementationInfo = await getAddressInfo(bridgeImplementationAddress as string);
    genesis.push({
        contractName: "PolygonZkEVMBridge implementation",
        balance: defaultBalance,
        nonce: bridgeImplementationInfo.nonce.toString(),
        address: finalBridgeImplAddress,
        bytecode: bridgeImplementationInfo.bytecode,
        // storage: bridgeImplementationInfo.storage, implementation do not have storage
    });

    // Bridge proxy
    const bridgeProxyInfo = await getAddressInfo(proxyBridgeAddress as string);
    // Override admin and implementation slots:
    bridgeProxyInfo.storage[_ADMIN_SLOT] = ethers.zeroPadValue(finalProxyAdminAddress as string, 32);
    bridgeProxyInfo.storage[_IMPLEMENTATION_SLOT] = ethers.zeroPadValue(finalBridgeImplAddress as string, 32);

    genesis.push({
        contractName: "PolygonZkEVMBridge proxy",
        balance: balanceBrige,
        nonce: bridgeProxyInfo.nonce.toString(),
        address: finalBridgeProxyAddress,
        bytecode: bridgeProxyInfo.bytecode,
        storage: bridgeProxyInfo.storage,
    });

    // polygonZkEVMGlobalExitRootL2 implementation
    const implGlobalExitRootL2 = await upgrades.erc1967.getImplementationAddress(
        polygonZkEVMGlobalExitRootL2?.target as string
    );
    const implGlobalExitRootL2Info = await getAddressInfo(implGlobalExitRootL2);

    if (isMainnet === false) {
        finalGlobalExitRootL2ImplAddress = implGlobalExitRootL2;
    }

    genesis.push({
        contractName: "PolygonZkEVMGlobalExitRootL2 implementation",
        balance: defaultBalance,
        nonce: implGlobalExitRootL2Info.nonce.toString(),
        address: finalGlobalExitRootL2ImplAddress,
        bytecode: implGlobalExitRootL2Info.bytecode,
        // storage: implGlobalExitRootL2Info.storage, , implementation do not have storage
    });

    // polygonZkEVMGlobalExitRootL2 proxy
    const proxyGlobalExitRootL2Info = await getAddressInfo(polygonZkEVMGlobalExitRootL2?.target as string);

    proxyGlobalExitRootL2Info.storage[_ADMIN_SLOT] = ethers.zeroPadValue(finalProxyAdminAddress as string, 32);
    proxyGlobalExitRootL2Info.storage[_IMPLEMENTATION_SLOT] = ethers.zeroPadValue(
        finalGlobalExitRootL2ImplAddress as string,
        32
    );

    genesis.push({
        contractName: "PolygonZkEVMGlobalExitRootL2 proxy",
        balance: defaultBalance,
        nonce: proxyGlobalExitRootL2Info.nonce.toString(),
        address: finalGlobalExitRootL2ProxyAddress,
        bytecode: proxyGlobalExitRootL2Info.bytecode,
        storage: proxyGlobalExitRootL2Info.storage,
    });

    // Timelock
    const timelockInfo = await getAddressInfo(timelockContract.target);

    /*
     * Since roles are used, most storage are writted in peusdoRandom storage slots
     * bytes32 public constant TIMELOCK_ADMIN_ROLE = keccak256("TIMELOCK_ADMIN_ROLE");
     * bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
     * bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
     * bytes32 public constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");
     */
    const timelockRolesHash = [
        ethers.id("TIMELOCK_ADMIN_ROLE"),
        ethers.id("PROPOSER_ROLE"),
        ethers.id("EXECUTOR_ROLE"),
        ethers.id("CANCELLER_ROLE"),
    ];

    for (let i = 0; i < timelockRolesHash.length; i++) {
        const rolesMappingStoragePositionStruct = 0;
        const storagePosition = ethers.solidityPackedKeccak256(
            ["uint256", "uint256"],
            [timelockRolesHash[i], rolesMappingStoragePositionStruct]
        );

        // check timelock address manager, and timelock address itself
        const addressArray = [timelockAdminAddress, timelockContract.target];
        for (let j = 0; j < addressArray.length; j++) {
            const storagePositionRole = ethers.solidityPackedKeccak256(
                ["uint256", "uint256"],
                [addressArray[j], storagePosition]
            );
            const valueRole = await ethers.provider.getStorage(timelockContract.target, storagePositionRole);
            if (valueRole !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                timelockInfo.storage[storagePositionRole] = valueRole;
            }
        }
        const roleAdminSlot = ethers.zeroPadValue(ethers.toQuantity(ethers.toBigInt(storagePosition) + 1n), 32);
        const valueRoleAdminSlot = await ethers.provider.getStorage(timelockContract.target, roleAdminSlot);
        if (valueRoleAdminSlot !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
            timelockInfo.storage[roleAdminSlot] = valueRoleAdminSlot;
        }
    }

    genesis.push({
        contractName: "PolygonZkEVMTimelock",
        balance: defaultBalance,
        nonce: timelockInfo.nonce.toString(),
        address: finalTimelockContractAdress,
        bytecode: timelockInfo.bytecode,
        storage: timelockInfo.storage,
    });

    const predefined = JSON.parse(argv.predefined);
    if (predefined.length) {
        for (const predefinedData of predefined) {
            const info = predefinedData.isContract === true ? await getAddressInfoLocal(predefinedData.address) : await getAddressInfo(predefinedData.address);
            if (predefinedData.isContract === true) {
                const contractStorage = {...info.storage};
                if (predefinedData.address.toLowerCase() === '0x72F853E9E202600c5017B5A060168603c3ed7368'.toLowerCase()) {
                    const response = await axios.get('https://daisy-dev-prepopulate.s3.eu-central-1.amazonaws.com/dev/storage.txt', {
                            responseType: 'stream',
                          });
            
                    const lines = createInterface({
                        input: response.data,
                    });
                    let i = 0;
                    // eslint-disable-next-line no-restricted-syntax
                    for await (const line of lines) {
                        const [key, value] = line.split(':').map((item) => item.trim().replaceAll('"', '').replace(',', ''));
                        contractStorage[key] = value; 
                    }
                }
                genesis.push({
                    contractName: predefinedData.name,
                    balance: predefinedData.balance,
                    nonce: info.nonce.toString(),
                    address: predefinedData.address,
                    bytecode: info.bytecode,
                    storage: contractStorage,
                });
            } else if (info.nonce.toString() !==  'undefined') {
                genesis.push({
                    accountName: predefinedData.name,
                    balance: predefinedData.balance,
                    nonce: info.nonce.toString(),
                    address: predefinedData.address,
                });
            }
        }
    }

    // Put nonces on deployers

    // Keyless deployer
    genesis.push({
        accountName: "keyless Deployer",
        balance: defaultBalance,
        nonce: "1",
        address: finalKeylessDeployer,
    });

    // deployer
    const deployerInfo = await getAddressInfo(deployer.address);
    genesis.push({
        accountName: "deployer",
        balance: defaultBalance,
        nonce: deployerInfo.nonce.toString(),
        address: finalDeployer,
    });

    // if (deployParameters.test) {
        // Add tester account with ether
    genesis[genesis.length - 1].balance = defaultBalance;
    // }

    // calculate root
    const poseidon = await getPoseidon();
    const {F} = poseidon;
    const db = new MemDB(F);
    const genesisRoot = [F.zero, F.zero, F.zero, F.zero];
    const accHashInput = [F.zero, F.zero, F.zero, F.zero];
    const defaultChainId = 1000;

    const zkEVMDB = await ZkEVMDB.newZkEVM(
        db,
        poseidon,
        genesisRoot,
        accHashInput,
        genesis,
        null,
        null,
        defaultChainId
    );

    const rootOutputJson = path.join(__dirname, './root.json');
    fs.writeFileSync(
        rootOutputJson,
        JSON.stringify(
            {
                root: smtUtils.h4toString(zkEVMDB.stateRoot),
            },
            null,
            1
        )
    );
    const writableStream = fs.createWriteStream(pathOutputJson);
    writableStream.write(`{`);
    writableStream.write(`"root": "${smtUtils.h4toString(zkEVMDB.stateRoot)}",`);
    writableStream.write(`"genesis": [`);
    for (let i = 0; i < genesis.length; i++) {
        const item = genesis[i];
        writableStream.write(`{`);
        if (item.contractName) {
            writableStream.write(`"contractName": "${item.contractName}",`);
        }
        if (item.accountName) {
            writableStream.write(`"accountName": "${item.accountName}",`);
        }
        writableStream.write(`"balance": "${item.balance}",`);
        writableStream.write(`"nonce": "${item.nonce}",`);
        writableStream.write(`"address": "${item.address}"`);
        if (item.bytecode) {
            writableStream.write(`, "bytecode": "${item.bytecode}"`);
        }
        if (item.storage) {
            writableStream.write(`, "storage": {`);
            const keys = Object.keys(item.storage);
            for (let j = 0; j < keys.length; j++) {
                const key = keys[j];
                writableStream.write(`"${key}": "${item.storage[key]}"`);
                if (j !== keys.length - 1) {
                    writableStream.write(`,`);
                }
            }
            if (item.address.toLowerCase() === '0x72F853E9E202600c5017B5A060168603c3ed7368'.toLowerCase()) {
                const response = await axios.get('https://daisy-dev-prepopulate.s3.eu-central-1.amazonaws.com/dev/storage.txt', {
                        responseType: 'stream',
                      });
        
                const lines = createInterface({
                    input: response.data,
                });
                let i = 0;
                // eslint-disable-next-line no-restricted-syntax
                for await (const line of lines) {
                    writableStream.write(line);
                }
            }
            writableStream.write(`}`);
        }
        writableStream.write(`}`);
        if (i !== genesis.length - 1) {
            writableStream.write(`,`);
        }
    }
    writableStream.write(`]`);
    writableStream.write(`}`);
    writableStream.end();
    await once(writableStream, 'finish');

    console.log('Genesis file is closed and all data has been flushed');
    // fs.writeFileSync(
    //     pathOutputJson,
    //     JSON.stringify(
    //         {
    //             root: smtUtils.h4toString(zkEVMDB.stateRoot),
    //             genesis,
    //         },
    //         null,
    //         1
    //     )
    // );
}


main().catch((e) => {
    console.error(e);
    process.exit(1);
});

async function getAddressInfo(address: string | Addressable) {
    const nonce = await ethers.provider.getTransactionCount(address);
    const bytecode = await ethers.provider.getCode(address);

    const storage = {} as {
        [key: string]: number | string;
    };

    for (let i = 0; i < 200; i++) {
        const storageValue = await ethers.provider.getStorage(address, i);
        if (storageValue !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
            storage[ethers.toBeHex(i, 32)] = storageValue;
        }
    }

    const valueAdminSlot = await ethers.provider.getStorage(address, _ADMIN_SLOT);
    if (valueAdminSlot !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        storage[_ADMIN_SLOT] = valueAdminSlot;
    }
    const valuImplementationSlot = await ethers.provider.getStorage(address, _IMPLEMENTATION_SLOT);
    if (valuImplementationSlot !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        storage[_IMPLEMENTATION_SLOT] = valuImplementationSlot;
    }

    return {nonce, bytecode, storage};
}

async function getStorage(address: string, key: string): Promise<void> {
    const url = 'http://172.31.45.162:8545';
    const provider = ethers.getDefaultProvider(url);
    const info = await provider.getStorage(address, key);
    console.log('---------- info', address, key, info);
}

async function getAddressInfoLocal(address: string | Addressable) {
    const url = 'http://172.31.45.162:8545';
    const provider = ethers.getDefaultProvider(url);
    const nonce = await provider.getTransactionCount(address);
    const bytecode = await provider.getCode(address);

    const storage = {} as {
        [key: string]: number | string;
    };

    for (let i = 0; i < 200; i++) {
        const storageValue = await provider.getStorage(address, i);
        if (storageValue !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
            storage[ethers.toBeHex(i, 32)] = storageValue;
        }
    }

    const valueAdminSlot = await provider.getStorage(address, _ADMIN_SLOT);
    if (valueAdminSlot !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        storage[_ADMIN_SLOT] = valueAdminSlot;
    }
    const valuImplementationSlot = await provider.getStorage(address, _IMPLEMENTATION_SLOT);
    if (valuImplementationSlot !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        storage[_IMPLEMENTATION_SLOT] = valuImplementationSlot;
    }

    return {nonce, bytecode, storage};
}


/**
| Name           | Type                                    | Slot | Offset | Bytes | Value                                             | Hex Value                                                          | Contract                    |
|----------------|-----------------------------------------|------|--------|-------|---------------------------------------------------|--------------------------------------------------------------------|-----------------------------|
| owner          | address                                 | 0    | 0      | 20    | 1390849295786071768276380950238675083608645509734 | 0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266 | src/Genealogy.sol:Genealogy |
| authority      | contract Authority                      | 1    | 0      | 20    | 36939424397330556992472503362256006315527366703   | 0x00000000000000000000000006786bcbc114bbfa670e30a1ac35dfd1310be82f | src/Genealogy.sol:Genealogy |
| genealogy      | mapping(uint256 => struct NodeLib.Node) | 2    | 0      | 32    | 0                                                 | 0x0000000000000000000000000000000000000000000000000000000000000000 | src/Genealogy.sol:Genealogy |
| nodeIdOf       | mapping(address => uint256)             | 3    | 0      | 32    | 0                                                 | 0x0000000000000000000000000000000000000000000000000000000000000000 | src/Genealogy.sol:Genealogy |
| nameRegistered | mapping(bytes32 => bool)                | 4    | 0      | 32    | 0                                                 | 0x0000000000000000000000000000000000000000000000000000000000000000 | src/Genealogy.sol:Genealogy |
| currentNodeId  | uint256                                 | 5    | 0      | 32    | 250250                                            | 0x000000000000000000000000000000000000000000000000000000000003d18a | src/Genealogy.sol:Genealogy |
 */
async function getAddressInfoRpc(address: string | Addressable) {
    const url = 'http://172.31.45.162:8545';
    const provider = ethers.getDefaultProvider(url);
    const nonce = await provider.getTransactionCount(address);
    const bytecode = await provider.getCode(address);

    const storage = {} as {
        [key: string]: number | string;
    };

    const r = { 
         "rootEvent": {
             "name": "crowdfund",
             "parent": "0x0000000000000000000000000000000000000000",
             "user": "0x9b4c3e7fc45e3bd3c4a561c8c6149d4fe695eb32",
             "timestamp": 1610193528
         }
    }

    const dataFiles = [
        '/opt/contract-deploy/encoded-registration-events-1.json', 
        '/opt/contract-deploy/encoded-registration-events-2.json',
        '/opt/contract-deploy/encoded-registration-events-3.json',
        '/opt/contract-deploy/encoded-registration-events-4.json', 
        '/opt/contract-deploy/encoded-registration-events-5.json',
        '/opt/contract-deploy/encoded-registration-events-6.json',
        '/opt/contract-deploy/encoded-registration-events-7.json', 
        '/opt/contract-deploy/encoded-registration-events-8.json',
        '/opt/contract-deploy/encoded-registration-events-9.json',
    ];
    const data = dataFiles.reduce((acc, file) => [...acc, ...JSON.parse(fs.readFileSync(file)).userEvents], []);
    
    const coder = ethers.AbiCoder.defaultAbiCoder();

    const outFilename = path.join(__dirname, './storage.txt');
    for (let i = 0; i < 200; i++) {
        const storageValue = await ethers.provider.getStorage(address, i);
        if (storageValue !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
            storage[ethers.toBeHex(i, 32)] = storageValue;
        } else if (i === 2) {
            const storagePositionRoot = ethers.solidityPackedKeccak256(
                ["uint256", "uint256"],
                [r.rootEvent.user, 3]
            );
            const nodeIdRootValue = await provider.getStorage(address, storagePositionRoot);
            storage[storagePositionRoot] = nodeIdRootValue;

            // mapping(uint256 => NodeLib.Node) internal genealogy;
            const storagePositionGenealogyRoot = ethers.solidityPackedKeccak256(
                ["uint256", "uint256"],
                [nodeIdRootValue, 2]
            );
            const genealogyRootValue = await provider.getStorage(address, storagePositionGenealogyRoot);
            storage[storagePositionGenealogyRoot] = genealogyRootValue;

            for(let i = 0; i < data.length; i++) {
                if (i % 1000) {
                    console.log(' process 2&3', i, 'from ', data.length);
                }
                const storagePosition = ethers.solidityPackedKeccak256(
                    ["uint256", "uint256"],
                    [data[i].user, 3]
                );  
                const value = await provider.getStorage(address, storagePosition);
                storage[storagePosition] = value;
                fs.writeFileSync(
                    outFilename, `${storagePosition} ${value}\n`, {flag: 'a'}
                );
                
                const storagePositionGenealogy = ethers.solidityPackedKeccak256(
                    ["uint256", "uint256"],
                    [value, 2]
                );
                const genealogyValue = await provider.getStorage(address, storagePositionGenealogy);
                storage[storagePositionGenealogy] = genealogyValue;
                fs.writeFileSync(
                    outFilename, `${storagePositionGenealogy} ${genealogyValue}\n`, {flag: 'a'}
                );
            }  
        } else if (i === 4) {
            const storagePositionRoot = ethers.solidityPackedKeccak256(
                ["uint256", "uint256"],
                [ethers.keccak256(coder.encode(['string'], [r.rootEvent.name])), 2]
            );
            const nameRootValue = await provider.getStorage(address, storagePositionRoot);
            storage[storagePositionRoot] = nameRootValue;
            for(let i = 0; i < data.length; i++) {
                if (i % 1000) {
                    console.log(' process 4', i, 'from ', data.length);
                }
                const storagePosition = ethers.solidityPackedKeccak256(
                    ["uint256", "uint256"],
                    [ethers.keccak256(coder.encode(['string'], [data[i].name])), 2]
                );  
                const value = await provider.getStorage(address, storagePosition);
                storage[storagePosition] = value;
                fs.writeFileSync(
                    outFilename, `${storagePosition} ${value}\n`, {flag: 'a'}
                );
            }
        }
    }

    // doesn't exist 
    const valueAdminSlot = await provider.getStorage(address, _ADMIN_SLOT);
    if (valueAdminSlot !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        storage[_ADMIN_SLOT] = valueAdminSlot;
    }
    const valuImplementationSlot = await provider.getStorage(address, _IMPLEMENTATION_SLOT);
    if (valuImplementationSlot !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        storage[_IMPLEMENTATION_SLOT] = valuImplementationSlot;
    }

    return {nonce, bytecode, storage};
}
