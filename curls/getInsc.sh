curl -s 'https://mainnet.sandshrew.io/v1/6e3bc3c289591bb447c116fda149b094' \
--header 'Content-Type: application/json' \
--data '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "ord_inscription",
    "params": ["f4a275db6411396e1398c94a479e05ee4294b05c9d47695f729608d136bf131ei0"]
}' | jq .
