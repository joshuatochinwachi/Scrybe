from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.auth.security import get_current_user_from_cookie
from app.idm.schemas import EstimateRequest, EstimateResponse, SendRequest, SendResponse, StatusResponse, HistoryResponse
from app.wallet.web3_client import web3_client
from app.idm.history import fetch_etherscan_history

router = APIRouter(prefix="/api/idm", tags=["idm"])

@router.post("/estimate", response_model=EstimateResponse)
def estimate_idm(payload: EstimateRequest, current_user: dict = Depends(get_current_user_from_cookie)):
    try:
        res = web3_client.estimate_idm_gas(to_address=payload.to, message=payload.message)
        return EstimateResponse(**res)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error": "estimation_failed", "message": str(ve)})
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"error": "server_error", "message": str(e)})

@router.post("/send", response_model=SendResponse)
def send_idm(payload: SendRequest, current_user: dict = Depends(get_current_user_from_cookie)):
    try:
        result = web3_client.build_sign_and_broadcast_idm(to_address=payload.to, message=payload.message)
        return SendResponse(
            tx_hash=result["tx_hash"],
            status=result["status"],
            from_address=result["from"],
            to_address=result["to"],
            nonce=result["nonce"],
            gas_limit=result["gas_limit"],
            gas_price_gwei=result["gas_price_gwei"]
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error": "send_rejected", "message": str(ve)})
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"error": "broadcast_failed", "message": str(e)})

@router.get("/status/{tx_hash}", response_model=StatusResponse)
def get_status(tx_hash: str, current_user: dict = Depends(get_current_user_from_cookie)):
    try:
        res = web3_client.get_tx_status(tx_hash)
        return StatusResponse(**res)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error": "invalid_tx_hash", "message": str(ve)})
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"error": "status_check_failed", "message": str(e)})

@router.get("/history", response_model=HistoryResponse)
def get_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user_from_cookie)
):
    try:
        history_data = fetch_etherscan_history(page=page, limit=limit)
        return HistoryResponse(**history_data)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"error": "history_fetch_failed", "message": str(e)})
