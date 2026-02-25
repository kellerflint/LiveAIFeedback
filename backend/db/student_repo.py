import aiomysql
from db.session import get_db_pool

class StudentRepository:
    @staticmethod
    async def save_response(session_id: int, question_id: int, session_question_id: int, student_name: str, response_text: str, ai_score: int, ai_feedback: str) -> int:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """INSERT INTO student_response 
                       (session_id, question_id, session_question_id, student_name, response_text, ai_score, ai_feedback) 
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (session_id, question_id, session_question_id, student_name, response_text, ai_score, ai_feedback)
                )
                await conn.commit()
                return cur.lastrowid
