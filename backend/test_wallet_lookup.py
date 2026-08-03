import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.wallet.web3_client import web3_client

print("--- WALLET ENVIRONMENT LOOKUP TEST ---")
print("WALLET_PRIVATE_KEY present:", bool(settings.WALLET_PRIVATE_KEY))
print("ETH_RPC_URL:", settings.ETH_RPC_URL)

address, account = web3_client.get_backend_account()
print("Derived Account Address:", address)

info = web3_client.get_wallet_info()
print("Wallet Info Result:", info)
