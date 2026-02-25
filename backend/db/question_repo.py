import aiomysql
from db.session import get_db_pool
from models.schemas import QuestionCreate
from typing import List, Dict, Any

class QuestionRepository:
    @staticmethod
    async def get_all() -> List[Dict[str, Any]]:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("SELECT * FROM question ORDER BY created_at DESC")
                return await cur.fetchall()

    @staticmethod
    async def get_by_id(question_id: int) -> dict:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("SELECT * FROM question WHERE id = %s", (question_id,))
                return await cur.fetchone()

    @staticmethod
    async def create(q: QuestionCreate) -> int:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO question (text, grading_criteria) VALUES (%s, %s)",
                    (q.text, q.grading_criteria)
                )
                return cur.lastrowid

    @staticmethod
    async def update(question_id: int, q: QuestionCreate) -> bool:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE question SET text = %s, grading_criteria = %s WHERE id = %s",
                    (q.text, q.grading_criteria, question_id)
                )
                return cur.rowcount > 0

    @staticmethod
    async def delete(question_id: int) -> bool:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM question WHERE id = %s", (question_id,))
                return cur.rowcount > 0
