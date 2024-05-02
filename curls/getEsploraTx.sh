curl -s 'https://testnet.sandshrew.io/v1/6e3bc3c289591bb447c116fda149b094' \
--header 'Content-Type: application/json' \
--data '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "esplora_tx",
    "params": ["470980633e3d90c361c9e62d59b9254d7006091b6c9e30ca39a7d2958fa88e80"]
}' | jq .
