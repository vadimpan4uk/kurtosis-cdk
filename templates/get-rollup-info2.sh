#!/bin/bash


curl -O https://daisy-dev-prepopulate.s3.eu-central-1.amazonaws.com/biolimitless/zkevm/combined.json
cp combined.json /opt/zkevm/combined.json

curl -O https://daisy-dev-prepopulate.s3.eu-central-1.amazonaws.com/biolimitless/genesis.json
cp genesis.json /opt/zkevm/genesis.json

curl -O https://daisy-dev-prepopulate.s3.eu-central-1.amazonaws.com/biolimitless/zkevm/agglayer.keystore
cp agglayer.keystore /opt/zkevm/agglayer.keystore
curl -O https://daisy-dev-prepopulate.s3.eu-central-1.amazonaws.com/biolimitless/zkevm/claimtxmanager.keystore
cp claimtxmanager.keystore /opt/zkevm/claimtxmanager.keystore
curl -O https://daisy-dev-prepopulate.s3.eu-central-1.amazonaws.com/biolimitless/zkevm/sequencer.keystore
cp sequencer.keystore /opt/zkevm/sequencer.keystore
curl -O https://daisy-dev-prepopulate.s3.eu-central-1.amazonaws.com/biolimitless/zkevm/aggregator.keystore               
cp aggregator.keystore /opt/zkevm/aggregator.keystore
curl -O https://daisy-dev-prepopulate.s3.eu-central-1.amazonaws.com/biolimitless/zkevm/proofsigner.keystore
cp proofsigner.keystore /opt/zkevm/proofsigner.keystore                      
curl -O https://daisy-dev-prepopulate.s3.eu-central-1.amazonaws.com/biolimitless/zkevm/dac.keystore
cp dac.keystore /opt/zkevm/dac.keystore
