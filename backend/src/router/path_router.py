import os
import subprocess
from src.utils.logger import logger
from typing import Dict, List
import uuid
import json
from datetime import datetime

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from starlette.responses import JSONResponse

from src.core.config import Config


UPLOAD_DIR = Config.UPLOAD_DIR

router = APIRouter(
    prefix="/api/v1",
    tags=["Path"],
    responses={404: {"description": "Not found"}},
)


@router.post("/connect")
async def rtvi_connect(request: Request):

    manager = request.app.state.manager
    room_url, bot_token = await manager.create_room_and_token()
    session_id = str(uuid.uuid4())

    try:
        proc = subprocess.Popen(
            [
                f"python3 -m src.services.bot_defaults -u {room_url} -t {bot_token} -s {session_id}"
            ],
            shell=True,
            bufsize=1,
            cwd=os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            ),
        )
        manager.add_process(proc.pid, proc)
    except Exception as e:
        logger.error(f"Error starting bot process: {e}")
        raise HTTPException(status_code=500, detail="Failed to process!")

    return {"room_url": room_url, "token": bot_token}


@router.post("/disconnect")
async def rtvi_disconnect(token: str, request: Request):
    """Disconnect the voice chat session and cleanup resources."""
    manager = request.app.state.manager
    try:
        # Since there's no DB, we can't check for room URL by token anymore
        # We'll just clean up processes

        for pid, proc in manager.processes.items():
            try:
                proc.terminate()
                proc.wait()
                logger.info(f"Process {pid} terminated successfully")
            except Exception as e:
                logger.error(f"Error terminating process {pid}: {e}")

        return {"message": "Disconnected successfully"}

    except Exception as e:
        logger.error(f"Error during disconnect: {e}")
        raise HTTPException(status_code=500, detail=f"Disconnect failed: {str(e)}")
