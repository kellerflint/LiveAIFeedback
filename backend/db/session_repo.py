import aiomysql
import uuid
import string
import random
from db.session import get_db_pool
from models.schemas import SessionCreate

class SessionRepository:
    @staticmethod
    def _generate_code(length=6):
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

    @staticmethod
    async def create(s: SessionCreate) -> str:
        pool = await get_db_pool()
        code = SessionRepository._generate_code()
        # Ensure code uniqueness in real app, skipping loop for brevity
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO session (code, ai_model, status) VALUES (%s, %s, %s)",
                    (code, s.ai_model, 'active')
                )
        return code

    @staticmethod
    async def get_by_code(code: str) -> dict:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("SELECT * FROM session WHERE code = %s", (code,))
                return await cur.fetchone()

    @staticmethod
    async def launch_question(session_id: int, question_id: int) -> int:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO session_question (session_id, question_id, status) VALUES (%s, %s, 'open')",
                    (session_id, question_id)
                )
                return cur.lastrowid

    @staticmethod
    async def close_question(session_question_id: int):
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE session_question SET status = 'closed' WHERE id = %s",
                    (session_question_id,)
                )

    @staticmethod
    async def get_active_questions(session_id: int) -> list:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("""
                    SELECT sq.id as session_question_id, sq.status, q.*
                    FROM session_question sq
                    JOIN question q ON sq.question_id = q.id
                    WHERE sq.session_id = %s AND sq.status = 'open'
                """, (session_id,))
                return await cur.fetchall()

    @staticmethod
    async def fetch_results(session_id: int):
        # Used for admin dashboard to see closed and open questions with stats
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("""
                    SELECT sq.*, q.text, q.grading_criteria
                    FROM session_question sq
                    JOIN question q ON sq.question_id = q.id
                    WHERE sq.session_id = %s
                """, (session_id,))
                sqs = await cur.fetchall()
                
                for sq in sqs:
                    await cur.execute("""
                        SELECT * FROM student_response 
                        WHERE session_id = %s AND question_id = %s
                    """, (session_id, sq['question_id']))
                    sq['responses'] = await cur.fetchall()
                
                return sqs
