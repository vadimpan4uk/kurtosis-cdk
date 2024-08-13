local:
	kurtosis run --enclave cdk-v1 --args-file params-local.yml --image-download always .

local-db:
	kurtosis run --enclave cdk-v1 --args-file params-local.yml --main-file main-db-root.star --image-download always .

local-zkevm:
	kurtosis run --enclave cdk-v1 --args-file params-local.yml --main-file main-zkevm-services.star --image-download always .

prod:
	kurtosis run --enclave cdk-v1 --args-file params-prod.yml --image-download always .

dev:
	kurtosis run --enclave cdk-v1 --args-file params-dev.yml --image-download always .

dev-db:
	kurtosis run --enclave cdk-v1 --args-file params-dev.yml --main-file main-db-root.star --image-download always .

dev-zkevm:
	kurtosis run --enclave cdk-v1 --args-file params-dev.yml --main-file main-zkevm-services.star --image-download always .

clean:
	kurtosis clean -a
