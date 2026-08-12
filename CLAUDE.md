# CLAUDE.md — Crowdfunding Watch

## Conventions
- Langue du code et des commentaires : anglais ; UI : bilingue EN (défaut)/FR (dictionnaire `I18N` dans `common.js`)
- Zéro dépendance npm : Node ≥ 20 (`fetch` natif, `node:test`), site statique sans build
- Commits : Conventional Commits, messages en anglais, jamais de `Co-Authored-By: Claude`

## Suivi du travail
- `spec.md` (produit), `epics.md` (planning), `work.md` (exécution), `histoires.md` (personas)
- Toute nouvelle fonctionnalité = un epic : raffiner en backlog items, tests d'abord, statuts TODO/DOING 🔧/DONE ✅

## Tests
`cd collector && node --test test/*.test.js`

## Données
- `collector/collect.js` collecte depuis SEC EDGAR (respecter : User-Agent déclaré, throttle ~3 req/s)
- `data/filings.json` (registre) et `data/summary.json` (agrégats) sont générés — ne pas éditer à la main
