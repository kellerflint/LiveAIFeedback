from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from typing import List, Dict, Any
from db.session_repo import SessionRepository
from db.question_repo import QuestionRepository
from db.student_repo import StudentRepository
from models.schemas import StudentResponseCreate
from core.ai_service import grade_response

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

    async def broadcast(self, session_id: int, message: dict):
        if session_id in self.active_sessions:
            connections = list(self.active_sessions[session_id].keys())
            encoded_message = jsonable_encoder(message)
            for connection in connections:
                try:
                    await connection.send_json(encoded_message)
                except Exception:
                    pass

manager = ConnectionManager()

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: int):
    await manager.connect(websocket, session_id)
    try:
        # Send current active questions immediately upon connecting
        questions = await SessionRepository.get_active_questions(session_id)
        
        # Serialize datetime objects securely for raw websocket ingestion
        encoded_questions = jsonable_encoder(questions)
        await websocket.send_json({"type": "active_questions", "questions": encoded_questions})
        
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "join" and data.get("name"):
                manager.update_name(websocket, session_id, str(data.get("name")).strip())
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
    except Exception as e:
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
    session_data = await SessionRepository.get_by_id(session_id)
    if not session_data or session_data['status'] != 'active':
        raise HTTPException(status_code=400, detail="This session is no longer active")

    # Returns the questions currently open for this session
    questions = await SessionRepository.get_active_questions(session_id)
    return questions

@router.post("/session/{session_id}/question/{question_id}/submit")
async def submit_response(session_id: int, question_id: int, response: StudentResponseCreate):
    # Retrieve the question and session details
    question = await QuestionRepository.get_by_id(question_id)
    session = await SessionRepository.get_by_id(session_id)

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
    response_id = await StudentRepository.save_response(
        session_id=session_id,
        question_id=question_id,
        student_name=response.student_name,
        response_text=response.response_text,
        ai_score=score,
        ai_feedback=feedback
    )
            
    return {"message": "Response submitted successfully", "response_id": response_id, "score": score, "feedback": feedback}
