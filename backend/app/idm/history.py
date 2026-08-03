import httpx
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.config import settings
from app.wallet.web3_client import web3_client

def decode_idm_hex_data(input_hex: str) -> tuple[bool, str]:
    """
    Decodes transaction input hex payload into string.
    Returns (is_idm, decoded_message).
    """
    if not input_hex or input_hex == "0x" or input_hex == "0x00":
        return False, ""

    try:
        raw_hex = input_hex[2:] if input_hex.startswith("0x") else input_hex
        raw_bytes = bytes.fromhex(raw_hex)
        decoded_text = raw_bytes.decode('utf-8', errors='ignore')
        
        if decoded_text.startswith("IDM: "):
            return True, decoded_text[5:]
        elif len(decoded_text.strip()) > 0 and not decoded_text.startswith("0x"):
            # Also capture non-prefixed plain text data payloads sent by wallet
            return True, decoded_text
    except Exception:
        pass
    
    return False, ""

def fetch_etherscan_history(page: int = 1, limit: int = 20) -> Dict[str, Any]:
    address, _ = web3_client.get_backend_account()
    if not address or address == "0x0000000000000000000000000000000000000000":
        return {"items": [], "total": 0, "page": page, "limit": limit}

    api_key = settings.ETHERSCAN_API_KEY
    # Construct Etherscan V2 / V1 API endpoint
    etherscan_url = f"https://api.etherscan.io/api?module=account&action=txlist&address={address}&startblock=0&endblock=99999999&sort=desc"
    if api_key:
        etherscan_url += f"&apikey={api_key}"

    idm_items: List[Dict[str, Any]] = []

    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.get(etherscan_url)
            if res.status_code == 200:
                data = res.json()
                if data.get("status") == "1" and isinstance(data.get("result"), list):
                    for tx in data["result"]:
                        input_hex = tx.get("input", "")
                        is_idm, message = decode_idm_hex_data(input_hex)
                        
                        if is_idm:
                            timestamp_num = int(tx.get("timeStamp", 0))
                            dt = datetime.fromtimestamp(timestamp_num, tz=timezone.utc)
                            iso_timestamp = dt.isoformat()
                            
                            tx_receipt_status = tx.get("isError", "0")
                            status_str = "failed" if tx_receipt_status == "1" else "confirmed"

                            preview = message[:60] + "..." if len(message) > 60 else message

                            idm_items.append({
                                "tx_hash": tx.get("hash", ""),
                                "to_address": tx.get("to", ""),
                                "message": message,
                                "message_preview": preview,
                                "status": status_str,
                                "block_number": int(tx.get("blockNumber", 0)),
                                "timestamp": iso_timestamp
                            })
    except Exception as e:
        print(f"[Scrybe History Error] Failed to fetch Etherscan history: {e}")

    # Merge in-memory broadcasts so newly sent transactions appear instantly
    recent_broadcasts = web3_client.get_recent_broadcasts()
    for item in recent_broadcasts:
        if not any(x["tx_hash"].lower() == item["tx_hash"].lower() for x in idm_items):
            idm_items.insert(0, item)

    total = len(idm_items)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_items = idm_items[start_idx:end_idx]

    return {
        "items": paginated_items,
        "total": total,
        "page": page,
        "limit": limit
    }
