import aiomysql
from db.session import get_db_pool

class CollectionRepository:
    @staticmethod
    async def get_all() -> list:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("""
                    SELECT c.*, COUNT(q.id) as question_count
                    FROM collection c
                    LEFT JOIN question q ON q.collection_id = c.id
                    GROUP BY c.id
                    ORDER BY c.id ASC
                """)
                return await cur.fetchall()

    @staticmethod
    async def create(name: str) -> int:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO collection (name) VALUES (%s)", (name,)
                )
                await conn.commit()
                return cur.lastrowid

    @staticmethod
    async def rename(collection_id: int, name: str) -> bool:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE collection SET name = %s WHERE id = %s",
                    (name, collection_id)
                )
                await conn.commit()
                return cur.rowcount > 0

    @staticmethod
    async def delete_move(collection_id: int, target_id: int):
        """Move all questions to target collection, then delete the source collection."""
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            await conn.begin()
            try:
                async with conn.cursor() as cur:
                    await cur.execute(
                        "UPDATE question SET collection_id = %s WHERE collection_id = %s",
                        (target_id, collection_id)
                    )
                    await cur.execute(
                        "DELETE FROM collection WHERE id = %s", (collection_id,)
                    )
                await conn.commit()
            except Exception as e:
                await conn.rollback()
                raise e

    @staticmethod
    async def delete_purge(collection_id: int):
        """Delete all questions in the collection, then delete the collection itself."""
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            await conn.begin()
            try:
                async with conn.cursor() as cur:
                    await cur.execute(
                        "DELETE FROM question WHERE collection_id = %s", (collection_id,)
                    )
                    await cur.execute(
                        "DELETE FROM collection WHERE id = %s", (collection_id,)
                    )
                await conn.commit()
            except Exception as e:
                await conn.rollback()
                raise e
