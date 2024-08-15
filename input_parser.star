DEFAULT_ARGS = {
    "deployment_suffix": "-001",
    "data_availability_mode": "cdk-validium",
    "zkevm_prover_image": "hermeznetwork/zkevm-prover:v6.0.0",
    "zkevm_node_image": "hermeznetwork/zkevm-node:v0.6.5",
    "cdk_node_image": "0xpolygon/cdk-validium-node:0.6.5-cdk",
    "zkevm_da_image": "0xpolygon/cdk-data-availability:0.0.7",
    "zkevm_contracts_image": "leovct/zkevm-contracts",
    "zkevm_agglayer_image": "ghcr.io/agglayer/agglayer-rs:main",
    "zkevm_bridge_service_image": "hermeznetwork/zkevm-bridge-service:v0.4.2",
    "panoptichain_image": "minhdvu/panoptichain",
    "zkevm_bridge_ui_image": "leovct/zkevm-bridge-ui:multi-network",
    "zkevm_bridge_proxy_image": "haproxy:2.9.7",
    "zkevm_sequence_sender_image": "hermeznetwork/zkevm-sequence-sender:v0.2.0-RC4",
    "cdk_erigon_node_image": "hermeznetwork/cdk-erigon:v1.0.9",
    "toolbox_image": "leovct/toolbox:0.0.1",
    "sequencer_type": "zkevm-node",
    "zkevm_hash_db_port": 50061,
    "zkevm_executor_port": 50071,
    "zkevm_aggregator_port": 50081,
    "zkevm_pprof_port": 6060,
    "zkevm_prometheus_port": 9091,
    "zkevm_data_streamer_port": 6900,
    "zkevm_rpc_http_port": 8123,
    "zkevm_rpc_ws_port": 8133,
    "zkevm_bridge_rpc_port": 8080,
    "zkevm_bridge_grpc_port": 9090,
    "zkevm_bridge_ui_port": 80,
    "zkevm_agglayer_port": 4444,
    "zkevm_dac_port": 8484,
    "blockscout_public_port": 50101,  # IANA registered ports up to 49151
    "zkevm_l2_sequencer_address": "",
    "zkevm_l2_sequencer_private_key": "",
    "zkevm_l2_aggregator_address": "",
    "zkevm_l2_aggregator_private_key": "",
    "zkevm_l2_claimtxmanager_address": "",
    "zkevm_l2_claimtxmanager_private_key": "",
    "zkevm_l2_timelock_address": "",
    "zkevm_l2_timelock_private_key": "",
    "zkevm_l2_admin_address": "",
    "zkevm_l2_admin_private_key": "",
    "zkevm_l2_loadtest_address": "",
    "zkevm_l2_loadtest_private_key": "",
    "zkevm_l2_agglayer_address": "",
    "zkevm_l2_agglayer_private_key": "",
    "zkevm_l2_dac_address": "",
    "zkevm_l2_dac_private_key": "",
    "zkevm_l2_proofsigner_address": "",
    "zkevm_l2_proofsigner_private_key": "",
    "zkevm_l2_keystore_password": "pSnv6Dh5s9ahuzGzH9RoCDrKAMddaX3m",
    "l1_chain_id": 271828,
    "l1_preallocated_mnemonic": "code code code code code code code code code code code quality",
    "l1_funding_amount": "100ether",
    "l1_rpc_url": "http://el-1-geth-lighthouse:8545",
    "l1_ws_url": "ws://el-1-geth-lighthouse:8546",
    "l1_additional_services": [],
    "l1_preset": "mainnet",
    "l1_seconds_per_slot": 12,
    "zkevm_rollup_chain_id": 10101,
    "zkevm_rollup_fork_id": 9,
    "polygon_zkevm_explorer": "https://explorer.private/",
    "l1_explorer_url": "https://sepolia.etherscan.io/",
    "zkevm_use_gas_token_contract": False,
    "trusted_sequencer_node_uri": "zkevm-node-sequencer-001:6900",
    "zkevm_aggregator_host": "zkevm-node-aggregator-001",
    "genesis_file": "templates/permissionless-node/genesis.json",
    "polycli_version": "v0.1.42",
    "workload_commands": [
        "polycli_loadtest_on_l2.sh t",  # eth transfers
        "polycli_loadtest_on_l2.sh 2",  # erc20 transfers
        "polycli_loadtest_on_l2.sh 7",  # erc721 mints
        "polycli_loadtest_on_l2.sh v3",  # uniswapv3 swaps
        "polycli_rpcfuzz_on_l2.sh",  # rpc calls
        "bridge.sh",  # bridge tokens l1 -> l2 and l2 -> l1
    ],
    "blutgang_image": "makemake1337/blutgang:0.3.5",
    "blutgang_rpc_port": 55555,
    "blutgang_admin_port": 55556,
    src_service_name: "contracts"

    root: ""
    genealogy_contract_address: ""
    genesis_storage_url: ""
    zkevm_folder: ""
}


def parse_args(args):
    return DEFAULT_ARGS | args
