"""Subscriptions & entitlements (Run 1 — read-only, no Stripe yet).

Defines the plan catalog + limits and a get-or-create Free subscription per
user. Usage is tracked in db.usage and read back for the Billing UI. Stripe
checkout/webhooks are intentionally NOT here (Run 2).
"""

# Entitlement catalog. limit == -1 means unlimited.
PLANS = {
    "free": {
        "id": "free",
        "name": "Free",
        "price": "€0",
        "interval": "forever",
        "tagline": "Get started with core pre-production tools.",
        "limits": {
            "projects": 3,
            "ai_generations": 20,
            "image_generations": 10,
            "exports": 5,
        },
        "features": [
            "Up to 3 projects",
            "20 AI generations / month",
            "10 storyboard image generations / month",
            "5 PDF/CSV exports / month",
            "Light & dark themes, EN + IT",
        ],
    },
    "studio": {
        "id": "studio",
        "name": "Studio",
        "price": "€19",
        "interval": "month",
        "tagline": "For working filmmakers and small teams.",
        "limits": {
            "projects": 50,
            "ai_generations": 500,
            "image_generations": 300,
            "exports": -1,
        },
        "features": [
            "Up to 50 projects",
            "500 AI generations / month",
            "300 storyboard image generations / month",
            "Unlimited exports",
            "Priority AI Director",
        ],
    },
    "agency": {
        "id": "agency",
        "name": "Agency",
        "price": "€49",
        "interval": "month",
        "tagline": "Unlimited scale for agencies & studios.",
        "limits": {
            "projects": -1,
            "ai_generations": -1,
            "image_generations": -1,
            "exports": -1,
        },
        "features": [
            "Unlimited projects",
            "Unlimited AI generations",
            "Unlimited storyboard images",
            "Unlimited exports",
            "Everything in Studio",
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
    """Ordered plan catalog for the read-only Billing UI."""
    return [PLANS["free"], PLANS["studio"], PLANS["agency"]]


def build_summary(subscription: dict, usage_counts: dict) -> dict:
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
        },
        "status": subscription.get("status", "active"),
        "currentPeriodEnd": subscription.get("current_period_end"),
        "cancelAtPeriodEnd": subscription.get("cancel_at_period_end", False),
        "usage": metrics,
        "plans": public_plans(),
        "stripeEnabled": False,
    }
