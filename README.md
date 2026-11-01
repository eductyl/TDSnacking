# TDSnacking — Eat & Fit

Site de bistro français : carte, formules, panier, commande à emporter ou en livraison.
Le front (HTML/CSS/JS) parle à des scripts PHP (`api/`) qui lisent et écrivent dans **MariaDB**.

```
script.js  ──fetch──▶  api/*.php  ──PDO──▶  MariaDB (base « snack »)
```

## Installation (XAMPP / WAMP / MAMP)

1. Copie le dossier du projet dans le dossier web : `htdocs/TDSnacking` (XAMPP) ou `www/TDSnacking` (WAMP).
2. Démarre **Apache** et **MariaDB** depuis le panneau de contrôle.
3. Ouvre `http://localhost/phpmyadmin` → onglet **Importer** → choisis `sql/snack.sql` → **Importer**.
   Le fichier crée la base `snack`, les tables et la carte du restaurant. Il garde ta table `client` existante et peut être rejoué sans risque.
4. Vérifie `inc/config.php` (hôte, base, utilisateur, mot de passe). Par défaut : `root` / `root`.
   Sur XAMPP, le mot de passe de `root` est souvent **vide** : mets `'pass' => ''`.
5. Ouvre **`http://localhost/TDSnacking/`** (pas le fichier directement, sinon les scripts PHP ne tournent pas).
6. Administration : **`http://localhost/TDSnacking/admin/`**. Au premier passage, la page te fait créer le compte administrateur.

Prérequis : PHP 7.3 ou plus, extension `pdo_mysql` (activée par défaut dans XAMPP/WAMP).

## Organisation

| Dossier / fichier | Rôle |
|---|---|
| `index.html`, `styles.css`, `script.js` | Le site (affichage, panier, tunnel de commande) |
| `api/menu.php` | Envoie la carte, les formules et les réglages au site |
| `api/commande.php` | Enregistre une commande après avoir tout revérifié et recalculé les prix |
| `api/contact.php` | Enregistre les messages du formulaire de contact |
| `admin/` | Commandes (statuts), clients — protégé par mot de passe |
| `inc/connexion.php` | Connexion PDO (n'affiche jamais rien) |
| `inc/config.php` | Identifiants de la base — **ignoré par Git** (modèle : `config.example.php`) |
| `inc/settings.php` | Horaires, frais et minimum de livraison, zone, validation des allergènes |
| `sql/snack.sql` | Création de la base et des tables + données de la carte |

## Modifier le contenu

- **Prix, plats, formules** : phpMyAdmin → tables `plat`, `plat_format`, `formule`. Pour masquer un plat, mets `actif` à 0. Le site se met à jour tout seul.
- **Horaires, livraison, zone** : `inc/settings.php`.
- **Allergènes validés par le restaurant** : mets `allergensVerified` à `true` dans `inc/settings.php` pour retirer les bandeaux « provisoire ».

## Sécurité : ce que fait le code

- Le navigateur n'envoie que des identifiants de plats et des quantités. **Les prix sont relus dans la base**, jamais pris dans la requête.
- Horaires, préavis de 24 h, minimum de livraison, majorité (alcool) sont **revérifiés côté serveur**.
- Requêtes SQL préparées (PDO), sorties HTML échappées, formulaires admin protégés par jeton CSRF, mots de passe stockés en hash.
- Les détails techniques d'une erreur ne s'affichent que depuis `localhost`.

## Dépannage

- **« La carte est momentanément indisponible »** : ouvre `http://localhost/TDSnacking/api/menu.php`. En local, le message d'erreur exact s'y affiche (identifiants faux, base non importée…).
- **`Access denied for user`** : corrige `user` / `pass` dans `inc/config.php`.
- **Erreur de clé étrangère à l'import** (`#1215` / `#1005`) : vérifie que `client.id` est un `INT` et que la table est en InnoDB.
- **Accents cassés** : réimporte `sql/snack.sql` avec l'encodage `utf-8` sélectionné dans phpMyAdmin.

## Avant une mise en ligne

Mot de passe MariaDB solide et utilisateur dédié (pas `root`), HTTPS, création du compte admin depuis le serveur, relecture des textes légaux (éléments entre crochets) et des modalités de paiement.
