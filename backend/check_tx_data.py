from web3 import Web3

tx_hash = "0xe25025a87d50e84aafe93eca2132d6221b41d70180142d893e5b1360a1ed5f67"
rpc_url = "https://ethereum-rpc.publicnode.com"

w3 = Web3(Web3.HTTPProvider(rpc_url))
tx = w3.eth.get_transaction(tx_hash)

input_hex = tx["input"].hex()
print(f"Transaction Hash: {tx_hash}")
print(f"Raw Input Hex: 0x{input_hex}")

try:
    raw_bytes = bytes.fromhex(input_hex)
    decoded_utf8 = raw_bytes.decode('utf-8')
    print(f"Decoded UTF-8 Payload: '{decoded_utf8}'")
except Exception as e:
    print(f"Failed to decode: {e}")
