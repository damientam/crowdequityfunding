# spec.md — Crowdfunding Watch

Source de vérité **fonctionnelle** du dépôt.

## Vision

Suivre l'activité des principales plateformes américaines d'equity crowdfunding —
**Wefunder**, **StartEngine**, **DealMaker** et **Republic** — avec une
**mise à jour quotidienne** du volume d'activité : nouveaux projets (campagnes),
montants recherchés, montants levés et progression des campagnes.
Interface **bilingue anglais/français, anglais par défaut**.

## Plateformes suivies

| Plateforme | Intermédiaire déclaré dans les Form C |
|---|---|
| Wefunder | Wefunder Portal LLC |
| StartEngine | StartEngine Capital LLC / StartEngine Primary, LLC |
| DealMaker | DealMaker Securities LLC |
| Republic | OpenDeal Portal LLC |

## Source de données

Les sites des plateformes sont protégés par des anti-bots (Cloudflare) et leurs API
privées exigent des identifiants. La source retenue est la **SEC (EDGAR)** : toute
campagne Regulation Crowdfunding passe obligatoirement par des dépôts réglementaires
publics, déposés via le portail intermédiaire :

| Formulaire | Événement | Données clés |
|---|---|---|
| **Form C** | Lancement d'une campagne | émetteur, montant cible, montant max, deadline, type de titre, prix, finances (CA, résultat net, actifs…) |
| **Form C/A** | Amendement d'une campagne | mêmes champs, mis à jour |
| **Form C-U** | Mise à jour de progression | texte `progressUpdate` contenant le **montant levé** |
| **Form C-AR** | Rapport annuel | finances annuelles |
| **Form C-W** | Retrait de la campagne | clôture sans succès |

Accès en deux passes complémentaires, puis téléchargement du `primary_doc.xml`
de chaque dépôt (API gratuites, sans clé ; politique SEC : User-Agent déclaré,
≤ 10 requêtes/s — le collecteur reste ≪ en dessous) :

1. **Recherche plein-texte EDGAR** (`efts.sec.gov`, une requête par plateforme —
   `"Wefunder Portal"`, `"StartEngine"`, `"DealMaker Securities"`, `"OpenDeal Portal"` —
   `forms=C,C-U,C-AR`) — découvre les nouvelles campagnes et tout dépôt citant le
   portail ; le nom d'intermédiaire parsé dans le XML confirme la plateforme.
2. **Balayage des index quotidiens** (`form.YYYYMMDD.idx`) filtré sur les CIK déjà
   connus du registre — indispensable car les Form C-W (et une partie des C-U/C-AR)
   ne mentionnent jamais le portail et échappent à la recherche plein-texte.

## Fonctionnalités

### F1 — Collecte quotidienne
- Un script Node **sans dépendance** (`collector/collect.js`) interroge EDGAR sur une
  plage de dates (par défaut : les 7 derniers jours, pour rattraper les trous).
- Chaque dépôt est parsé et fusionné dans un registre cumulatif `data/filings.json`
  (idempotent : re-collecter une plage déjà vue ne crée pas de doublon).
- Un **snapshot quotidien** est recalculé dans `data/summary.json` : par jour,
  nombre de nouveaux projets, montants cibles, montants max, montants levés (C-U),
  retraits, amendements.
- Le backfill d'un historique est possible : `node collect.js --from 2026-07-01 --to 2026-08-12`.

### F2 — Tableau de bord
- Page statique `index.html` (sans build, comme les autres sous-projets),
  servie par nginx ou ouverte en local. **Bilingue EN/FR (anglais par défaut,
  bascule dans l'en-tête, choix mémorisé en localStorage).**
- **Filtre plateforme** (toutes / Wefunder / StartEngine / DealMaker / Republic)
  qui régit tous les indicateurs, graphiques, fils et tableaux.
- Vue « volume d'activité » : graphique en barres des dépôts par jour — empilé
  **par plateforme** quand « toutes » est sélectionné, **par type de dépôt** sinon.
- Vue « montants » : montants cibles des nouveaux projets, montants levés déclarés
  dans les C-U.
- Vue « projets » : liste des campagnes récentes (émetteur, plateforme, montant
  cible/max, deadline, type de titre, lien EDGAR), triée par date.
- Vue « progression » : dernières mises à jour C-U avec le montant levé extrait.

### F3 — Mise à jour quotidienne automatisée
- `collector/update-daily.sh` : lance la collecte des 7 derniers jours puis commit/push
  si les données ont changé (même modèle que l'édition super-admin de gestemental).
- Ligne crontab documentée dans le README (droplet) ; le dashboard lit les JSON à jour.

## Contraintes
- Zéro dépendance npm (Node ≥ 20 : `fetch` natif, `node:test`).
- UI en français ; code et commentaires en anglais.
- Respect de la politique d'accès SEC (User-Agent identifiant, throttle).

## Limites connues (assumées)
- Les montants **levés en temps réel** ne sont pas publics : EDGAR ne les expose
  qu'aux jalons réglementaires (Form C-U, généralement à 50 % et 100 % de l'objectif,
  et à la clôture). Entre deux jalons, la progression est estimée par les événements
  (amendements, retraits, clôtures).
- Le périmètre est le Reg CF des quatre portails suivis, qui couvre l'essentiel de
  l'activité visible sur leurs sites (les offres Reg D/Reg A+ ne déposent pas de Form C).
