local:
	kurtosis run --enclave cdk-v1 --args-file params-local.yml --image-download always .

prod:
	kurtosis run --enclave cdk-v1 --args-file params-prod.yml --image-download always .

dev:
	kurtosis run --enclave cdk-v1 --args-file params-dev.yml --image-download always .

clean:
	kurtosis clean -a