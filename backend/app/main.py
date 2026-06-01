from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine
from app.models import Base
from app.routers import auth, catalog, checkout, orders, admin
from app.workers.seed import seed as seed_baseline


PG_EXTRAS = [
    # GIN index for FTS
    "CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(search_vector)",
    # Trigger to keep search_vector populated from title + description + category_path
    """
    CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.category_path, '')), 'C');
      RETURN NEW;
    END
    $$ LANGUAGE plpgsql;
    """,
    "DROP TRIGGER IF EXISTS products_search_vector_trigger ON products",
    """
    CREATE TRIGGER products_search_vector_trigger
      BEFORE INSERT OR UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION products_search_vector_update()
    """,
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for stmt in PG_EXTRAS:
            await conn.execute(text(stmt))
    await seed_baseline()
    yield


app = FastAPI(title="TallyTrove API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(checkout.router)
app.include_router(orders.router)
app.include_router(admin.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "tallytrove-api", "version": "1.0.0"}
