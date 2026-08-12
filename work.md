# work.md — Crowdfunding Watch

Source de vérité de l'**exécution**. Suivi de l'avancement des BI. Statuts : `TODO` / `DOING 🔧` / `DONE ✅` / `PARTIEL ⚠️`.

## R1.1 — Collecteur EDGAR  `DONE ✅`
| BI | Description | Statut |
|---|---|---|
| ES-1 | Parser Form C `primary_doc.xml` (émetteur, montants, deadline, progression) | `DONE ✅` |
| ES-2 | Extraction du montant levé depuis `progressUpdate` (C-U) | `DONE ✅` |
| ES-3 | Agrégation quotidienne (comptes + sommes par jour, cumuls) | `DONE ✅` |
| ES-4 | Collecteur `collect.js` (FTS paginé + balayage des index quotidiens, fusion idempotente, throttle) | `DONE ✅` |

## R1.2 — Tableau de bord & mise à jour quotidienne  `DONE ✅`
| BI | Description | Statut |
|---|---|---|
| US-5 | Dashboard : KPI de période + graphique du volume quotidien (5 types de dépôts) | `DONE ✅` |
| US-6 | Liste des projets récents + fils progression (C-U) et retraits (C-W) | `DONE ✅` |
| ES-7 | `update-daily.sh` + README (crontab droplet) | `DONE ✅` |

## R2.1 — StartEngine, DealMaker, Republic & i18n  `DONE ✅`
| BI | Description | Statut |
|---|---|---|
| ES-8 | Correctif parseur d'index quotidiens (dates `YYYYMMDD`) | `DONE ✅` |
| ES-9 | Collecteur multi-portails (`PORTALS`, champ `platform`, agrégats par plateforme) | `DONE ✅` |
| US-10 | Filtre plateforme + volume empilé par plateforme en vue « toutes » | `DONE ✅` |
| US-11 | Interface bilingue EN/FR, anglais par défaut | `DONE ✅` |

## R3.1 — Accueil comparatif & drill-down  `DONE ✅`
| BI | Description | Statut |
|---|---|---|
| ES-12 | Refactor `common.js` + pages `index.html` (accueil) / `platform.html?p=X` (détail) | `DONE ✅` |
| US-13 | Accueil : explication, KPI marché, cartes plateformes, part de marché, comparatifs, volume empilé, tableau | `DONE ✅` |
| US-14 | Drill-down vers les sections ancrées des pages acteurs + fil d'Ariane | `DONE ✅` |

**Tests : 17/17 verts** (`cd wefunder/collector && node --test test/`).

## Journal

- **2026-08-12** — Étude de faisabilité : wefunder.com bloqué par Cloudflare (curl et
  Chromium headless), API privée `api.wefunder.com` à identifiants. Source retenue :
  **SEC EDGAR full-text search** (`q="Wefunder Portal"`, forms C/C-A/C-U/C-AR/C-W),
  validée en direct (4 549 dépôts historiques ; `primary_doc.xml` porte montants
  cibles/max, deadline, finances, et le C-U le montant levé). Rédaction
  spec/epics/work/histoires. Démarrage R1.1.
- **2026-08-12** — R1.1 livrée : parser (fixtures réelles Boxsy Form C + YSMD C-U),
  extraction des montants, agrégation quotidienne, collecteur idempotent.
  Découverte en backfill : `forms=C` ne couvre que C et C/A, et les **Form C-W ne
  citent jamais le portail** (introuvables en plein-texte) → ajout d'une seconde
  passe par **balayage des index quotidiens** (`form.YYYYMMDD.idx`) filtrée sur les
  CIK connus du registre. 16 tests verts.
- **2026-08-12** — R2.1 livrée (demande utilisateur) : extension à **StartEngine,
  DealMaker et Republic** (config `PORTALS`, confirmation par le nom d'intermédiaire —
  StartEngine utilise « StartEngine Capital LLC » puis « StartEngine Primary, LLC » ;
  Republic = « OpenDeal Portal LLC »), champ `platform` sur chaque dépôt, agrégats
  par plateforme. Interface **bilingue EN/FR, anglais par défaut**. Correctif ES-8 :
  les index quotidiens datent en `YYYYMMDD` — le balayage renvoyait 0. Backfill des
  4 plateformes depuis 2026-01-01. 17 tests verts.
- **2026-08-12** — R1.2 livrée : tableau de bord statique français (KPI, volume
  quotidien empilé par type, montants recherchés, fils progression/retraits, table
  des dépôts avec liens EDGAR ; périodes 30 j/90 j/6 mois/tout, agrégation
  hebdomadaire au-delà de 120 j, mode sombre). Palette catégorielle validée
  (validateur dataviz, modes clair et sombre). Rendu vérifié dans Chromium
  (clair + sombre, zéro erreur console). Backfill réel depuis 2026-01-01 :
  235+ dépôts. `update-daily.sh` + README (crontab).
- **2026-08-12** — R3.1 livrée (demande utilisateur) : restructuration en **portail
  comparatif**. `common.js` partagé ; `index.html` devient la page d'accueil
  (explication du principe, KPI marché, cartes plateformes aux couleurs d'identité,
  part de marché des nouvelles campagnes, comparatifs horizontaux, volume quotidien
  empilé par plateforme, tableau d'indicateurs) ; `platform.html?p=<id>` porte le
  détail par acteur (sections ancrées `#volume`, `#amounts`, `#progress`,
  `#withdrawals`, `#projects`). Drill-down complet : cartes, mini-KPI, barres,
  légendes et cellules du tableau mènent à la bonne section du bon acteur.
