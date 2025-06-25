from datetime import datetime
import json
import os
import subprocess
import uuid

from fastapi import APIRouter, Body, HTTPException, Request

from src.core.config import Config
from src.llm_handler.analytics import InterviewAnalytics
from src.llm_handler.flow_generator import generate_interview_flow_from_jd
from src.utils.logger import logger

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
    body = await request.json()
    job_id = body.get("job_id")
    candidate_id = body.get("candidate_id")

    try:
        proc = subprocess.Popen(
            [
                f"python3 -m src.services.bot_defaults -u {room_url} -t {bot_token} -s {session_id} -j {job_id} -c {candidate_id}"
            ],
            shell=True,
            bufsize=1,
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        )
        manager.add_process(proc.pid, proc)
    except Exception as e:
        logger.error(f"Error starting bot process: {e}")
        raise HTTPException(status_code=500, detail="Failed to process!")

    return {"room_url": room_url, "token": bot_token}


@router.get("/get_interview_analytics")
async def get_interview_analytics(request: Request, session_id: str):
    db_manager = request.app.state.db_manager
    try:
        if not session_id:
            raise HTTPException(status_code=400, detail="Session ID is required")

        # Fetch session data from the database
        session_record = db_manager.fetch_one(
            "session_history", query_params={"session_id": session_id}
        )

        if not session_record:
            raise HTTPException(status_code=404, detail="Session not found")

        # Parse the chat history from the session record
        chat_history = json.loads(session_record.get("chat_history", "[]"))

        if not chat_history:
            return {"message": "No chat history available for analysis"}

        # Instantiate the analytics class and analyze the interview
        analytics = InterviewAnalytics()
        analysis_result = await analytics.analyze_interview(chat_history)

        # Add timestamp to the analysis
        analysis_result["timestamp"] = datetime.now().isoformat()
        analysis_result["session_id"] = session_id

        # Optionally store the analysis in the database
        try:
            analysis_data = {
                "session_id": uuid.UUID(session_id),
                "analysis": json.dumps(analysis_result),
                "created_at": datetime.now(),
            }
            db_manager.execute_query("interview_analytics", analysis_data)
        except Exception as store_error:
            logger.warning(f"Failed to store analytics result: {store_error}")
            # Continue even if storage fails

        return analysis_result

    except Exception as e:
        logger.error(f"Error getting interview analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting interview analytics: {str(e)}")


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


@router.get("/hellos")
async def hellos(request: Request):
    return {"message": "Hello, world!"}


@router.post("/generate_interview_flow_from_description")
async def generate_interview_flow_from_description(request: Request, data: dict = Body(...)):
    """
    Generate an interview flow JSON from a job description using Gemini LLM.
    """

    job_role = data["job_role"]
    job_description = data["job_description"]
    skills = data["skills"]
    duration = data["duration"]

    flow_json = await generate_interview_flow_from_jd(job_role, job_description, skills, duration)

    return flow_json
