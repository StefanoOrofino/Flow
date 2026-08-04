import json, collections
EN_PATH = "/app/frontend/src/i18n/en.json"
IT_PATH = "/app/frontend/src/i18n/it.json"

EN = {"billing": {
    "cloudStorage": "Cloud Storage",
    "cloudStorageIncluded": "Cloud Storage Included",
    "storageNote": "Storage is for your project assets — briefs, storyboards, exports and reference materials. FrameFlow is a production management tool, not a cloud storage service.",
}, "pricing": {"storage": "Cloud storage"}}

IT = {"billing": {
    "cloudStorage": "Spazio di archiviazione cloud",
    "cloudStorageIncluded": "Spazio di archiviazione cloud incluso",
    "storageNote": "Lo spazio di archiviazione è destinato agli asset dei tuoi progetti — brief, storyboard, esportazioni e materiali di riferimento. FrameFlow è uno strumento di gestione della produzione, non un servizio di archiviazione cloud.",
}, "pricing": {"storage": "Spazio cloud"}}

for path, add in [(EN_PATH, EN), (IT_PATH, IT)]:
    data = json.load(open(path), object_pairs_hook=collections.OrderedDict)
    for ns, kv in add.items():
        data.setdefault(ns, {})
        data[ns].update(kv)
    json.dump(data, open(path, "w"), ensure_ascii=False, indent=2)
    print("updated", path)
print("OK")
