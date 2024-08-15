#!/bin/bash


curl -O {{.zkevm_folder}}/combined.json
cp combined.json /opt/zkevm/combined.json

curl -O {{.zkevm_folder}}/genesis.json
cp genesis.json /opt/zkevm/genesis.json

curl -O {{.zkevm_folder}}/agglayer.keystore
cp agglayer.keystore /opt/zkevm/agglayer.keystore
curl -O {{.zkevm_folder}}/claimtxmanager.keystore
cp claimtxmanager.keystore /opt/zkevm/claimtxmanager.keystore
curl -O {{.zkevm_folder}}/sequencer.keystore
cp sequencer.keystore /opt/zkevm/sequencer.keystore
curl -O {{.zkevm_folder}}/aggregator.keystore               
cp aggregator.keystore /opt/zkevm/aggregator.keystore
curl -O {{.zkevm_folder}}/proofsigner.keystore
cp proofsigner.keystore /opt/zkevm/proofsigner.keystore                      
curl -O {{.zkevm_folder}}/dac.keystore
cp dac.keystore /opt/zkevm/dac.keystore
