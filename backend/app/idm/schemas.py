from pydantic import BaseModel, Field
from typing import Optional, List

class EstimateRequest(BaseModel):
    to: str = Field(..., description="Recipient 0x-prefixed Ethereum address")
    message: str = Field(..., description="IDM text message to be logged on-chain")

class EstimateResponse(BaseModel):
    to: str
    gas_limit: int
    gas_price_gwei: float
    estimated_fee_eth: str
    estimated_fee_usd: str
    payload_bytes: int
    payload_hex: str

class SendRequest(BaseModel):
    to: str = Field(..., description="Recipient 0x-prefixed Ethereum address")
    message: str = Field(..., description="IDM text message to be logged on-chain")

class SendResponse(BaseModel):
    tx_hash: str
    status: str
    from_address: str = Field(..., alias="from")
    to_address: str = Field(..., alias="to")
    nonce: int
    gas_limit: int
    gas_price_gwei: float

    class Config:
        populate_by_name = True

class StatusResponse(BaseModel):
    tx_hash: str
    status: str
    confirmations: int
    block_number: Optional[int] = None
    gas_used: Optional[int] = None

class HistoryItem(BaseModel):
    tx_hash: str
    to_address: str
    message: str
    message_preview: str
    status: str
    block_number: int
    timestamp: str

class HistoryResponse(BaseModel):
    items: List[HistoryItem]
    total: int
    page: int
    limit: int
