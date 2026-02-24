import aiomysql
from core.config import settings

# Global pool instance
_pool = None

async def init_db_pool():
    global _pool
    # Parse the SQLAlchemy style URL to aiomysql args
    # format: mysql+aiomysql://root:my-secret-pw@db:3306/fb_tool
    db_url = settings.DATABASE_URL.replace("mysql+aiomysql://", "")
    auth_part, host_part = db_url.split("@")
    user, password = auth_part.split(":")
    host_port, db = host_part.split("/")
    
    if ":" in host_port:
        host, port = host_port.split(":")
        port = int(port)
    else:
        host = host_port
        port = 3306
        
    _pool = await aiomysql.create_pool(
        host=host,
        port=port,
        user=user,
        password=password,
        db=db,
        autocommit=True
    )
    return _pool

async def get_db_pool():
    if _pool is None:
        await init_db_pool()
    return _pool

async def close_db_pool():
    global _pool
    if _pool is not None:
        _pool.close()
        await _pool.wait_closed()
