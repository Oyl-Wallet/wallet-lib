curl --location 'https://testnet.sandshrew.io/v1/6e3bc3c289591bb447c116fda149b094' \
--header 'Content-Type: application/json' \
--data '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "btc_decodepsbt",
    "params": ["cHNidP8BAH4CAAAAAaKVZFVaUVxRnzG90j9HFEAFy2GJYwsFCtefO3u07l7mAAAAAAD/////AjIAAAAAAAAAIlEgDbdKbCbUzK3k1eaSqiwnc5EHEUmU6gdazRwRl7iBK9XvtQAAAAAAABepFPwessAdxadTwazkRh+8LxWEO3HnhwAAAAAAAQEgUMMAAAAAAAAXqRT8HrLAHcWnU8Gs5EYfvC8VhDtx54cBBBYAFFWDkwepWVH4l5EyRFMYqJ2Y7DI4AAAA"]
}' | jq .