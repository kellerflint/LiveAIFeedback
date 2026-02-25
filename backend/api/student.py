from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
import aiomysql
from typing import List, Dict, Any
from db.session import get_db_pool
from db.session_repo import SessionRepository
from models.schemas import StudentResponseCreate
from core.ai_service import grade_response
from datetime import datetime, timezone

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Format: { session_id: { websocket_object: "Student Name" } }
        self.active_sessions: Dict[int, Dict[WebSocket, str]] = {}

    async def connect(self, websocket: WebSocket, session_id: int):
        await websocket.accept()
        if session_id not in self.active_sessions:
            self.active_sessions[session_id] = {}
        # Initially anonymous until they send their name
        self.active_sessions[session_id][websocket] = "Anonymous"

    def disconnect(self, websocket: WebSocket, session_id: int):
        if session_id in self.active_sessions:
            if websocket in self.active_sessions[session_id]:
                del self.active_sessions[session_id][websocket]

    def update_name(self, websocket: WebSocket, session_id: int, name: str):
        if session_id in self.active_sessions and websocket in self.active_sessions[session_id]:
            self.active_sessions[session_id][websocket] = name

    def get_connected_names(self, session_id: int) -> List[str]:
        if session_id not in self.active_sessions:
            return []
        names = list(self.active_sessions[session_id].values())
        return [n for n in names if n != "Anonymous"]

manager = ConnectionManager()

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: int):
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "join" and data.get("name"):
                manager.update_name(websocket, session_id, str(data.get("name")).strip())
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)

@router.post("/join/{code}")
async def join_session(code: str):
    session = await SessionRepository.get_by_code(code)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or invalid code")
    if session['status'] != 'active':
        raise HTTPException(status_code=400, detail="This session is no longer active")
        
    return {"message": "Joined successfully", "session_id": session['id']}

@router.get("/session/{session_id}/active-questions")
async def get_active_questions(session_id: int):
    # First check if session is closed to auto-kick students
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT status FROM session WHERE id = %s", (session_id,))
            session_data = await cur.fetchone()
            if not session_data or session_data['status'] != 'active':
                raise HTTPException(status_code=400, detail="This session is no longer active")

    # Returns the questions currently open for this session
    questions = await SessionRepository.get_active_questions(session_id)
    return questions

@router.post("/session/{session_id}/question/{question_id}/submit")
async def submit_response(session_id: int, question_id: int, response: StudentResponseCreate):
    # Retrieve the question and session details
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT * FROM question WHERE id = %s", (question_id,))
            question = await cur.fetchone()
            
            await cur.execute("SELECT * FROM session WHERE id = %s", (session_id,))
            session = await cur.fetchone()

    if not question or not session:
        raise HTTPException(status_code=404, detail="Question or session not found")
        
    if session['status'] != 'active':
        raise HTTPException(status_code=400, detail="This session is closed")

    # Grade the response
    score, feedback = await grade_response(
        question_text=question['text'],
        grading_criteria=question['grading_criteria'],
        student_response=response.response_text,
        ai_model=session['ai_model']
    )

    # Save the response
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """INSERT INTO student_response 
                   (session_id, question_id, student_name, response_text, ai_score, ai_feedback) 
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (session_id, question_id, response.student_name, response.response_text, score, feedback)
            )
            response_id = cur.lastrowid
            
    return {"message": "Response submitted successfully", "response_id": response_id, "score": score, "feedback": feedback}
