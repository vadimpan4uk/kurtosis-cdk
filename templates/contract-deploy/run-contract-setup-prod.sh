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
cp /opt/zkevm-contracts/deployment/v2/combined.json /opt/zkevm/
popd


echo "Transformation complete. Output written to dynamic-kurtosis-allocs.json"

jq '{"root": .root, "timestamp": 0, "gasLimit": 0, "difficulty": 0}' /opt/zkevm/genesis.json > dynamic-kurtosis-conf.json

batch_timestamp=$(jq '.firstBatchData.timestamp' combined.json)

jq --arg bt "$batch_timestamp" '.timestamp |= ($bt | tonumber)' dynamic-kurtosis-conf.json > tmp_output.json

mv tmp_output.json dynamic-kurtosis-conf.json

cat dynamic-kurtosis-conf.json

# The contract setup is done!
touch .init-complete.lock
