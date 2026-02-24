from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Real-Time Teaching Feedback"
    # MySQL Database Connection String
    # Formatted for aiomysql: mysql+aiomysql://user:password@host:port/dbname
    DATABASE_URL: str = "mysql+aiomysql://root:my-secret-pw@db:3306/fb_tool"
    
    # OpenRouter Config
    OPENROUTER_API_KEY: str = "dummy-key"
    
    # Secret key for simple admin auth (JWT or session)
    SECRET_KEY: str = "super-secret-key-change-in-production"
    
    class Config:
        env_file = ".env"

settings = Settings()
