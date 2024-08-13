Some marketplace apis have unique characteristics that need to be considered to avoid the process failing:

## Enforces only confirmed utxos to bid on offers
  Marketplaces: [UNISAT(ALL ASSETS),...]
- Unless there is AT LEAST ONE offer from a marketplace that DOES NOT have this characteristic, the 
  engine MUST process bids with ONLY confirmed UTXO
- The engine must sort offers to make sure bids for these marketplaces are processed first to exhaust confirmed UTXOs on them
 


