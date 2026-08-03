import httpx
from web3 import Web3

address = "0x7d91c1fD68D6A2D5E668C4e007DEDdAe3Ee23F9C"

networks = [
    ("Ethereum Mainnet", "https://cloudflare-eth.com"),
    ("Mantle Mainnet", "https://rpc.mantle.xyz"),
    ("Base Mainnet", "https://mainnet.base.org"),
    ("Arbitrum One", "https://arb1.arbitrum.io/rpc"),
    ("Optimism", "https://mainnet.optimism.io"),
    ("Polygon", "https://polygon-rpc.com"),
    ("Sepolia Testnet", "https://rpc.sepolia.org")
]

print(f"\n=======================================================")
print(f"DIAGNOSTIC BALANCE CHECK FOR: {address}")
print(f"=======================================================\n")

for name, rpc_url in networks:
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={'timeout': 5}))
        if w3.is_connected():
            bal_wei = w3.eth.get_balance(address)
            bal_eth = float(w3.from_wei(bal_wei, 'ether'))
            print(f"[{name}] {bal_eth:.10f} Native Token (Wei: {bal_wei})")
        else:
            print(f"[{name}] RPC Connection failed")
    except Exception as e:
        print(f"[{name}] Error querying RPC: {e}")

print(f"\n=======================================================\n")
