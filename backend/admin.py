"""
FrameFlow Admin Console — RBAC + admin API (Phase 1 foundation).

Design (per vetted RBAC playbook):
- MongoDB is the single source of truth for roles. The JWT only carries `user_id`;
  role is read from the DB on every privileged request (honors demotions instantly,
  never trusts the client).
- Roles: owner > admin > support > user.
- Owner is seeded DYNAMICALLY and ONCE via an idempotent bootstrap lock
  (db.owner_bootstrap singleton). The first authenticated user to claim it becomes
  Owner; afterwards the endpoint is closed. An optional OWNER_EMAIL env var provides
  a configurable startup seed (lets the Owner be changed later via configuration).
- Owner role is protected: it cannot be demoted through the role endpoint, and only
  an Owner may grant Owner.
- Every admin mutation writes an audit record (actor, action, target, before/after, ts).
"""
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import billing

ROLES = ("owner", "admin", "support", "user")
PRIVILEGED = ("owner", "admin", "support")


def _now():
    return datetime.now(timezone.utc)


def role_of(user: dict) -> str:
    r = (user or {}).get("role") or "user"
    return r if r in ROLES else "user"


class RoleChange(BaseModel):
    role: str


def build_admin_router(db, get_current_user):
    """Return an APIRouter (prefix /admin) wired to the app's db + auth dependency."""
    router = APIRouter(prefix="/admin", tags=["admin"])

    # ---- role dependencies -------------------------------------------------
    async def current(user=Depends(get_current_user)):
        user["role"] = role_of(user)
        return user

    def require(*allowed):
        async def dep(user=Depends(current)):
            if user["role"] not in allowed:
                raise HTTPException(status_code=403, detail="Administrator access required")
            return user
        return dep

    admin_only = require("owner", "admin")
    privileged = require("owner", "admin", "support")

    # ---- audit -------------------------------------------------------------
    async def audit(actor: dict, action: str, target_id: Optional[str] = None,
                    before=None, after=None, meta=None):
        await db.audit_logs.insert_one({
            "action": action,
            "actor_user_id": (actor or {}).get("user_id", "system"),
            "actor_email": (actor or {}).get("email"),
            "target_user_id": target_id,
            "before": before,
            "after": after,
            "meta": meta or {},
            "created_at": _now().isoformat(),
        })

    # ---- bootstrap / status ------------------------------------------------
    @router.get("/status")
    async def status(user=Depends(current)):
        """Any authenticated user: is there an owner, and can I claim it?"""
        lock = await db.owner_bootstrap.find_one({"_id": "singleton"})
        owner_exists = lock is not None
        my_role = user["role"]
        return {
            "owner_exists": owner_exists,
            "my_role": my_role,
            "is_privileged": my_role in PRIVILEGED,
            "can_claim": (not owner_exists),
        }

    @router.post("/claim-owner")
    async def claim_owner(user=Depends(current)):
        """One-time dynamic Owner seed: the first authenticated user to call this
        becomes Owner. Idempotency is guaranteed by the unique singleton lock."""
        existing = await db.owner_bootstrap.find_one({"_id": "singleton"})
        if existing:
            # Already claimed. If it's me, that's fine; otherwise forbidden.
            if existing.get("owner_user_id") == user["user_id"]:
                return {"ok": True, "role": "owner", "already": True}
            raise HTTPException(status_code=403, detail="Owner has already been assigned")
        try:
            await db.owner_bootstrap.insert_one({
                "_id": "singleton",
                "owner_user_id": user["user_id"],
                "created_at": _now().isoformat(),
            })
        except Exception:
            # Lost the race to a concurrent claim.
            raise HTTPException(status_code=403, detail="Owner has already been assigned")
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"role": "owner"}})
        await audit(user, "owner_seeded", target_id=user["user_id"],
                    before={"role": user["role"]}, after={"role": "owner"})
        return {"ok": True, "role": "owner", "already": False}

    # ---- dashboard summary -------------------------------------------------
    @router.get("/summary")
    async def summary(user=Depends(admin_only)):
        total_users = await db.users.count_documents({})
        roles = {r: await db.users.count_documents({"role": r}) for r in ROLES}
        # users with no role field yet count as "user"
        roles["user"] = await db.users.count_documents({"$or": [{"role": "user"}, {"role": {"$exists": False}}]})

        total_projects = await db.projects.count_documents({})
        generated = await db.projects.count_documents({"status": "generated"})
        drafts = total_projects - generated
        archived = await db.projects.count_documents({"archived": True})

        # scene + usage aggregates
        scene_agg = await db.projects.aggregate([
            {"$project": {"n": {"$size": {"$ifNull": ["$scenes", []]}}}},
            {"$group": {"_id": None, "total": {"$sum": "$n"}}},
        ]).to_list(1)
        total_scenes = (scene_agg[0]["total"] if scene_agg else 0)

        usage_agg = await db.usage.aggregate([
            {"$group": {"_id": None,
                        "ai": {"$sum": {"$ifNull": ["$ai_generations", 0]}},
                        "img": {"$sum": {"$ifNull": ["$image_generations", 0]}},
                        "exp": {"$sum": {"$ifNull": ["$exports", 0]}}}},
        ]).to_list(1)
        usage = usage_agg[0] if usage_agg else {"ai": 0, "img": 0, "exp": 0}

        # platform storage usage (total BSON size of all project docs)
        stor_agg = await db.projects.aggregate([
            {"$group": {"_id": None, "bytes": {"$sum": {"$bsonSize": "$$ROOT"}}}},
        ]).to_list(1)
        storage_used = int(stor_agg[0]["bytes"]) if stor_agg else 0

        # recent signups (last 30 days count) + newest 5
        recent = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(5)
        for r in recent:
            r["role"] = role_of(r)

        return {
            "users": {"total": total_users, "by_role": roles},
            "projects": {"total": total_projects, "generated": generated, "drafts": drafts, "archived": archived},
            "content": {"scenes": total_scenes},
            "usage": {"ai_generations": usage.get("ai", 0), "image_generations": usage.get("img", 0), "exports": usage.get("exp", 0)},
            "storage": {
                "used_bytes": storage_used,
                "used_label": billing.format_bytes(storage_used),
                "quotas_gb": billing.STORAGE_GB,
            },
            "recent_users": recent,
            "health": {"api": "operational", "database": "connected", "ai_provider": os.environ.get("AI_PROVIDER", "openai"),
                       "image_provider": os.environ.get("IMAGE_PROVIDER", "mock")},
        }

    # ---- users -------------------------------------------------------------
    @router.get("/users")
    async def list_users(user=Depends(admin_only)):
        users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
        # attach project counts + plan
        out = []
        for u in users:
            uid = u["user_id"]
            pcount = await db.projects.count_documents({"user_id": uid})
            sub = await db.subscriptions.find_one({"user_id": uid}, {"_id": 0})
            out.append({
                "user_id": uid,
                "email": u.get("email"),
                "name": u.get("name", ""),
                "role": role_of(u),
                "created_at": u.get("created_at"),
                "projects": pcount,
                "plan": (sub or {}).get("plan_id", "free"),
            })
        return {"users": out}

    @router.patch("/users/{target_id}/role")
    async def change_role(target_id: str, body: RoleChange, actor=Depends(admin_only)):
        new_role = body.role
        if new_role not in ROLES:
            raise HTTPException(status_code=422, detail="Invalid role")
        target = await db.users.find_one({"user_id": target_id})
        if not target:
            raise HTTPException(status_code=404, detail="User not found")
        old_role = role_of(target)

        # Owner protection.
        if old_role == "owner" and new_role != "owner":
            raise HTTPException(status_code=403, detail="The Owner role is protected and cannot be removed")
        if new_role == "owner" and actor["role"] != "owner":
            raise HTTPException(status_code=403, detail="Only the Owner can grant the Owner role")
        # Admins cannot modify other admins/owners; only owner can.
        if actor["role"] == "admin" and old_role in ("owner", "admin") and target_id != actor["user_id"]:
            raise HTTPException(status_code=403, detail="Only the Owner can change another admin's role")

        await db.users.update_one({"user_id": target_id}, {"$set": {"role": new_role}})
        await audit(actor, "role_changed", target_id=target_id,
                    before={"role": old_role}, after={"role": new_role})
        return {"user_id": target_id, "role": new_role}

    # ---- projects (read-only, all users) -----------------------------------
    @router.get("/projects")
    async def list_all_projects(user=Depends(admin_only)):
        projects = await db.projects.find(
            {}, {"_id": 0, "id": 1, "title": 1, "status": 1, "user_id": 1, "scenes": 1,
                 "updated_at": 1, "archived": 1, "client": 1, "video_type": 1}
        ).sort("updated_at", -1).to_list(500)
        # map user_id -> email
        emails = {}
        for u in await db.users.find({}, {"_id": 0, "user_id": 1, "email": 1}).to_list(1000):
            emails[u["user_id"]] = u.get("email")
        out = []
        for p in projects:
            out.append({
                "id": p.get("id"),
                "title": p.get("title") or "Untitled",
                "status": p.get("status", "draft"),
                "owner_email": emails.get(p.get("user_id"), "—"),
                "scenes": len(p.get("scenes") or []),
                "client": p.get("client"),
                "video_type": p.get("video_type"),
                "archived": bool(p.get("archived")),
                "updated_at": p.get("updated_at"),
            })
        return {"projects": out}

    # ---- audit log ---------------------------------------------------------
    @router.get("/audit")
    async def audit_log(user=Depends(admin_only)):
        rows = await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
        return {"audit": rows}

    return router


async def seed_owner_from_env(db):
    """Optional configurable startup seed. If OWNER_EMAIL is set and no owner has been
    claimed yet, promote that user to Owner once. Never silently transfers an existing
    ownership (bootstrap lock makes it a one-time operation)."""
    email = (os.environ.get("OWNER_EMAIL") or "").strip().lower()
    if not email:
        return
    if await db.owner_bootstrap.find_one({"_id": "singleton"}):
        return
    user = await db.users.find_one({"email": email})
    if not user:
        return
    try:
        await db.owner_bootstrap.insert_one({
            "_id": "singleton", "owner_user_id": user["user_id"], "created_at": _now().isoformat(),
        })
    except Exception:
        return
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"role": "owner"}})
    await db.audit_logs.insert_one({
        "action": "owner_seeded", "actor_user_id": "system", "target_user_id": user["user_id"],
        "before": None, "after": {"role": "owner"}, "meta": {"via": "OWNER_EMAIL"}, "created_at": _now().isoformat(),
    })
