import httpx
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.config import settings
from app.wallet.web3_client import web3_client


def decode_idm_hex_data(input_hex: str) -> tuple[bool, str]:
    """
    Decodes transaction input hex payload into string.
    Returns (is_idm, decoded_message). Only matches IDM: prefixed payloads.
    """
    if not input_hex or input_hex in ("0x", "0x00", ""):
        return False, ""

    try:
        raw_hex = input_hex[2:] if input_hex.startswith("0x") else input_hex
        if not raw_hex:
            return False, ""
        raw_bytes = bytes.fromhex(raw_hex)
        decoded_text = raw_bytes.decode('utf-8', errors='ignore').strip()

        if decoded_text.startswith("IDM: "):
            message = decoded_text[5:].strip()
            return True, message
        # Also match bare IDM messages without prefix (fallback)
        elif decoded_text.startswith("IDM:"):
            message = decoded_text[4:].strip()
            return True, message
    except Exception:
        pass

    return False, ""


def fetch_etherscan_history(page: int = 1, limit: int = 20) -> Dict[str, Any]:
    address, _ = web3_client.get_backend_account()
    if not address or address == "0x0000000000000000000000000000000000000000":
        print("[Scrybe History] No wallet address configured — skipping Etherscan fetch.")
        return {"items": [], "total": 0, "page": page, "limit": limit}

    api_key = settings.ETHERSCAN_API_KEY
    etherscan_url = (
        f"https://api.etherscan.io/v2/api"
        f"?chainid=1"
        f"&module=account&action=txlist"
        f"&address={address}"
        f"&startblock=0&endblock=99999999"
        f"&sort=desc&offset=200&page=1"
        f"&apikey={api_key}"
    )

    idm_items: List[Dict[str, Any]] = []

    try:
        with httpx.Client(timeout=15.0) as client:
            res = client.get(etherscan_url)
            print(f"[Scrybe History] Etherscan HTTP status: {res.status_code}")

            if res.status_code != 200:
                print(f"[Scrybe History] Non-200 response body: {res.text[:300]}")
            else:
                data = res.json()
                status = data.get("status")
                message = data.get("message", "")
                result = data.get("result")

                print(f"[Scrybe History] Etherscan status={status!r} message={message!r} result_type={type(result).__name__} result_len={len(result) if isinstance(result, list) else repr(result)}")

                if status == "1" and isinstance(result, list):
                    print(f"[Scrybe History] Processing {len(result)} transactions from Etherscan...")
                    idm_count = 0
                    for tx in result:
                        input_hex = tx.get("input", "")
                        is_idm, decoded_message = decode_idm_hex_data(input_hex)

                        if is_idm:
                            idm_count += 1
                            timestamp_num = int(tx.get("timeStamp", 0))
                            dt = datetime.fromtimestamp(timestamp_num, tz=timezone.utc)
                            iso_timestamp = dt.isoformat()

                            tx_receipt_status = tx.get("isError", "0")
                            status_str = "failed" if tx_receipt_status == "1" else "confirmed"

                            preview = decoded_message[:60] + "..." if len(decoded_message) > 60 else decoded_message

                            idm_items.append({
                                "tx_hash": tx.get("hash", ""),
                                "to_address": tx.get("to", ""),
                                "message": decoded_message,
                                "message_preview": preview,
                                "status": status_str,
                                "block_number": int(tx.get("blockNumber", 0)),
                                "timestamp": iso_timestamp
                            })

                    print(f"[Scrybe History] Found {idm_count} IDM transactions out of {len(result)} total.")

                elif status == "0" and message == "No transactions found":
                    print(f"[Scrybe History] Etherscan reports no transactions for address {address[:10]}...")

                else:
                    # Rate limit or API key error
                    print(f"[Scrybe History] Etherscan NOTOK — status={status!r} message={message!r} result={repr(result)[:200]}")

    except Exception as e:
        print(f"[Scrybe History Error] Exception fetching Etherscan: {e}")

    # Merge in-memory broadcasts so newly sent transactions appear instantly
    # (this covers Railway restarts where Etherscan hasn't indexed yet)
    recent_broadcasts = web3_client.get_recent_broadcasts()
    merged = 0
    for item in recent_broadcasts:
        if not any(x["tx_hash"].lower() == item["tx_hash"].lower() for x in idm_items):
            idm_items.insert(0, item)
            merged += 1

    if merged:
        print(f"[Scrybe History] Merged {merged} in-memory broadcast(s) into history.")

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
