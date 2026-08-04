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


# Configurable storage quotas (GB). Defaults: Free 5 / Pro 10 / Studio 15.
STORAGE_GB = {
    "free": float(os.environ.get("STORAGE_LIMIT_FREE_GB", 5)),
    "pro": float(os.environ.get("STORAGE_LIMIT_PRO_GB", 10)),
    "studio": float(os.environ.get("STORAGE_LIMIT_STUDIO_GB", 15)),
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
            "projects": 3,
            "ai_generations": 20,
            "image_generations": 10,
            "exports": 5,
            "storage_bytes": _bytes(STORAGE_GB["free"]),
        },
        "features": [
            "Up to 3 active projects",
            "20 AI generations / month",
            "10 storyboard image generations / month",
            "5 PDF exports / month",
            "5 GB cloud storage",
            "Light & dark themes, EN + IT",
        ],
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "price": "€19",
        "interval": "month",
        "recommended": True,
        "tagline": "For working filmmakers and freelancers.",
        "limits": {
            "projects": 25,
            "ai_generations": 500,
            "image_generations": 300,
            "exports": -1,
            "storage_bytes": _bytes(STORAGE_GB["pro"]),
        },
        "features": [
            "Up to 25 active projects",
            "500 AI generations / month",
            "300 storyboard image generations / month",
            "Unlimited PDF exports",
            "10 GB cloud storage",
            "Priority AI Director",
            "Client review links",
        ],
    },
    "studio": {
        "id": "studio",
        "name": "Studio",
        "price": "€49",
        "interval": "month",
        "recommended": False,
        "tagline": "Unlimited scale for studios & teams.",
        "limits": {
            "projects": -1,
            "ai_generations": -1,
            "image_generations": 1500,
            "exports": -1,
            "storage_bytes": _bytes(STORAGE_GB["studio"]),
        },
        "features": [
            "Unlimited active projects",
            "Unlimited AI generations",
            "1500 storyboard images / month",
            "Unlimited PDF exports",
            "15 GB cloud storage",
            "Team seats & branded client portals",
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
    for pid in ("free", "pro", "studio"):
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
        "stripeEnabled": False,
    }

