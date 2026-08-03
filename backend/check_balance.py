from web3 import Web3

address = "0x7d91c1fD68D6A2D5E668C4e007DEDdAe3Ee23F9C"

rpcs = {
    "Ethereum Mainnet": "https://eth.llamarpc.com",
    "Mantle Mainnet": "https://rpc.mantle.xyz",
    "Base Mainnet": "https://mainnet.base.org",
    "Arbitrum One": "https://arb1.arbitrum.io/rpc",
    "Sepolia Testnet": "https://rpc.sepolia.org"
}

for name, rpc in rpcs.items():
    try:
        w3 = Web3(Web3.HTTPProvider(rpc))
        if w3.is_connected():
            balance_wei = w3.eth.get_balance(address)
            balance_eth = w3.from_wei(balance_wei, 'ether')
            gas_price_wei = w3.eth.gas_price
            gas_gwei = w3.from_wei(gas_price_wei, 'gwei')
            print(f"[{name}] Balance: {balance_eth} ETH | Gas: {gas_gwei:.2f} Gwei | Wei: {balance_wei}")
        else:
            print(f"[{name}] Could not connect to RPC")
    except Exception as e:
        print(f"[{name}] Error: {e}")
