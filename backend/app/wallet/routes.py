from fastapi import APIRouter, Depends
from app.auth.security import get_current_user_from_cookie
from app.wallet.web3_client import web3_client

router = APIRouter(prefix="/api/wallet", tags=["wallet"])

@router.get("/info")
def get_wallet_info(current_user: dict = Depends(get_current_user_from_cookie)):
    info = web3_client.get_wallet_info()
    return info
