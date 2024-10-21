curl -s 'http://localhost:3000/v1/regtest' \
--header 'Content-Type: application/json' \
--data '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "esplora_tx",
    "params": ["4d22c695d3963ec2c1bfbc099ce7657493a5f91183758c9dbdf43a5ee54f49b8"]
}' | jq .
