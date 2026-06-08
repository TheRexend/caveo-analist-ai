import json

with open("/Users/matheus/Documents/Claude/Projects/caveo_analist_ai/scratch/all_won_utm.json") as f:
    records = json.load(f)

paid_media_records = []

for r in records:
    source = r.get("UtmSou__c") or ""
    medium = r.get("UtmMed__c") or ""
    url = r.get("UrlUtm__c") or ""
    gclid = r.get("gclid__c") or ""
    fbclid = r.get("fbclid__c") or ""
    
    s_lower = source.lower()
    m_lower = medium.lower()
    
    matches_dashboard = (
        s_lower.startswith("facebook") or 
        s_lower.startswith("instagram") or 
        s_lower.startswith("google") or 
        source == "{{placement}}" or 
        medium == "paid_social"
    )
    
    url_lower = url.lower()
    has_click_id_in_url = any(x in url_lower for x in ["gclid=", "fbclid=", "gbraid=", "wbraid="])
    
    is_paid = matches_dashboard or bool(gclid) or bool(fbclid) or has_click_id_in_url
    
    if s_lower.startswith("bioinsta") or "indicacao" in s_lower or "indicação" in s_lower or "colega" in s_lower:
        # Note: we want to keep the one exception that had gclid in URL!
        if not has_click_id_in_url:
            is_paid = False
            
    if is_paid:
        paid_media_records.append(r)

# Sort by CreatedDate
paid_media_records.sort(key=lambda x: x.get("CreatedDate", ""))

print(f"Total Paid Media Won Opportunities sorted by date: {len(paid_media_records)}")
for idx, r in enumerate(paid_media_records):
    source = r.get("UtmSou__c") or "None"
    medium = r.get("UtmMed__c") or "None"
    url = r.get("UrlUtm__c") or "None"
    gclid = r.get("gclid__c") or ""
    fbclid = r.get("fbclid__c") or ""
    stage = r.get("StageName")
    created = r.get("CreatedDate")
    lead_source = r.get("LeadSource")
    
    # Check if this is the special one
    is_special = "Indicação" in source
    special_marker = " *[Atribuição por Click ID em URL]*" if is_special else ""
    
    print(f"{idx+1}. Data: {created[:10]} | Fase: {stage}{special_marker}")
    print(f"   ID: {r['Id']} | Origem: {source} | Mídia: {medium} | Lead Source: {lead_source}")
    print(f"   URL: {url[:120]}...")
    if gclid or fbclid:
        print(f"   Click IDs: gclid={gclid[:20]}... fbclid={fbclid[:20]}...")
    print("-" * 50)
