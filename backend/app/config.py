from pydantic_settings import BaseSettings
from pydantic import Field
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Inventory & Order Management System"
    ENV: str = "dev"
    
    # Fallback to local SQLite database if Postgres is not available
    DATABASE_URL: str = Field(
        default="sqlite:///./inventory.db",
        validation_alias="DATABASE_URL"
    )

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Adjust database URL for SQLAlchemy SQLite compatibility
# SQLite requires 'sqlite:///' but sometimes systems provide slightly different schemas.
# Also, if we're using SQLite, we want to enable WAL mode and foreign key constraints.
if settings.DATABASE_URL.startswith("postgres://"):
    # SQLAlchemy requires postgresql:// instead of postgres://
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql://", 1)
