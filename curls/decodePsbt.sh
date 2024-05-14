curl --location 'https://testnet.sandshrew.io/v1/6e3bc3c289591bb447c116fda149b094' \
--header 'Content-Type: application/json' \
--data '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "btc_decoderawtransaction",
    "params": ["/hpetL8WVaD0EJJHp9q5Xnlt1EW1m0HHOH2s4Ex1ZQ1hryUlxkSdjRDCfItgd6+FYCvkKqklo8U8AAQErECcAAAAAAAAiUSANt0psJtTMreTV5pKqLCdzkQcRSZTqB1rNHBGXuIEr1QEIQgFAY8AypyVM3CvYtExqQ1Ypj68E2KCBD42eo+DxUY/++J2JG3ogB+3OLE8tCrCoENvtHDOwEB5MhP0GNOX2pctAVAAAAAA="]
}' | jq .