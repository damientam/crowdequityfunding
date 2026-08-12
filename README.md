# Crowdfunding Watch

**Site : <https://damientam.github.io/crowdequityfunding/>**

Suivi quotidien de l'activité des principales plateformes américaines d'equity
crowdfunding — **[Wefunder](https://wefunder.com), [StartEngine](https://www.startengine.com),
[DealMaker](https://www.dealmaker.tech) et [Republic](https://republic.com)** :
nouveaux projets, montants recherchés, montants levés et progression des campagnes.
Interface bilingue **anglais (défaut) / français**.

**Source de données : SEC EDGAR.** Toute campagne Regulation Crowdfunding dépose des
formulaires publics via son portail intermédiaire (Form C au lancement, C/A pour les
amendements, **C-U aux jalons de progression avec le montant levé**, C-AR pour les
rapports annuels, C-W pour les retraits). Les sites des plateformes étant protégés
par des anti-bots, ces dépôts réglementaires sont la source publique fiable — et
versionnable — de leur activité. Voir `spec.md` pour le détail (et les limites).

| Plateforme | Intermédiaire déclaré dans les Form C |
|---|---|
| Wefunder | Wefunder Portal LLC |
| StartEngine | StartEngine Capital LLC / StartEngine Primary, LLC |
| DealMaker | DealMaker Securities LLC |
| Republic | OpenDeal Portal LLC |

## Structure

```
├── index.html, home.js             ← page d'accueil : vision comparative du marché
├── platform.html, platform.js      ← page de détail par acteur (?p=wefunder|startengine|dealmaker|republic)
├── common.js, style.css            ← module partagé (i18n, palette, graphiques) + styles
├── data/
│   ├── filings.json                ← registre cumulatif des dépôts (1 entrée / dépôt, champ platform)
│   └── summary.json                ← agrégats quotidiens, globaux et par plateforme
├── collector/
│   ├── collect.js                  ← collecteur EDGAR (Node ≥ 20, zéro dépendance)
│   ├── update-daily.sh             ← collecte quotidienne locale (le workflow Actions fait pareil dans le cloud)
│   ├── lib/                        ← parse.js, aggregate.js, edgar.js (config PORTALS)
│   └── test/                       ← tests node:test + fixtures XML réelles
├── .github/workflows/
│   ├── collect-daily.yml           ← cron quotidien : collecte + commit + redéploiement
│   └── deploy-pages.yml            ← déploiement GitHub Pages
└── spec.md, epics.md, work.md, histoires.md
```

## Le site

- **Accueil (`index.html`)** — explique le principe du site (dépôts SEC → photographie
  comparable du marché) et donne la vision synthétique : KPI marché, cartes par
  plateforme aux couleurs d'identité, part de marché des nouvelles campagnes,
  comparatifs « nouvelles campagnes » / « montants recherchés », volume quotidien
  empilé par plateforme, tableau d'indicateurs. **Drill-down** : chaque carte,
  mini-KPI, barre, légende ou cellule mène à la bonne section de la page du bon acteur.
- **Page acteur (`platform.html?p=<id>`)** — le détail d'une plateforme : KPI
  cliquables, volume par type de dépôt, montants recherchés, fil de progression
  (C-U avec montants levés), retraits, table des projets avec liens EDGAR. Sections
  ancrées `#volume`, `#amounts`, `#progress`, `#withdrawals`, `#projects`.

Bascule EN/FR dans l'en-tête (anglais par défaut, choix mémorisé). Périodes :
30 j / 90 j / 6 mois / tout l'historique (agrégation hebdomadaire au-delà de
120 jours). Mode sombre automatique.

### En local

```bash
npx http-server . -p 8080   # puis http://localhost:8080
```

(ou `python3 -m http.server 8080`). Aucun build, aucune dépendance npm.

## Mise à jour quotidienne (GitHub Actions)

Le workflow `collect-daily.yml` tourne chaque jour à 07:15 UTC : il lance les tests,
collecte les 7 derniers jours sur EDGAR (chaque exécution rattrape donc la semaine
écoulée en cas de panne), committe `data/` si quelque chose a changé, puis
redéploie le site. Aucune machine à entretenir. Il peut aussi être déclenché à la
main (onglet *Actions* → *Daily EDGAR collection* → *Run workflow*).

Pour faire la même chose depuis une machine à soi : `collector/update-daily.sh`
(exemple de crontab en tête du script).

## Collecte manuelle

```bash
node collector/collect.js                            # les 7 derniers jours
node collector/collect.js --from 2026-01-01 --to 2026-05-31   # backfill
node collector/collect.js --refresh                  # re-télécharge la plage
```

Le collecteur combine deux passes : la recherche plein-texte EDGAR (une requête par
plateforme, `forms=C,C-U,C-AR`, le nom d'intermédiaire parsé confirmant la
plateforme), puis un balayage des index quotidiens (`form.YYYYMMDD.idx`) filtré sur
les CIK connus du registre — nécessaire car les retraits (Form C-W) ne citent jamais
le portail. Il télécharge le `primary_doc.xml` de chaque dépôt nouveau et fusionne le
tout de façon **idempotente** dans `data/filings.json` avant de recalculer
`data/summary.json` (agrégats globaux + par plateforme). Il respecte la politique
d'accès de la SEC : User-Agent identifiant et ~3 requêtes/s maximum.

## Tests

```bash
cd collector && node --test test/*.test.js
```

17 tests : parsing de dépôts réels (Form C et C-U), extraction des montants levés,
agrégation quotidienne, config des 4 plateformes, URLs EDGAR, parsing des index
quotidiens et idempotence de la fusion.

## Limites

- Les montants levés ne sont publics qu'aux **jalons réglementaires** (Form C-U :
  50 %, 100 %, clôture). Les compteurs temps réel n'existent que sur les sites des
  plateformes.
- Périmètre : offres **Reg CF** des quatre portails (les offres Reg D/A+ ne déposent
  pas de Form C ; StartEngine et DealMaker en hébergent notamment).
- Ce projet n'est affilié ni aux plateformes ni à la SEC et ne constitue pas un
  conseil en investissement.
