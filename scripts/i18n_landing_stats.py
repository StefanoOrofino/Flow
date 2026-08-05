import json

for path, stats in [
    ("/app/frontend/src/i18n/en.json", [
        {"value": "Minutes", "label": "From brief to full package"},
        {"value": "6+", "label": "Deliverables per project"},
        {"value": "EN · IT", "label": "Fully localized"},
        {"value": "100%", "label": "Source-verified, never invented"},
    ]),
    ("/app/frontend/src/i18n/it.json", [
        {"value": "Minuti", "label": "Dal brief al pacchetto completo"},
        {"value": "6+", "label": "Deliverable per progetto"},
        {"value": "EN · IT", "label": "Completamente localizzato"},
        {"value": "100%", "label": "Verificato dalle fonti, mai inventato"},
    ]),
]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    data["landing"]["stats"] = stats
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("updated", path)
