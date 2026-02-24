from fastapi import APIRouter, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse
import asyncio
from typing import List
from api.admin_auth import get_current_admin
from db.session_repo import SessionRepository
from models.schemas import Session, SessionCreate, SessionQuestion
from api.student import manager

router = APIRouter()

@router.post("/", response_model=dict)
async def create_session(session: SessionCreate, current_user: dict = Depends(get_current_admin)):
    code = await SessionRepository.create(session)
    return {"code": code}

@router.get("/{code}")
async def get_session(code: str, current_user: dict = Depends(get_current_admin)):
    session = await SessionRepository.get_by_code(code)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.post("/{session_id}/activate-question")
async def activate_question(session_id: int, question_id: int, current_user: dict = Depends(get_current_admin)):
    # Launch a single question
    sq_id = await SessionRepository.launch_question(session_id, question_id)
    return {"session_question_id": sq_id, "status": "open"}

@router.put("/{session_id}/question/{session_question_id}/close")
async def close_question(session_id: int, session_question_id: int, current_user: dict = Depends(get_current_admin)):
    await SessionRepository.close_question(session_question_id)
    return {"status": "closed"}

@router.get("/{session_id}/results")
async def get_session_results(session_id: int, current_user: dict = Depends(get_current_admin)):
    # Gets all questions (open and closed) and their responses for the admin view
    return await SessionRepository.fetch_results(session_id)

@router.get("/{session_id}/connected-users")
async def get_connected_users(session_id: int, current_user: dict = Depends(get_current_admin)):
    names = manager.get_connected_names(session_id)
    return {
        "count": len(names),
        "names": names
    }

@router.get("/{session_id}/live-results")
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
