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
    job_id = body.get("job_id", None)
    candidate_id = body.get("candidate_id", None)

    try:
        proc = subprocess.Popen(
            [
                f"python3 -m src.services.bot_defaults -u {room_url} -t {bot_token} -s {session_id}"
            ],
            shell=True,
            bufsize=1,
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        )

        if job_id:
            proc.extend(["-j", job_id])
        if candidate_id:
            proc.extend(["-c", candidate_id])

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

@router.post("/phone_screening/connect")
async def handle_daily_dialout_webhook(request: Request):
    """
    Handle Daily.co dialout webhook request.
    This endpoint receives dialout_settings with sip_uri and starts the phone screening bot.
    """
    manager = request.app.state.manager
    db_manager = request.app.state.db_manager

    try:
        # Get the request data
        data = await request.json()
        logger.info(f"Received Daily dialout webhook: {data}")

        # Validate dialout_settings
        if not data.get("dialout_settings"):
            raise HTTPException(
                status_code=400, detail="Missing 'dialout_settings' in the request body"
            )

        dialout_settings = data["dialout_settings"]
        job_id = dialout_settings.get("job_id", "")
        candidate_id = dialout_settings.get("candidate_id", "")
        if not job_id or job_id == "":
            raise HTTPException(status_code=400, detail="Job ID is required")
        if not candidate_id or candidate_id == "":
            raise HTTPException(status_code=400, detail="Candidate ID is required")

        candidate_record = db_manager.fetch_one("candidates", {"id": candidate_id})
        if not candidate_record:
            raise HTTPException(status_code=400, detail="Candidate not found")

        sip_uri = dialout_settings.get("sip_uri", "")
        phone_number = candidate_record.get("phone", "")
        logger.info(f"Processing dialout to SIP URI: {sip_uri}")

        # If phone_number is not provided directly, try to extract from SIP URI
        if not phone_number:
            phone_number = "unknown"
            try:
                if sip_uri.startswith("sip:"):
                    phone_part = sip_uri[4:].split("@")[0]
                    phone_number = phone_part
            except Exception as e:
                logger.warning(f"Could not extract phone number from SIP URI: {e}")

        try:
            # Use the SIP-enabled room creation method for dialout capability
            room_data = await manager.create_room_sid_phonescreen(phone_number)
            room_url = room_data["room_url"]
            bot_token = room_data["token"]
            sip_endpoint = room_data["sip_endpoint"]
            logger.info(f"Created Daily SIP-enabled room: {room_url}")
            logger.info(f"SIP endpoint: {sip_endpoint}")
        except Exception as e:
            logger.error(f"Error creating Daily SIP room: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to create Daily SIP room: {str(e)}"
            )

        # Generate session and call IDs
        session_id = str(uuid.uuid4())
        call_id = f"daily_dialout_{int(datetime.now().timestamp())}"

        logger.info(f"Starting Daily dialout phone screen")
        logger.info(f"Session ID: {session_id}")
        logger.info(f"Call ID: {call_id}")
        logger.info(f"SIP URI: {sip_uri}")
        logger.info(f"Phone: {phone_number}")

        # Prepare dialout settings for the bot
        bot_dialout_settings = {
            "sip_uri": sip_uri,
            "phone_number": phone_number,
        }

        # Add caller_id if provided
        if dialout_settings.get("caller_id"):
            bot_dialout_settings["caller_id"] = dialout_settings["caller_id"]

        candidate_name = candidate_record.get("name", "")
        job_record = db_manager.fetch_one("jobs", {"id": job_id})
        job_position = job_record.get("title", "")
        organization_id = job_record.get("organization_id", "")
        organization_record = db_manager.fetch_one("organizations", {"id": organization_id})
        company_name = organization_record.get("name", "")
        phone_screen_id = job_record.get("phone_screen_id", "")
        if not phone_screen_id:
            raise HTTPException(status_code=400, detail="Phone screen not enabled for this job")
        phone_screen_record = db_manager.fetch_one("phone_screen", {"id": phone_screen_id})
        phone_screen_questions = phone_screen_record.get("questions", [])
        if not phone_screen_questions or phone_screen_questions == []:
            raise HTTPException(status_code=400, detail="Phone screen questions are required")

        try:
            provider = "daily"
            # Build command with all parameters
            command = [
                "python3",
                "-m",
                f"src.services.phone_screening.phone_bot_runner",
                "-u",
                room_url,
                "-t",
                bot_token,
                "-s",
                session_id,
                "-i",
                call_id,
                "-d",
                "api.daily.co",
                "--provider",
                provider,
                "--phone_number",
                phone_number,
                "--phone_screen_questions",
                json.dumps(phone_screen_questions),
                "--candidate_name",
                candidate_name,
                "--job_position",
                job_position,
                "--company_name",
                company_name,
            ]

            # Add optional parameters if provided
            if dialout_settings.get("caller_id"):
                command.extend(["-c", dialout_settings["caller_id"]])

            # Start the phone screening bot process
            proc = subprocess.Popen(
                command,
                cwd=os.path.dirname(
                    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                ),
            )
            manager.add_process(proc.pid, proc)
            logger.info(f"Started Daily dialout bot process with PID: {proc.pid}")

        except Exception as e:
            logger.error(f"Error starting Daily dialout bot: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to start bot: {str(e)}"
            )

        return {
            "success": True,
            "message": f"Daily dialout initiated to {sip_uri}",
            "session_id": session_id,
            "call_id": call_id,
            "room_url": room_url,
            "token": bot_token,
            "sip_uri": sip_uri,
            "sip_endpoint": sip_endpoint,
            "process_id": proc.pid,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in Daily dialout webhook: {e}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
