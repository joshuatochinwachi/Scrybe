from typing import Tuple, Dict, Any, Optional, List
from web3 import Web3
from eth_account import Account
from app.config import settings

from datetime import datetime, timezone

FALLBACK_RPCS: List[str] = [
    settings.ETH_RPC_URL or "https://ethereum-rpc.publicnode.com",
    "https://ethereum-rpc.publicnode.com",
    "https://1rpc.io/eth",
    "https://eth.drpc.org",
    "https://rpc.ankr.com/eth",
    "https://eth-mainnet.public.blastapi.io"
]

HTTP_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json'
}

# In-memory store for immediate transaction history availability
RECENT_BROADCASTS: List[Dict[str, Any]] = []

class Web3ClientManager:
    def __init__(self):
        self._w3: Optional[Web3] = None
        self._active_rpc: str = ""

    def record_broadcast(self, item: Dict[str, Any]):
        """Record broadcast transaction for immediate history availability."""
        # Avoid duplicate
        if not any(x["tx_hash"] == item["tx_hash"] for x in RECENT_BROADCASTS):
            RECENT_BROADCASTS.insert(0, item)

    def get_recent_broadcasts(self) -> List[Dict[str, Any]]:
        return list(RECENT_BROADCASTS)

    def _get_working_w3(self) -> Web3:
        """Returns a connected Web3 provider with robust RPC verification and fallback support."""
        if self._w3 is not None:
            try:
                # Test real JSON-RPC call
                _ = self._w3.eth.block_number
                return self._w3
            except Exception:
                self._w3 = None

        # Iterate over fallback endpoints
        for rpc in FALLBACK_RPCS:
            if not rpc:
                continue
            try:
                provider = Web3(Web3.HTTPProvider(rpc, request_kwargs={'headers': HTTP_HEADERS, 'timeout': 5}))
                # Test block_number to ensure method calls are actually fulfilled
                _ = provider.eth.block_number
                self._w3 = provider
                self._active_rpc = rpc
                return provider
            except Exception:
                continue

        # Ultimate fallback
        fallback = Web3(Web3.HTTPProvider("https://ethereum-rpc.publicnode.com", request_kwargs={'headers': HTTP_HEADERS}))
        self._w3 = fallback
        return fallback

    @property
    def w3(self) -> Web3:
        return self._get_working_w3()

    def get_backend_account(self) -> Tuple[str, Optional[Account]]:
        private_key = settings.WALLET_PRIVATE_KEY
        if not private_key:
            return ("0x0000000000000000000000000000000000000000", None)
        try:
            account = Account.from_key(private_key)
            return (account.address, account)
        except Exception as e:
            return ("0x0000000000000000000000000000000000000000", None)

    def get_wallet_info(self) -> Dict[str, Any]:
        address, _ = self.get_backend_account()
        
        balance_eth = "0.0"
        gas_price_gwei = 0.0
        connected = False

        if address != "0x0000000000000000000000000000000000000000":
            w3_instance = self.w3
            connected = True
            
            # 1. Query Balance
            try:
                balance_wei = w3_instance.eth.get_balance(address)
                val_eth = float(w3_instance.from_wei(balance_wei, 'ether'))
                if val_eth == 0:
                    balance_eth = "0.0"
                elif val_eth < 0.001:
                    balance_eth = f"{val_eth:.8f}".rstrip('0').rstrip('.')
                else:
                    balance_eth = f"{val_eth:.6f}".rstrip('0').rstrip('.')
            except Exception as e:
                balance_eth = "0.0"

            # 2. Query Gas Price
            try:
                gas_price_wei = w3_instance.eth.gas_price
                gas_price_gwei = round(float(w3_instance.from_wei(gas_price_wei, 'gwei')), 2)
            except Exception as e:
                gas_price_gwei = 15.0  # Fallback gas estimate

        return {
            "address": address,
            "balance_eth": balance_eth,
            "gas_price_gwei": gas_price_gwei,
            "connected": connected,
            "chain_id": 1,
            "active_rpc": self._active_rpc
        }

    def validate_and_checksum_address(self, address: str) -> str:
        if not address or not Web3.is_address(address):
            raise ValueError(f"Invalid Ethereum address: {address}")
        checksummed = Web3.to_checksum_address(address)
        if checksummed == "0x0000000000000000000000000000000000000000":
            raise ValueError("Recipient address cannot be the zero address")
        return checksummed

    def encode_idm_payload(self, message: str) -> bytes:
        """Encode free text payload into UTF-8 hex bytes. No prefix — raw message only."""
        # Strip any IDM: prefix the user may have typed manually
        clean_message = message.strip()
        if clean_message.startswith("IDM: "):
            clean_message = clean_message[5:].strip()
        elif clean_message.startswith("IDM:"):
            clean_message = clean_message[4:].strip()

        encoded_bytes = clean_message.encode('utf-8')

        if len(encoded_bytes) > settings.MAX_IDM_BYTES:
            raise ValueError(f"Message size ({len(encoded_bytes)} bytes) exceeds MAX_IDM_BYTES ({settings.MAX_IDM_BYTES} bytes)")

        return encoded_bytes

    def estimate_idm_gas(self, to_address: str, message: str) -> Dict[str, Any]:
        checksum_to = self.validate_and_checksum_address(to_address)
        from_address, _ = self.get_backend_account()
        payload_bytes = self.encode_idm_payload(message)
        payload_hex = "0x" + payload_bytes.hex()

        w3_instance = self.w3

        try:
            gas_price_wei = w3_instance.eth.gas_price
            gas_price_gwei = round(float(w3_instance.from_wei(gas_price_wei, 'gwei')), 2)
        except Exception:
            gas_price_gwei = 15.0
            gas_price_wei = w3_instance.to_wei(15, 'gwei')

        if gas_price_gwei > settings.GAS_PRICE_CEILING_GWEI:
            raise ValueError(f"Current gas price ({gas_price_gwei} Gwei) exceeds ceiling ({settings.GAS_PRICE_CEILING_GWEI} Gwei)")

        # Estimate gas limit
        tx_dict = {
            'from': from_address,
            'to': checksum_to,
            'value': 0,
            'data': payload_bytes
        }
        
        try:
            estimated_gas_units = w3_instance.eth.estimate_gas(tx_dict)
            gas_limit = int(estimated_gas_units * 1.1)
        except Exception:
            byte_cost = len(payload_bytes) * 16
            gas_limit = 21000 + byte_cost + 10000

        estimated_fee_wei = gas_limit * gas_price_wei
        estimated_fee_eth = str(round(float(w3_instance.from_wei(estimated_fee_wei, 'ether')), 6))
        
        eth_usd_price = 3100.0
        estimated_fee_usd = str(round(float(w3_instance.from_wei(estimated_fee_wei, 'ether')) * eth_usd_price, 2))

        return {
            "to": checksum_to,
            "gas_limit": gas_limit,
            "gas_price_gwei": gas_price_gwei,
            "estimated_fee_eth": estimated_fee_eth,
            "estimated_fee_usd": estimated_fee_usd,
            "payload_bytes": len(payload_bytes),
            "payload_hex": payload_hex
        }

    def build_sign_and_broadcast_idm(self, to_address: str, message: str) -> Dict[str, Any]:
        checksum_to = self.validate_and_checksum_address(to_address)
        from_address, account = self.get_backend_account()

        if not account:
            raise ValueError("No private key configured on backend server")

        payload_bytes = self.encode_idm_payload(message)
        w3_instance = self.w3

        # 1. Fetch fresh gas prices
        try:
            gas_price_wei = w3_instance.eth.gas_price
            gas_price_gwei = float(w3_instance.from_wei(gas_price_wei, 'gwei'))
        except Exception:
            gas_price_wei = w3_instance.to_wei(15, 'gwei')
            gas_price_gwei = 15.0
        
        if gas_price_gwei > settings.GAS_PRICE_CEILING_GWEI:
            raise ValueError(f"Current gas price ({round(gas_price_gwei, 2)} Gwei) exceeds ceiling ({settings.GAS_PRICE_CEILING_GWEI} Gwei)")

        # 2. Fetch fresh nonce from pending tx pool
        nonce = w3_instance.eth.get_transaction_count(from_address, 'pending')

        # 3. Estimate gas limit
        try:
            gas_limit = int(w3_instance.eth.estimate_gas({
                'from': from_address,
                'to': checksum_to,
                'value': 0,
                'data': payload_bytes
            }) * 1.1)
        except Exception:
            gas_limit = 21000 + (len(payload_bytes) * 16) + 10000

        # EIP-1559 parameters or legacy gas price
        try:
            latest_block = w3_instance.eth.get_block('latest')
            base_fee = latest_block.get('baseFeePerGas', gas_price_wei)
        except Exception:
            base_fee = gas_price_wei

        max_priority_fee = w3_instance.to_wei(1.5, 'gwei')
        max_fee_per_gas = base_fee * 2 + max_priority_fee

        tx = {
            'nonce': nonce,
            'to': checksum_to,
            'value': 0,
            'gas': gas_limit,
            'maxFeePerGas': max_fee_per_gas,
            'maxPriorityFeePerGas': max_priority_fee,
            'data': payload_bytes,
            'chainId': w3_instance.eth.chain_id
        }

        # 4. Simulate transaction locally before signing
        try:
            w3_instance.eth.call({'from': from_address, 'to': checksum_to, 'value': 0, 'data': payload_bytes})
        except Exception as e:
            print(f"[Scrybe Warning] eth_call simulation warning: {e}")

        # 5. Sign raw transaction server-side
        signed_tx = account.sign_transaction(tx)

        # 6. Broadcast raw transaction
        tx_hash_bytes = w3_instance.eth.send_raw_transaction(signed_tx.raw_transaction)
        tx_hash = "0x" + tx_hash_bytes.hex()

        result = {
            "tx_hash": tx_hash,
            "status": "pending",
            "from": from_address,
            "to": checksum_to,
            "nonce": nonce,
            "gas_limit": gas_limit,
            "gas_price_gwei": round(gas_price_gwei, 2)
        }

        # Store in memory cache for immediate history availability
        raw_msg = message.strip()
        if raw_msg.startswith("IDM: "):
            raw_msg = raw_msg[5:].strip()
        elif raw_msg.startswith("IDM:"):
            raw_msg = raw_msg[4:].strip()
        self.record_broadcast({
            "tx_hash": tx_hash,
            "to_address": checksum_to,
            "message": raw_msg,
            "message_preview": raw_msg[:60] + "..." if len(raw_msg) > 60 else raw_msg,
            "status": "confirmed",
            "block_number": w3_instance.eth.block_number if w3_instance else 0,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

        return result

    def get_tx_status(self, tx_hash: str) -> Dict[str, Any]:
        if not tx_hash.startswith("0x") or len(tx_hash) != 66:
            raise ValueError("Invalid transaction hash format")

        try:
            w3_instance = self.w3
            receipt = w3_instance.eth.get_transaction_receipt(tx_hash)
            if receipt is None:
                return {
                    "tx_hash": tx_hash,
                    "status": "pending",
                    "confirmations": 0,
                    "block_number": None
                }

            current_block = w3_instance.eth.block_number
            block_number = receipt.get("blockNumber")
            confirmations = max(0, current_block - block_number + 1) if block_number else 0
            
            tx_status = "confirmed" if receipt.get("status") == 1 else "failed"

            return {
                "tx_hash": tx_hash,
                "status": tx_status,
                "confirmations": confirmations,
                "block_number": block_number,
                "gas_used": receipt.get("gasUsed")
            }
        except Exception:
            return {
                "tx_hash": tx_hash,
                "status": "pending",
                "confirmations": 0,
                "block_number": None
            }

web3_client = Web3ClientManager()
