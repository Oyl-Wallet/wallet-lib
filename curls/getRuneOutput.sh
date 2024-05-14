curl -s 'https://testnet.sandshrew.io/v1/6e3bc3c289591bb447c116fda149b094' \
--header 'Content-Type: application/json' \
--data '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "ord_output",
    "params": ["df9274a4c9e2cfd98c00e79a8cd109000e101d88cc1fd295e9d56ab875a4c5d7:1"]
}' | jq .
