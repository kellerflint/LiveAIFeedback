from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
import asyncio
import httpx
import csv
import io
import logging
from typing import List
from api.admin_auth import get_current_admin
from db.session_repo import SessionRepository
from db.question_repo import QuestionRepository
from models.schemas import Session, SessionCreate, SessionQuestion
from api.student import manager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/sessions")
async def create_session(session: SessionCreate, current_user: dict = Depends(get_current_admin)):
    active = await SessionRepository.get_active_session()
    if active:
        raise HTTPException(status_code=400, detail="An active session already exists. Please close it before starting a new one.")
    code = await SessionRepository.create(session)
    return {"code": code}

@router.get("/sessions")
async def get_all_sessions(current_user: dict = Depends(get_current_admin)):
    return await SessionRepository.get_all()

@router.get("/models")
async def get_models(current_user: dict = Depends(get_current_admin)):
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("https://openrouter.ai/api/v1/models", timeout=10.0)
            resp.raise_for_status()
            # Cache could be implemented here if needed.
            return resp.json().get("data", [])
    except Exception as e:
        logger.error(f"Failed to fetch models from OpenRouter proxy: {e}")
        return []

@router.get("/sessions/{code}")
async def get_session(code: str, current_user: dict = Depends(get_current_admin)):
    session = await SessionRepository.get_by_code(code)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.put("/sessions/{session_id}/end")
async def end_session(session_id: int, current_user: dict = Depends(get_current_admin)):
    await SessionRepository.close_session(session_id)
    await manager.broadcast(session_id, {"type": "session_ended"})
    return {"status": "closed"}

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: int, current_user: dict = Depends(get_current_admin)):
    await SessionRepository.delete_session(session_id)
    return {"status": "deleted"}

@router.post("/sessions/{session_id}/activate-question")
async def activate_question(session_id: int, question_id: int, current_user: dict = Depends(get_current_admin)):
    # Launch a single question
    sq_id = await SessionRepository.launch_question(session_id, question_id)
    questions = await SessionRepository.get_active_questions(session_id)
    await manager.broadcast(session_id, {"type": "active_questions", "questions": questions})
    return {"session_question_id": sq_id, "status": "open"}

@router.put("/sessions/{session_id}/question/{session_question_id}/close")
async def close_question(session_id: int, session_question_id: int, current_user: dict = Depends(get_current_admin)):
    await SessionRepository.close_question(session_question_id)
    questions = await SessionRepository.get_active_questions(session_id)
    await manager.broadcast(session_id, {"type": "active_questions", "questions": questions})
    return {"status": "closed"}

@router.get("/sessions/{session_id}/results")
async def get_session_results(session_id: int, current_user: dict = Depends(get_current_admin)):
    # Gets all questions (open and closed) and their responses for the admin view
    return await SessionRepository.fetch_results(session_id)

@router.get("/sessions/{session_id}/connected-users")
async def get_connected_users(session_id: int, current_user: dict = Depends(get_current_admin)):
    names = manager.get_connected_names(session_id)
    return {
        "count": len(names),
        "names": names
    }

@router.post("/sessions/{session_id}/launch-collection/{collection_id}")
async def launch_collection(session_id: int, collection_id: int, current_user: dict = Depends(get_current_admin)):
    questions = await QuestionRepository.get_by_collection(collection_id)
    if not questions:
        raise HTTPException(status_code=404, detail="No questions in this collection")
    launched = []
    for q in questions:
        sq_id = await SessionRepository.launch_question(session_id, q['id'])
        launched.append(sq_id)
    active = await SessionRepository.get_active_questions(session_id)
    await manager.broadcast(session_id, {"type": "active_questions", "questions": active})
    return {"launched": len(launched), "session_question_ids": launched}

@router.put("/sessions/{session_id}/close-all-questions")
async def close_all_questions(session_id: int, current_user: dict = Depends(get_current_admin)):
    await SessionRepository.close_all_questions(session_id)
    await manager.broadcast(session_id, {"type": "active_questions", "questions": []})
    return {"status": "all closed"}

@router.get("/sessions/{session_id}/export-csv")
async def export_csv(session_id: int, current_user: dict = Depends(get_current_admin)):
    results = await SessionRepository.fetch_results(session_id)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Question", "Student Name", "Response", "AI Score", "AI Feedback", "Timestamp"])
    for sq in results:
        for r in sq.get('responses', []):
            writer.writerow([
                sq.get('text', ''),
                r.get('student_name', ''),
                r.get('response_text', ''),
                r.get('ai_score', ''),
                r.get('ai_feedback', ''),
                str(r.get('created_at', ''))
            ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=session_{session_id}_results.csv"}
    )

@router.get("/sessions/{session_id}/live-results")
async def stream_session_results(request: Request, session_id: int):
    # Note: Depending on get_current_admin over SSE can be tricky with auth headers.
    # We'll keep it simple: assuming dashboard connects to this via EventSource.
    # To secure this in real prod, pass a temp token in query param.
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            
            # Fetch current state of this session's answers
            data = await SessionRepository.fetch_results(session_id)
            yield {
                "event": "message",
                "data": str(data) # In a real app, json.dumps this correctly handling dates
            }
            await asyncio.sleep(2) # Poll every 2 seconds

    return EventSourceResponse(event_generator())
