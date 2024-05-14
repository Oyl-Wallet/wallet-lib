curl -s 'https://testnet.sandshrew.io/v1/6e3bc3c289591bb447c116fda149b094' \
--header 'Content-Type: application/json' \
--data '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "esplora_address::utxo",
    "params": ["tb1ppkm55mpx6nx2mex4u6f25tp8wwgswy2fjn4qwkkdrsge0wyp902szjsm9r"]
}' | jq .
