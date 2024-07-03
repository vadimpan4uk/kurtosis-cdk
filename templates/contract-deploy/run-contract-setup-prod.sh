#!/bin/bash
# This script is responsible for deploying the contracts for zkEVM/CDK.

echo_ts() {
    timestamp=$(date +"[%Y-%m-%d %H:%M:%S]")
    echo "$timestamp $1"
}

wait_for_rpc_to_be_available() {
    rpc_url="$1"
    counter=0
    max_retries=20
    until cast send --rpc-url "{{.l1_rpc_url}}" --mnemonic "{{.l1_preallocated_mnemonic}}" --value 0 "{{.zkevm_l2_sequencer_address}}"; do
        ((counter++))
        echo_ts "L1 RPC might not be ready... Retrying ($counter)..."
        if [ $counter -ge $max_retries ]; then
            echo_ts "Exceeded maximum retry attempts. Exiting."
            exit 1
        fi
        sleep 5
    done
}

# We want to avoid running this script twice.
# In the future it might make more sense to exit with an error code.
if [[ -e "/opt/zkevm/.init-complete.lock" ]]; then
    echo "This script has already been executed"
    exit
fi

# Wait for the L1 RPC to be available.
echo_ts "Waiting for the L1 RPC to be available"
wait_for_rpc_to_be_available "{{.l1_rpc_url}}"
echo_ts "L1 RPC is now available"

# Configure zkevm contract deploy parameters.
pushd /opt/zkevm-contracts || exit 1
cp /opt/contract-deploy/deploy_parameters.json /opt/zkevm-contracts/deployment/v2/deploy_parameters.json
cp /opt/contract-deploy/create_rollup_parameters.json /opt/zkevm-contracts/deployment/v2/create_rollup_parameters.json
sed -i 's#http://127.0.0.1:8545#{{.l1_rpc_url}}#' hardhat.config.ts


cp /opt/contract-deploy/genesis.json /opt/zkevm-contracts/deployment/v2/genesis.json
cp /opt/contract-deploy/deploy_*.json /opt/zkevm-contracts/deployment/v2/
cp /opt/contract-deploy/create_rollup_output.json /opt/zkevm-contracts/deployment/v2/create_rollup_output.json
cp /opt/contract-deploy/create_rollup_parameters.json /opt/zkevm-contracts/deployment/v2/create_rollup_output.json

# Combine contract deploy files.
# At this point, all of the contracts /should/ have been deployed.
# Now we can combine all of the files and put them into the general zkevm folder.
echo_ts "Combining contract deploy files"
mkdir -p /opt/zkevm
cp /opt/zkevm-contracts/deployment/v2/deploy_*.json /opt/zkevm/
cp /opt/zkevm-contracts/deployment/v2/genesis.json /opt/zkevm/
cp /opt/zkevm-contracts/deployment/v2/create_rollup_output.json /opt/zkevm/
cp /opt/zkevm-contracts/deployment/v2/create_rollup_parameters.json /opt/zkevm/
popd

# Combine contract deploy data.
pushd /opt/zkevm/ || exit 1
echo_ts "Creating combined.json"
cp genesis.json genesis.original.json
jq --slurpfile rollup create_rollup_output.json '. + $rollup[0]' deploy_output.json > combined.json

# Add the L2 GER Proxy address in combined.json (for panoptichain).
zkevm_global_exit_root_l2_address=$(jq -r '.genesis[] | select(.contractName == "PolygonZkEVMGlobalExitRootL2 proxy") | .address' /opt/zkevm/genesis.json)
jq --arg a "$zkevm_global_exit_root_l2_address" '.polygonZkEVMGlobalExitRootL2Address = $a' combined.json > c.json; mv c.json combined.json

# There are a bunch of fields that need to be renamed in order for the
# older fork7 code to be compatible with some of the fork8
# automations. This schema matching can be dropped once this is
# versioned up to 8
fork_id="{{.zkevm_rollup_fork_id}}"
if [[ fork_id -lt 8 ]]; then
    jq '.polygonRollupManagerAddress = .polygonRollupManager' combined.json > c.json; mv c.json combined.json
    jq '.deploymentRollupManagerBlockNumber = .deploymentBlockNumber' combined.json > c.json; mv c.json combined.json
    jq '.upgradeToULxLyBlockNumber = .deploymentBlockNumber' combined.json > c.json; mv c.json combined.json
    jq '.polygonDataCommitteeAddress = .polygonDataCommittee' combined.json > c.json; mv c.json combined.json
    jq '.createRollupBlockNumber = .createRollupBlock' combined.json > c.json; mv c.json combined.json
fi

# NOTE there is a disconnect in the necessary configurations here between the validium node and the zkevm node
jq --slurpfile c combined.json '.rollupCreationBlockNumber = $c[0].createRollupBlockNumber' genesis.json > g.json; mv g.json genesis.json
jq --slurpfile c combined.json '.rollupManagerCreationBlockNumber = $c[0].upgradeToULxLyBlockNumber' genesis.json > g.json; mv g.json genesis.json
jq --slurpfile c combined.json '.genesisBlockNumber = $c[0].createRollupBlockNumber' genesis.json > g.json; mv g.json genesis.json
jq --slurpfile c combined.json '.L1Config = {chainId:{{.l1_chain_id}}}' genesis.json > g.json; mv g.json genesis.json
jq --slurpfile c combined.json '.L1Config.polygonZkEVMGlobalExitRootAddress = $c[0].polygonZkEVMGlobalExitRootAddress' genesis.json > g.json; mv g.json genesis.json
jq --slurpfile c combined.json '.L1Config.polygonRollupManagerAddress = $c[0].polygonRollupManagerAddress' genesis.json > g.json; mv g.json genesis.json
jq --slurpfile c combined.json '.L1Config.polTokenAddress = $c[0].polTokenAddress' genesis.json > g.json; mv g.json genesis.json
jq --slurpfile c combined.json '.L1Config.polygonZkEVMAddress = $c[0].rollupAddress' genesis.json > g.json; mv g.json genesis.json

# Create cdk-erigon node configs
jq_script='
.genesis | map({
  (.address): {
    contractName: (if .contractName == "" then null else .contractName end),
    balance: (if .balance == "" then null else .balance end),
    nonce: (if .nonce == "" then null else .nonce end),
    code: (if .bytecode == "" then null else .bytecode end),
    storage: (if .storage == null or .storage == {} then null else (.storage | to_entries | sort_by(.key) | from_entries) end)
  }
}) | add'

# Use jq to transform the input JSON into the desired format
output_json=$(jq "$jq_script" /opt/zkevm/genesis.json)

# Handle jq errors
if [[ $? -ne 0 ]]; then
    echo "Error processing JSON with jq"
    exit 1
fi

# Write the output JSON to a file
echo "$output_json" | jq . > dynamic-kurtosis-allocs.json
if [[ $? -ne 0 ]]; then
    echo "Error writing to file dynamic-kurtosis-allocs.json"
    exit 1
fi

echo "Transformation complete. Output written to dynamic-kurtosis-allocs.json"

jq '{"root": .root, "timestamp": 0, "gasLimit": 0, "difficulty": 0}' /opt/zkevm/genesis.json > dynamic-kurtosis-conf.json

batch_timestamp=$(jq '.firstBatchData.timestamp' combined.json)

jq --arg bt "$batch_timestamp" '.timestamp |= ($bt | tonumber)' dynamic-kurtosis-conf.json > tmp_output.json

mv tmp_output.json dynamic-kurtosis-conf.json

cat dynamic-kurtosis-conf.json

# The contract setup is done!
touch .init-complete.lock
