import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.auth.security import hash_password, verify_password, create_jwt_session_token, verify_jwt_session_token
from app.wallet.web3_client import web3_client
from app.idm.history import decode_idm_hex_data

def run_tests():
    print("=== SCRYBE BACKEND VERIFICATION TESTS ===")
    
    # 1. Config Test
    print("\n1. Testing Config Loader...")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"RPC URL: {settings.ETH_RPC_URL}")
    print(f"Gas Price Ceiling: {settings.GAS_PRICE_CEILING_GWEI} Gwei")
    print(f"Max IDM Bytes: {settings.MAX_IDM_BYTES}")
    print(f"Allowed Origins: {settings.ALLOWED_ORIGINS}")
    assert settings.MAX_IDM_BYTES > 0, "MAX_IDM_BYTES must be positive"
    print("-> Config loaded successfully.")

    # 2. Auth & Bcrypt Security Test
    print("\n2. Testing Bcrypt & JWT Auth Security...")
    test_pwd = "SuperSecretPassword123!"
    pwd_hash = hash_password(test_pwd)
    print(f"Generated Bcrypt Hash: {pwd_hash[:25]}...")
    
    is_valid = verify_password(test_pwd, pwd_hash)
    assert is_valid, "Password verification failed"
    
    is_invalid = verify_password("WrongPassword", pwd_hash)
    assert not is_invalid, "Password invalid test failed"

    token = create_jwt_session_token("scrybe_admin")
    payload = verify_jwt_session_token(token)
    assert payload is not None, "JWT verification failed"
    assert payload.get("sub") == "scrybe_admin", "JWT payload subject mismatch"
    print("-> Bcrypt & JWT verification passed.")

    # 3. Web3 & Key Derivation Test
    print("\n3. Testing Web3 Client & Address Derivation...")
    address, account = web3_client.get_backend_account()
    print(f"Derived Backend Address: {address}")
    assert address.startswith("0x") and len(address) == 42, "Invalid derived address"

    is_checksummed = web3_client.validate_and_checksum_address("0x7d91c1fd68d6a2d5e668c4e007deddae3ee23f9c")
    assert is_checksummed == "0x7d91c1fD68D6A2D5E668C4e007DEDdAe3Ee23F9C", "Checksum conversion error"
    print("-> Address checksumming & key derivation passed.")

    # 4. Payload Hex Encoding Test
    print("\n4. Testing IDM Payload Hex Encoding & Decoder...")
    msg = "YieldSage audit report notarization #402"
    payload_bytes = web3_client.encode_idm_payload(msg)
    payload_hex = "0x" + payload_bytes.hex()
    
    is_idm, decoded = decode_idm_hex_data(payload_hex)
    assert is_idm, "Hex decoder failed to identify IDM prefix"
    assert decoded == msg, f"Decoded message '{decoded}' does not match original '{msg}'"
    print(f"Hex Encoding ({len(payload_bytes)} bytes) & Decoding test passed.")

    print("\n=======================================================")
    print("ALL BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    run_tests()
