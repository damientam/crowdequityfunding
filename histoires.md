# histoires.md — Crowdfunding Watch

Récits de chaque persona utilisant le logiciel pour accomplir sa mission.

## Damien, investisseur curieux

Chaque matin, Damien ouvre Crowdfunding Watch avec son café. En un coup d'œil au
bandeau de synthèse, il sait si la semaine est calme ou agitée : combien de nouvelles
campagnes ont été lancées sur les quatre grandes plateformes américaines, combien
d'argent elles cherchent, et ce que les campagnes arrivées à un jalon déclarent avoir
levé. Le graphique du volume quotidien, empilé par plateforme, lui montre en un
regard qui domine le marché cette semaine — DealMaker et StartEngine au coude à
coude, Wefunder régulier, Republic plus discret. Il clique sur « Wefunder » pour ne
voir que cette plateforme : le graphique bascule alors par type de dépôt et il repère
une biotech qui vise 1,2 M$. Le lien EDGAR lui ouvre le Form C complet (finances,
type de titre, valorisation) avant d'aller voir la page de la campagne.

## Le veilleur de marché

Un analyste anglophone suit la santé de l'equity crowdfunding américain. Le tableau
de bord s'ouvre en anglais par défaut — il n'a rien à configurer ; sa collègue
française bascule en FR d'un clic et le choix est mémorisé. Crowdfunding Watch lui
donne une série temporelle propre et rejouable, comparable entre plateformes : chaque
jour, le cron collecte les dépôts SEC de la veille (Wefunder, StartEngine, DealMaker,
Republic) et pousse les JSON dans le dépôt git — l'historique est versionné et
auditable. Quand il a besoin de remonter plus loin, il lance un backfill
(`node collect.js --from 2026-01-01`) et obtient des mois d'activité en quelques
minutes, sans scraper ni clé d'API, en restant dans les règles d'accès de la SEC.
Le fil « progression » lui montre quelles campagnes atteignent leurs jalons de 50 %
et 100 % — un signal de traction qu'aucun des sites publics ne présente sous forme
d'historique comparable.
