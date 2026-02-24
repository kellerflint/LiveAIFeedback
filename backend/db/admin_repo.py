import aiomysql
import bcrypt
from db.session import get_db_pool
class AdminUserRepository:
    @staticmethod
    async def get_by_username(username: str):
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("SELECT * FROM admin_user WHERE username = %s", (username,))
                return await cur.fetchone()

    @staticmethod
    async def create(username: str, password: str):
        pool = await get_db_pool()
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO admin_user (username, password_hash) VALUES (%s, %s)",
                    (username, hashed)
                )
        return {"username": username}

    @staticmethod
    def verify_password(plain_password, hashed_password):
        # We handle case where older seeds might not be proper hashes
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except ValueError:
            return False
