curl --location 'https://testnet.sandshrew.io/v1/6e3bc3c289591bb447c116fda149b094' \
--header 'Content-Type: application/json' \
--data '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "btc_decodepsbt",
    "params": ["cHNidP8BALICAAAAAsYKJIjgTXZWgH+4SNGEJoAXuEsj+JLpEI6gNaCQstZqAAAAAAD/////90rIITkk16opx6kmDRUsG/ayEyyef8U4VlH4sfoaydwBAAAAAP////8CIgIAAAAAAAAiUSCCyZ3f5ZquRqH+KNA7nleRYeE011Ipw/Qus/ByYKjNcrQwBQAAAAAAIlEgDbdKbCbUzK3k1eaSqiwnc5EHEUmU6gdazRwRl7iBK9UAAAAAAAEBKyICAAAAAAAAIlEgDbdKbCbUzK3k1eaSqiwnc5EHEUmU6gdazRwRl7iBK9UBCEIBQOzIeW1o+TLjOabM4SDeCiuCy4bHSk/rJUNBT/wVFnSKU1AwMKerioE79V9KuZOhb10P2H31x64jdDh/H2AJgk0AAQEr/jEFAAAAAAAiUSANt0psJtTMreTV5pKqLCdzkQcRSZTqB1rNHBGXuIEr1QEIQgFAC2B4psrHjjQ6JWImPlK4ixWoEQfKFaZcYdYI5jlzw8U3DbdVs4RkkUuBKLyfajmS6wvCZOrY7/0HWur+/pAEiwAAAA=="]
}' | jq .