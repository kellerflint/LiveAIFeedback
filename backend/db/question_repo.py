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
                await cur.execute("""
                    SELECT q.*, c.name as collection_name
                    FROM question q
                    LEFT JOIN collection c ON q.collection_id = c.id
                    ORDER BY q.created_at DESC
                """)
                return await cur.fetchall()

    @staticmethod
    async def get_by_collection(collection_id: int) -> List[Dict[str, Any]]:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("""
                    SELECT q.*, c.name as collection_name
                    FROM question q
                    LEFT JOIN collection c ON q.collection_id = c.id
                    WHERE q.collection_id = %s
                    ORDER BY q.created_at DESC
                """, (collection_id,))
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
                    "INSERT INTO question (text, grading_criteria, collection_id) VALUES (%s, %s, %s)",
                    (q.text, q.grading_criteria, q.collection_id)
                )
                await conn.commit()
                return cur.lastrowid

    @staticmethod
    async def update(question_id: int, q: QuestionCreate) -> bool:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE question SET text = %s, grading_criteria = %s, collection_id = %s WHERE id = %s",
                    (q.text, q.grading_criteria, q.collection_id, question_id)
                )
                await conn.commit()
                return cur.rowcount > 0

    @staticmethod
    async def delete(question_id: int) -> bool:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM question WHERE id = %s", (question_id,))
                await conn.commit()
                return cur.rowcount > 0

