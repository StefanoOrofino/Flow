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
        "recommended": False,
        "tagline": "Get started with core pre-production tools.",
        "limits": {
            "projects": 3,
            "ai_generations": 20,
            "image_generations": 10,
            "exports": 5,
        },
        "features": [
            "Up to 3 active projects",
            "20 AI generations / month",
            "10 storyboard image generations / month",
            "5 PDF exports / month",
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
        },
        "features": [
            "Up to 25 active projects",
            "500 AI generations / month",
            "300 storyboard image generations / month",
            "Unlimited PDF exports",
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
        },
        "features": [
            "Unlimited active projects",
            "Unlimited AI generations",
            "1500 storyboard images / month",
            "Unlimited PDF exports",
            "Team seats & branded client portals",
            "500 GB storage",
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
    """Ordered plan catalog for the Billing + Pricing UI."""
    return [PLANS["free"], PLANS["pro"], PLANS["studio"]]


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
            "recommended": plan.get("recommended", False),
        },
        "status": subscription.get("status", "active"),
        "currentPeriodEnd": subscription.get("current_period_end"),
        "cancelAtPeriodEnd": subscription.get("cancel_at_period_end", False),
        "usage": metrics,
        "plans": public_plans(),
        "stripeEnabled": False,
    }
