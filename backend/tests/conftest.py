import pytest
import asyncio
import pytest_asyncio
from httpx import AsyncClient
from main import app
from db.session import get_db_pool, init_db_pool, close_db_pool

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    await init_db_pool()
    yield
    await close_db_pool()

@pytest_asyncio.fixture(autouse=True)
async def reset_db(setup_db):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SET FOREIGN_KEY_CHECKS = 0")
            await cur.execute("TRUNCATE TABLE student_response")
            await cur.execute("TRUNCATE TABLE session_question")
            await cur.execute("TRUNCATE TABLE session")
            await cur.execute("TRUNCATE TABLE question")
            # Clear admin_user and re-seed to ensure clean state
            await cur.execute("TRUNCATE TABLE admin_user")
            await cur.execute("INSERT INTO admin_user (username, password_hash) VALUES ('admin', '$2b$12$A//WYZ.2uhuZ9dM/VkvIeu6wCwt2l1tOtG4t0PryzniXGW72YC6/6')")
            # Clear collection and re-seed Default
            await cur.execute("TRUNCATE TABLE collection")
            await cur.execute("INSERT INTO collection (id, name) VALUES (1, 'Default')")
            await cur.execute("SET FOREIGN_KEY_CHECKS = 1")

@pytest_asyncio.fixture
async def async_client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture
async def admin_token(async_client):
    response = await async_client.post(
        "/api/admin/login",
        data={"username": "admin", "password": "admin"}
    )
    if response.status_code != 200:
        raise Exception(f"Failed to login: {response.text}")
    return response.json()["access_token"]
