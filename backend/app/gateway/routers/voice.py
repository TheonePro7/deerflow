"""Voice input endpoint — proxies to Volcengine Streaming ASR v2."""

from __future__ import annotations

import asyncio
import base64
import gzip
import json
import logging
import uuid
import wave
from io import BytesIO
from typing import Any

import httpx
from fastapi import APIRouter, UploadFile
from pydantic import BaseModel, Field
from websockets.asyncio.client import connect as ws_connect

from app.gateway.authz import require_permission

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/voice", tags=["voice"])

# ── Binary protocol constants ──────────────────────────────────────────────
PROTOCOL_VERSION = 0b0001
CLIENT_FULL_REQUEST = 0b0001
CLIENT_AUDIO_ONLY_REQUEST = 0b0010
SERVER_FULL_RESPONSE = 0b1001
SERVER_ERROR_RESPONSE = 0b1111
NO_SEQUENCE = 0b0000
NEG_SEQUENCE = 0b0010
JSON_SERIAL = 0b0001
GZIP_COMPRESS = 0b0001
NO_COMPRESSION = 0b0000


def _build_header(
    message_type: int = CLIENT_FULL_REQUEST,
    flags: int = NO_SEQUENCE,
    serial: int = JSON_SERIAL,
    compression: int = GZIP_COMPRESS,
) -> bytes:
    """4‑byte binary header (see Volcengine v2 ASR protocol)."""
    return bytes([
        (PROTOCOL_VERSION << 4) | 0b0001,  # version | header_size(=1 → no extensions)
        (message_type << 4) | flags,
        (serial << 4) | compression,
        0x00,  # reserved
    ])


def _parse_response(data: bytes) -> dict[str, Any]:
    """Parse a Volcengine v2 ASR binary response."""
    if len(data) < 4:
        return {}
    header_size = data[0] & 0x0f
    message_type = data[1] >> 4
    flags = data[1] & 0x0f
    serial = data[2] >> 4
    compression = data[2] & 0x0f
    payload = data[header_size * 4:]

    result: dict[str, Any] = {}
    payload_msg: bytes | None = None

    if message_type == SERVER_FULL_RESPONSE:
        payload_size = int.from_bytes(payload[:4], "big", signed=True)
        payload_msg = payload[4:4 + abs(payload_size)] if payload_size else b""
    elif message_type == SERVER_ERROR_RESPONSE:
        code = int.from_bytes(payload[:4], "big", signed=False)
        plen = int.from_bytes(payload[4:8], "big", signed=False)
        result["code"] = code
        payload_msg = payload[8:8 + plen]

    if payload_msg:
        if compression == GZIP_COMPRESS:
            payload_msg = gzip.decompress(payload_msg)
        if serial == JSON_SERIAL:
            result["payload"] = json.loads(payload_msg.decode("utf-8"))
        else:
            result["payload"] = payload_msg.decode("utf-8")
    return result


# ── API model ──────────────────────────────────────────────────────────────

class TranscribeResponse(BaseModel):
    text: str = Field(default="")
    success: bool = Field(default=False)
    error: str | None = Field(default=None)


# ── Route ──────────────────────────────────────────────────────────────────

@router.post("/transcribe", response_model=TranscribeResponse)
@require_permission("runs", "read")
async def transcribe_audio(file: UploadFile) -> TranscribeResponse:
    """Transcribe an audio file using Volcengine Streaming ASR v2."""
    import os
    appid = os.environ.get("VOLCENGINE_APP_ID", "1293409232")
    token = os.environ.get("VOLCENGINE_ACCESS_TOKEN", "8cDak48ze8TXBeTzqycvkpvbKkJrX7-G")
    cluster = os.environ.get("VOLCENGINE_CLUSTER", "949bbbee-c1d0-4271-9ad9-f579bb36e62c")

    if not all([appid, token, cluster]):
        return TranscribeResponse(text="", success=False, error="火山引擎凭证未配置")

    audio_bytes = await file.read()
    if not audio_bytes:
        return TranscribeResponse(text="", success=False, error="空音频")

    try:
        # Convert to PCM if WAV
        if file.filename and file.filename.endswith((".wav", ".WAV")):
            with BytesIO(audio_bytes) as buf:
                with wave.open(buf, "rb") as w:
                    params = w.getparams()
                    pcm_data = w.readframes(params.nframes)
        else:
            pcm_data = audio_bytes

        reqid = str(uuid.uuid4())
        result_text = ""

        async with await ws_connect("wss://openspeech.bytedance.com/api/v2/asr") as ws:
            # 1. Full request (config)
            config = json.dumps({
                "app": {"appid": appid, "cluster": cluster, "token": token},
                "audio": {"format": "pcm", "rate": 16000, "bits": 16, "channel": 1, "codec": "raw"},
                "request": {
                    "reqid": reqid, "nbest": 1,
                    "result_type": "single", "show_utterances": False,
                    "sequence": 1,
                },
            }).encode("utf-8")
            compressed = gzip.compress(config)
            header = _build_header(CLIENT_FULL_REQUEST)
            await ws.send(header + compressed)

            # Wait for ACK
            ack = await asyncio.wait_for(ws.recv(), timeout=5)
            logger.info("ACK received: %s", ack[:20].hex() if isinstance(ack, bytes) else str(ack)[:50])

            # 2. Send audio in chunks (16KB per chunk)
            chunk_size = 16000 * 2  # 1 second PCM
            offset = 0
            while offset < len(pcm_data):
                chunk = pcm_data[offset:offset + chunk_size]
                is_last = (offset + chunk_size) >= len(pcm_data)
                flags = NEG_SEQUENCE if is_last else NO_SEQUENCE
                header = _build_header(CLIENT_AUDIO_ONLY_REQUEST, flags)
                payload_size = len(chunk).to_bytes(4, "big")
                await ws.send(header + payload_size + chunk)
                offset += chunk_size
                await asyncio.sleep(0.02)
                # If last chunk, wait for result
                if is_last:
                    logger.info("Last audio chunk sent, waiting for result...")

            # 3. Read results
            while True:
                raw = await asyncio.wait_for(ws.recv(), timeout=15)
                if not isinstance(raw, bytes):
                    continue
                parsed = _parse_response(raw)
                if "payload" in parsed:
                    payload = parsed["payload"]
                    text = (payload.get("result") or payload).get("text", "")
                    if text:
                        result_text = text
                    # Check if final
                    if payload.get("result", {}).get("is_final", True):
                        break
                if parsed.get("code"):
                    error_msg = parsed.get("payload", {}).get("message", f"错误 code={parsed['code']}")
                    return TranscribeResponse(text="", success=False, error=error_msg)

        return TranscribeResponse(text=result_text, success=bool(result_text))

    except asyncio.TimeoutError:
        return TranscribeResponse(text="", success=False, error="识别超时")
    except Exception as exc:
        logger.exception("Volcengine ASR failed")
        return TranscribeResponse(text="", success=False, error=str(exc))
