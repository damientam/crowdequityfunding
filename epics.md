# epics.md — Crowdfunding Watch

Source de vérité du **planning**. Epics → releases → backlog items (BI). Statuts : `TODO` / `DOING 🔧` / `DONE ✅` / `PARTIEL ⚠️`.

Rappel : un **BI** est une User Story (US) ou Engineering Story (ES), tests inclus. Une
**Release** regroupe des BI cohérents. Un **Epic** = 1 à 3 releases.

---

## EPIC 1 — Suivi quotidien de l'activité Wefunder

Donner une vision quotidienne du volume d'activité de wefunder.com (projets, montants,
progression) à partir des dépôts réglementaires SEC/EDGAR du portail Wefunder Portal LLC.

### Release 1.1 — Collecteur EDGAR  `DONE ✅`
- **ES-1** `DONE ✅` Parser des dépôts Form C (`primary_doc.xml`) : type de formulaire, émetteur, portail, montant cible/max, deadline, type de titre, prix, texte de progression, finances clés.
  - *Tests* : un XML Form C réel se parse (émetteur, montants, deadline) ; un C-U expose `progressUpdate` ; les entités XML sont décodées ; un champ absent donne `null` (pas d'exception).
- **ES-2** `DONE ✅` Extraction du **montant levé** depuis le texte libre `progressUpdate` d'un C-U.
  - *Tests* : « The final number is $186,172.00 in investments. » → 186172 ; montants avec virgules/décimales ; texte sans montant → `null` ; plusieurs montants → le plus grand.
- **ES-3** `DONE ✅` Agrégation quotidienne : à partir du registre des dépôts, produire par jour le nombre de nouveaux projets (C), amendements (C/A), progressions (C-U), retraits (C-W), la somme des montants cibles/max des nouveaux projets et la somme des montants levés déclarés.
  - *Tests* : un jeu de dépôts synthétique produit les bons comptes et sommes par jour ; un jour sans dépôt n'apparaît pas ; les totaux cumulés sont corrects.
- **ES-4** `DONE ✅` Collecteur `collect.js` : requête EDGAR FTS paginée sur une plage de dates, fetch des XML, fusion idempotente dans `data/filings.json`, recalcul de `data/summary.json`. Throttle et User-Agent conformes SEC.
  - *Tests* : la fusion d'un dépôt déjà connu ne crée pas de doublon ; la pagination s'arrête au total annoncé ; l'URL EDGAR d'un dépôt se construit correctement depuis l'accession number.

### Release 1.2 — Tableau de bord & mise à jour quotidienne  `DONE ✅`
- **US-5** `DONE ✅` Tableau de bord statique (français) : bandeau de synthèse (projets actifs suivis, nouveaux projets sur 30 j, montants cibles 30 j, montants levés déclarés 30 j) + graphique en barres du volume quotidien (30 derniers jours).
  - *Tests* : la page se charge sans erreur avec les JSON réels ; les KPI recalculés côté client correspondent au `summary.json` ; le graphique affiche un jour par barre.
- **US-6** `DONE ✅` Liste des projets récents : émetteur, date, formulaire, montant cible/max, deadline, type de titre, lien vers le dépôt EDGAR ; et fil « progression » des derniers C-U avec montant levé.
  - *Tests* : chaque ligne référence un dépôt existant ; les liens EDGAR sont bien formés ; les C-U affichent le montant extrait quand il existe.
- **ES-7** `DONE ✅` Mise à jour quotidienne : `update-daily.sh` (collecte 7 j glissants + commit/push si diff) + README (usage local, crontab droplet, limites).
  - *Tests* : le script est idempotent à vide (aucun commit si rien ne change) ; `collect.js --from --to` couvre le rattrapage après une panne.

---

## EPIC 2 — Multi-plateformes & bilingue

Étendre le suivi à StartEngine, DealMaker et Republic, et rendre l'interface
bilingue anglais/français (anglais par défaut).

### Release 2.1 — StartEngine, DealMaker, Republic & i18n  `DONE ✅`
- **ES-8** `DONE ✅` Correctif du balayage d'index : les index quotidiens datent en `YYYYMMDD` (sans tirets) — le parseur attendait `YYYY-MM-DD` et ne trouvait rien.
  - *Tests* : une ligne réelle de `form.idx` (date `20260812`, espaces de fin) se parse ; les formulaires hors famille C sont ignorés.
- **ES-9** `DONE ✅` Collecteur multi-portails : config `PORTALS` (requête FTS + regex de confirmation de l'intermédiaire), champ `platform` sur chaque dépôt, migration du registre existant, agrégats par plateforme dans `summary.json`.
  - *Tests* : les 4 plateformes sont déclarées ; les noms d'intermédiaires réels (dont « StartEngine Primary, LLC ») matchent ; une plateforme ne matche pas les autres.
- **US-10** `DONE ✅` Filtre plateforme sur le tableau de bord (toutes / une seule) régissant KPI, graphiques, fils et table ; en vue « toutes », volume empilé par plateforme (comparaison), sinon par type de dépôt.
  - *Tests* : la page se charge sans erreur ; les KPI d'une plateforme ≤ KPI « toutes » ; la colonne plateforme s'affiche dans la table.
- **US-11** `DONE ✅` Interface bilingue EN/FR, anglais par défaut : bascule dans l'en-tête, dictionnaire complet, formats de dates/nombres par locale, choix mémorisé (localStorage).
  - *Tests* : rendu sans erreur dans les deux langues ; les libellés changent ; le défaut est l'anglais.

---

## EPIC 3 — Portail comparatif du marché

Donner une vision comparative de la performance des acteurs du marché : une page
d'accueil qui explique le principe du site et résume les indicateurs, une page de
détail par acteur, et un drill-down de l'accueil vers les bons éléments de chaque page.

### Release 3.1 — Accueil comparatif & drill-down  `DONE ✅`
- **ES-12** `DONE ✅` Refactor : module partagé `common.js` (plateformes, i18n, formats, chargement des données, rendus SVG) ; `index.html`+`home.js` (accueil) et `platform.html?p=X`+`platform.js` (détail) remplacent `app.js`.
  - *Tests* : les 3 fichiers JS passent `node --check` ; les deux pages se chargent sans erreur console avec les données réelles.
- **US-13** `DONE ✅` Page d'accueil : texte d'explication du principe (dépôts SEC → comparaison quotidienne), KPI marché, cartes par plateforme (couleur d'identité, mini-KPI), part de marché des nouvelles campagnes (barre 100 %), comparatifs « nouvelles campagnes » et « montants recherchés » (barres horizontales), volume quotidien empilé par plateforme, tableau d'indicateurs par plateforme.
  - *Tests* : les KPI marché = somme des KPI plateformes ; la part de marché somme à 100 % ; rendu clair/sombre sans erreur.
- **US-14** `DONE ✅` Drill-down : chaque carte, mini-KPI, barre, entrée de légende et cellule du tableau comparatif mène à la page du bon acteur, sur la bonne section (`#volume`, `#amounts`, `#progress`, `#withdrawals`, `#projects`) ; fil d'Ariane retour à l'accueil ; KPI de la page acteur cliquables vers leurs sections.
  - *Tests* : les URL générées pointent vers `platform.html?p=<id>#<ancre>` ; chaque ancre existe dans la page acteur.

---

## Delivery Plan (ordre des releases)

1. **R1.1 — Collecteur EDGAR** *(valeur : des données quotidiennes fiables et rejouables)*
2. **R1.2 — Tableau de bord & mise à jour quotidienne** *(valeur : voir l'activité wefunder chaque jour sans effort)*
3. **R2.1 — StartEngine, DealMaker, Republic & i18n** *(valeur : comparer les grandes plateformes US, lecture EN/FR)*
4. **R3.1 — Accueil comparatif & drill-down** *(valeur : la performance du marché en une page, le détail en un clic)*
