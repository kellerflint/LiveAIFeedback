from fastapi import APIRouter, Depends, HTTPException
from typing import List
from api.admin_auth import get_current_admin
from db.question_repo import QuestionRepository
from models.schemas import Question, QuestionCreate

from datetime import datetime, timezone

router = APIRouter()

@router.get("/questions", response_model=List[Question])
async def get_questions(current_user: dict = Depends(get_current_admin)):
    return await QuestionRepository.get_all()

@router.post("/questions", response_model=Question)
async def create_question(question: QuestionCreate, current_user: dict = Depends(get_current_admin)):
    q_id = await QuestionRepository.create(question)
    return {**question.model_dump(), "id": q_id, "created_at": datetime.now(timezone.utc)}

@router.delete("/questions/{question_id}")
async def delete_question(question_id: int, current_user: dict = Depends(get_current_admin)):
    success = await QuestionRepository.delete(question_id)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question deleted successfully"}
