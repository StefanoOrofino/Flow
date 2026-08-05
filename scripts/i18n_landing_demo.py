import json

EN_PATH = "/app/frontend/src/i18n/en.json"
IT_PATH = "/app/frontend/src/i18n/it.json"

en_patch = {
    "hero_microtrust": "No credit card · Free forever plan · Export-ready PDFs",
    "trust_label": "BUILT FOR MODERN VIDEO TEAMS",
    "trust_items": ["Filmmakers", "Videographers", "Ad agencies", "Production houses", "Content creators"],
    "demo": {
        "title": "See FrameFlow in action",
        "subtitle": "A quick look at how a brief becomes a full production package.",
        "close": "Close",
        "steps": [
            "Upload your client brief",
            "AI reads every page",
            "Facts extracted — with sources",
            "Your production package, ready",
        ],
        "upload": "brief.pdf",
        "uploadHint": "Drop PDF, docs & reference images",
        "analyzing": "Analyzing documents…",
        "fields": {"client": "Client", "goal": "Goal", "duration": "Duration", "platform": "Platform"},
        "fieldVals": {"client": "Aurelia Paris", "goal": "Launch film", "duration": "30s", "platform": "Instagram"},
        "packageLabel": "6 scenes · script · shot list",
    },
    "brief_mockTitle": "brief.pdf",
    "brief_extracted": "Extracted",
}

it_patch = {
    "hero_microtrust": "Nessuna carta di credito · Piano gratuito per sempre · PDF pronti all'uso",
    "trust_label": "PENSATO PER I TEAM VIDEO MODERNI",
    "trust_items": ["Filmmaker", "Videomaker", "Agenzie pubblicitarie", "Case di produzione", "Content creator"],
    "demo": {
        "title": "Guarda FrameFlow in azione",
        "subtitle": "Uno sguardo veloce a come un brief diventa un pacchetto di produzione completo.",
        "close": "Chiudi",
        "steps": [
            "Carica il brief del cliente",
            "L'AI legge ogni pagina",
            "Dati estratti — con le fonti",
            "Il tuo pacchetto di produzione, pronto",
        ],
        "upload": "brief.pdf",
        "uploadHint": "Trascina PDF, documenti e immagini",
        "analyzing": "Analisi dei documenti…",
        "fields": {"client": "Cliente", "goal": "Obiettivo", "duration": "Durata", "platform": "Piattaforma"},
        "fieldVals": {"client": "Aurelia Paris", "goal": "Film di lancio", "duration": "30s", "platform": "Instagram"},
        "packageLabel": "6 scene · sceneggiatura · shot list",
    },
    "brief_mockTitle": "brief.pdf",
    "brief_extracted": "Estratto",
}

def apply(path, patch):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    L = data["landing"]
    L["hero"]["microtrust"] = patch["hero_microtrust"]
    L["trust"]["label"] = patch["trust_label"]
    L["trust"]["items"] = patch["trust_items"]
    L["demo"] = patch["demo"]
    L["brief"]["mockTitle"] = patch["brief_mockTitle"]
    L["brief"]["extracted"] = patch["brief_extracted"]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("updated", path)

apply(EN_PATH, en_patch)
apply(IT_PATH, it_patch)
