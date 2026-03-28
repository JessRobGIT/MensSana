# Backend — MensSana

Dieses Verzeichnis enthält alles rund um das Backend von MensSana.

## Struktur

```
backend/
├─ supabase/
│  ├─ schema.sql     # Datenbankschema
│  ├─ policies.sql   # Row Level Security Policies
│  └─ seed.sql       # Beispieldaten
└─ functions/
   └─ README.md      # Servernahe Funktionen (Edge Functions etc.)
```

## Technologie

- **Datenbank:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Funktionen:** Supabase Edge Functions (geplant)

## Setup

1. Supabase-Projekt anlegen unter [supabase.com](https://supabase.com)
2. `schema.sql` im SQL-Editor einspielen
3. `policies.sql` einspielen
4. Optional: `seed.sql` für Testdaten
