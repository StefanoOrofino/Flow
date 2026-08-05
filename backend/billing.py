"""Subscriptions & entitlements (Run 1 — read-only, no Stripe yet).

Defines the plan catalog + limits and a get-or-create Free subscription per
user. Usage is tracked in db.usage and read back for the Billing UI. Stripe
checkout/webhooks are intentionally NOT here (Run 2).

Storage quotas are configurable server-side via environment variables
(STORAGE_LIMIT_FREE_GB / _PRO_GB / _STUDIO_GB). Storage is for project assets —
briefs, storyboards, exports and reference materials — not general cloud storage.
"""
import os

_GB = 1024 ** 3


def _bytes(gb: float) -> int:
    return int(round(float(gb) * _GB))


# Configurable storage quotas (GB). Defaults: Free 1 / Standard 5 / Pro 15 / Studio 50.
STORAGE_GB = {
    "free": float(os.environ.get("STORAGE_LIMIT_FREE_GB", 1)),
    "standard": float(os.environ.get("STORAGE_LIMIT_STANDARD_GB", 5)),
    "pro": float(os.environ.get("STORAGE_LIMIT_PRO_GB", 15)),
    "studio": float(os.environ.get("STORAGE_LIMIT_STUDIO_GB", 50)),
}


def format_bytes(n: int) -> str:
    n = max(0, int(n or 0))
    if n < _GB:
        mb = n / (1024 ** 2)
        return f"{mb:.0f} MB" if mb >= 1 else "0 MB"
    return f"{n / _GB:.1f} GB".replace(".0 GB", " GB")


def _storage_feature(plan_id: str) -> str:
    gb = STORAGE_GB[plan_id]
    return f"{gb:g} GB cloud storage"


# Entitlement catalog. limit == -1 means unlimited.
PLANS = {
    "free": {
        "id": "free",
        "name": "Free",
        "price": "€0",
        "interval": "forever",
        "recommended": False,
        "tagline": "Get started with core pre-production tools.",
        "limits": {
            "projects": 2,
            "ai_generations": 20,
            "image_generations": 10,
            "brief_imports": 3,
            "exports": 5,
            "seats": 1,
            "storage_bytes": _bytes(STORAGE_GB["free"]),
        },
        "features": [
            "Up to 2 active projects",
            "20 AI generations / month",
            "10 storyboard image generations / month",
            "5 PDF exports / month",
            "1 GB cloud storage",
            "Light & dark themes, EN + IT",
        ],
    },
    "standard": {
        "id": "standard",
        "name": "Standard",
        "price": "€19,90",
        "interval": "month",
        "recommended": False,
        "tagline": "For solo creators shipping regularly.",
        "limits": {
            "projects": 10,
            "ai_generations": 150,
            "image_generations": 100,
            "brief_imports": 20,
            "exports": -1,
            "seats": 1,
            "storage_bytes": _bytes(STORAGE_GB["standard"]),
        },
        "features": [
            "Up to 10 active projects",
            "150 AI generations / month",
            "100 storyboard image generations / month",
            "Unlimited PDF exports",
            "5 GB cloud storage",
            "Client review links",
        ],
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "price": "€49,90",
        "interval": "month",
        "recommended": True,
        "tagline": "For working filmmakers and freelancers.",
        "limits": {
            "projects": 40,
            "ai_generations": 600,
            "image_generations": 400,
            "brief_imports": 100,
            "exports": -1,
            "seats": 3,
            "storage_bytes": _bytes(STORAGE_GB["pro"]),
        },
        "features": [
            "Up to 40 active projects",
            "600 AI generations / month",
            "400 storyboard image generations / month",
            "Unlimited PDF exports",
            "15 GB cloud storage",
            "3 team seats",
            "Priority AI Director",
        ],
    },
    "studio": {
        "id": "studio",
        "name": "Studio",
        "price": "€99,90",
        "interval": "month",
        "recommended": False,
        "tagline": "Unlimited scale for studios & teams.",
        "limits": {
            "projects": -1,
            "ai_generations": -1,
            "image_generations": 2000,
            "brief_imports": -1,
            "exports": -1,
            "seats": 10,
            "storage_bytes": _bytes(STORAGE_GB["studio"]),
        },
        "features": [
            "Unlimited active projects",
            "Unlimited AI generations",
            "2000 storyboard images / month",
            "Unlimited PDF exports",
            "50 GB cloud storage",
            "10 team seats & branded client portals",
        ],
    },
}

USAGE_METRICS = [
    ("projects", "Projects"),
    ("ai_generations", "AI generations"),
    ("image_generations", "Storyboard images"),
    ("exports", "Exports"),
]

DEFAULT_PLAN = "free"


def get_plan(plan_id: str) -> dict:
    return PLANS.get(plan_id or DEFAULT_PLAN, PLANS[DEFAULT_PLAN])


def public_plans() -> list:
    """Ordered plan catalog for the Billing + Pricing UI (adds storage_gb for display)."""
    out = []
    for pid in ("free", "standard", "pro", "studio"):
        p = dict(PLANS[pid])
        p["storage_gb"] = STORAGE_GB[pid]
        p["storage_bytes"] = _bytes(STORAGE_GB[pid])
        out.append(p)
    return out


def build_storage(plan: dict, used_bytes: int) -> dict:
    limit = int(plan["limits"].get("storage_bytes", 0) or 0)
    unlimited = limit == -1
    used = max(0, int(used_bytes or 0))
    pct = 0 if unlimited or limit == 0 else min(100, round(used / limit * 100))
    return {
        "label": "Cloud Storage Included",
        "used_bytes": used,
        "limit_bytes": limit,
        "unlimited": unlimited,
        "percent": pct,
        "used_label": format_bytes(used),
        "limit_label": ("Unlimited" if unlimited else format_bytes(limit)),
        "display": f"{format_bytes(used)} / {'Unlimited' if unlimited else format_bytes(limit)}",
    }


def build_summary(subscription: dict, usage_counts: dict, storage_used_bytes: int = 0) -> dict:
    plan = get_plan(subscription.get("plan_id"))
    limits = plan["limits"]
    metrics = []
    for key, label in USAGE_METRICS:
        used = int(usage_counts.get(key, 0) or 0)
        limit = limits.get(key, 0)
        unlimited = limit == -1
        pct = 0 if unlimited or limit == 0 else min(100, round(used / limit * 100))
        metrics.append({
            "key": key, "label": label, "used": used,
            "limit": limit, "unlimited": unlimited,
            "percent": pct,
            "remaining": (-1 if unlimited else max(0, limit - used)),
        })
    return {
        "plan": {
            "id": plan["id"], "name": plan["name"], "price": plan["price"],
            "interval": plan["interval"], "tagline": plan["tagline"],
            "features": plan["features"], "limits": limits,
            "storage_gb": STORAGE_GB[plan["id"]],
            "recommended": plan.get("recommended", False),
        },
        "status": subscription.get("status", "active"),
        "currentPeriodEnd": subscription.get("current_period_end"),
        "cancelAtPeriodEnd": subscription.get("cancel_at_period_end", False),
        "usage": metrics,
        "storage": build_storage(plan, storage_used_bytes),
        "plans": public_plans(),
        "stripeEnabled": True,
    }

