from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import requests
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Annotated, Any
from pydantic import BeforeValidator
from bson import ObjectId
import uuid
from datetime import datetime, timezone, timedelta

EMERGENT_SESSION_DATA_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="FrameFlow Studio API")
api_router = APIRouter(prefix="/api")


def _validate_object_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    return str(v)


PyObjectId = Annotated[str, BeforeValidator(_validate_object_id)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    def to_mongo(self) -> dict:
        data = self.model_dump(by_alias=True, exclude_none=True)
        data.pop("_id", None)
        return data

    @classmethod
    def from_mongo(cls, doc: dict):
        if not doc:
            return None
        return cls(**doc)


# ---------- Models ----------
class LeadCreate(BaseModel):
    email: EmailStr
    source: str = "waitlist"
    plan: Optional[str] = None


class Lead(BaseDocument):
    lead_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    source: str = "waitlist"
    plan: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    message: str


class Contact(BaseDocument):
    contact_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    message: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "FrameFlow Studio API"}


@api_router.post("/leads", response_model=Lead)
async def create_lead(payload: LeadCreate):
    lead = Lead(email=payload.email, source=payload.source, plan=payload.plan)
    doc = lead.to_mongo()
    result = await db.leads.insert_one(doc)
    lead.id = str(result.inserted_id)
    return lead


@api_router.get("/leads", response_model=List[Lead])
async def list_leads():
    docs = await db.leads.find().sort("created_at", -1).to_list(1000)
    return [Lead.from_mongo(d) for d in docs]


@api_router.post("/contact", response_model=Contact)
async def create_contact(payload: ContactCreate):
    contact = Contact(name=payload.name, email=payload.email, message=payload.message)
    doc = contact.to_mongo()
    result = await db.contacts.insert_one(doc)
    contact.id = str(result.inserted_id)
    return contact


# ---------- Auth (Emergent-managed Google) ----------
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None


async def _fetch_session_data(session_id: str) -> dict:
    def _call():
        return requests.get(
            EMERGENT_SESSION_DATA_URL,
            headers={"X-Session-ID": session_id},
            timeout=15,
        )
    resp = await asyncio.to_thread(_call)
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    return resp.json()


async def get_current_user(request: Request, authorization: Optional[str] = Header(default=None)) -> User:
    token = request.cookies.get("session_token")
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": token})
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)


@api_router.post("/auth/session", response_model=User)
async def create_session(request: Request, response: Response, x_session_id: Optional[str] = Header(default=None)):
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-ID header")

    data = await _fetch_session_data(x_session_id)
    email = data.get("email")
    name = data.get("name") or (email.split("@")[0] if email else "User")
    picture = data.get("picture")
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=401, detail="Invalid session data")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )

    return User(user_id=user_id, email=email, name=name, picture=picture)


@api_router.get("/auth/me", response_model=User)
async def auth_me(request: Request, authorization: Optional[str] = Header(default=None)):
    return await get_current_user(request, authorization)


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie(key="session_token", path="/", samesite="none", secure=True)
    return {"ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
