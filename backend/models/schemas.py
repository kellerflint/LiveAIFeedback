from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# ==========================================
# Common / Base Schemas
# ==========================================

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# ==========================================
# Question Schemas
# ==========================================

class QuestionBase(BaseModel):
    text: str
    grading_criteria: str
    collection_id: int = 1

class QuestionCreate(QuestionBase):
    pass

class Question(QuestionBase):
    id: int
    created_at: datetime
    collection_name: Optional[str] = None

    class Config:
        from_attributes = True

# ==========================================
# Collection Schemas
# ==========================================

class CollectionCreate(BaseModel):
    name: str

class CollectionRename(BaseModel):
    name: str

class Collection(BaseModel):
    id: int
    name: str
    created_at: datetime
    question_count: Optional[int] = 0

    class Config:
        from_attributes = True

# Removed Question Group Schemas

# ==========================================
# Session Schemas
# ==========================================

class SessionBase(BaseModel):
    ai_model: str = "openai/gpt-3.5-turbo"

class SessionCreate(SessionBase):
    pass

class Session(SessionBase):
    id: int
    code: str
    status: str

    class Config:
        from_attributes = True

class SessionQuestion(BaseModel):
    id: int
    session_id: int
    question_id: int
    status: str
    question: Optional[Question] = None # Include full question details when useful

    class Config:
        from_attributes = True

# ==========================================
# Student Response Schemas
# ==========================================

class StudentResponseCreate(BaseModel):
    student_name: str
    response_text: str

class StudentResponse(BaseModel):
    id: int
    session_id: int
    question_id: int
    session_question_id: int
    student_name: str
    response_text: str
    ai_score: Optional[int]
    ai_feedback: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
