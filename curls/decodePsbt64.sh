curl --location 'https://mainnet.sandshrew.io/v1/6e3bc3c289591bb447c116fda149b094' \
--header 'Content-Type: application/json' \
--data '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "btc_decodepsbt",
    "params": ["cHNidP8BAHECAAAAAXSylcOFQbI1nskmceQS35wMCSdXaqjQywF8WPolLuJyAAAAAAD/////ArgLAAAAAAAAFgAUwM681sPTyox13F7GLr5VMw75EOLkdAEAAAAAABYAFMDOvNbD08qMddxexi6+VTMO+RDiAAAAAAABAR+ghgEAAAAAABYAFMDOvNbD08qMddxexi6+VTMO+RDiAAAA"]
}' | jq .