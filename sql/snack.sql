-- ==========================================================
--  Eat & Fit (TDSnacking) — base de données
--  À importer dans phpMyAdmin : onglet « Importer » → choisir ce fichier.
--  Rejouable sans risque : rien n'est supprimé, les données existantes
--  (table client comprise) sont conservées.
-- ==========================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS snack
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE snack;

-- ---------- Clients ----------
-- (existe déjà chez toi : créée seulement si elle manque)
CREATE TABLE IF NOT EXISTS client (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nom       VARCHAR(50) NOT NULL,
  prenom    VARCHAR(50) NOT NULL,
  telephone VARCHAR(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Les clés étrangères exigent InnoDB (sans effet si c'est déjà le cas)
ALTER TABLE client ENGINE=InnoDB;

-- ---------- Carte : plats, formats/prix, formules ----------
CREATE TABLE IF NOT EXISTS plat (
  id              VARCHAR(30) PRIMARY KEY,               -- ex. 'cassoulet'
  categorie       ENUM('starter','main','dessert','drink','soft') NOT NULL,
  nom             VARCHAR(120) NOT NULL,
  description     VARCHAR(500) NOT NULL DEFAULT '',
  allergenes      VARCHAR(60)  NOT NULL DEFAULT '',      -- numéros 1 à 14 séparés par des virgules
  min_personnes   TINYINT UNSIGNED NULL,                 -- raclette / fondues : 2
  commande_avance TINYINT(1) NOT NULL DEFAULT 0,         -- à commander 24 h à l'avance
  supplement      DECIMAL(6,2) NULL,                     -- supplément quand choisi dans une formule
  de_saison       TINYINT(1) NOT NULL DEFAULT 0,         -- « selon arrivage »
  alcool          TINYINT(1) NOT NULL DEFAULT 0,         -- réservé aux majeurs
  actif           TINYINT(1) NOT NULL DEFAULT 1,         -- 0 = masqué du site
  ordre           SMALLINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS plat_format (
  plat_id VARCHAR(30) NOT NULL,
  ordre   TINYINT UNSIGNED NOT NULL,                     -- 0 = premier format
  libelle VARCHAR(40) NOT NULL DEFAULT '',               -- '6 pièces', 'par personne'...
  prix    DECIMAL(8,2) NOT NULL,
  PRIMARY KEY (plat_id, ordre),
  FOREIGN KEY (plat_id) REFERENCES plat(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS formule (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nom         VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  prix        DECIMAL(8,2) NOT NULL,
  categories  VARCHAR(80) NOT NULL,                      -- ex. 'starter,main,dessert'
  actif       TINYINT(1) NOT NULL DEFAULT 1,
  ordre       SMALLINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Commandes ----------
CREATE TABLE IF NOT EXISTS commande (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  reference       VARCHAR(20) NOT NULL UNIQUE,
  client_id       INT NOT NULL,
  mode            ENUM('pickup','delivery') NOT NULL,
  adresse         VARCHAR(255) NULL,
  creneau         DATETIME NOT NULL,
  note            TEXT NULL,
  sous_total      DECIMAL(8,2) NOT NULL,
  frais_livraison DECIMAL(8,2) NOT NULL DEFAULT 0,
  total           DECIMAL(8,2) NOT NULL,
  statut          ENUM('nouvelle','en_preparation','prete','terminee','annulee') NOT NULL DEFAULT 'nouvelle',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_commande_statut (statut),
  INDEX idx_commande_creneau (creneau),
  FOREIGN KEY (client_id) REFERENCES client(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS commande_ligne (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  commande_id   INT NOT NULL,
  nom           VARCHAR(120) NOT NULL,
  detail        VARCHAR(255),
  prix_unitaire DECIMAL(8,2) NOT NULL,
  quantite      INT NOT NULL,
  FOREIGN KEY (commande_id) REFERENCES commande(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Formulaire de contact ----------
CREATE TABLE IF NOT EXISTS message_contact (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nom        VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Administrateur (le compte se crée depuis admin/login.php) ----------
CREATE TABLE IF NOT EXISTS admin (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  identifiant       VARCHAR(50) NOT NULL UNIQUE,
  mot_de_passe_hash VARCHAR(255) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================================
--  Données de départ : la carte du restaurant
--  (INSERT IGNORE : on ne touche pas aux plats déjà présents)
-- ==========================================================

-- ----- Plats -----
INSERT IGNORE INTO plat (id, categorie, nom, description, allergenes, min_personnes, commande_avance, supplement, de_saison, alcool, actif, ordre) VALUES
  ('gesiers', 'starter', 'Salade de gésiers', 'Gésiers confits tièdes, salade verte, croûtons à l’ail et vinaigrette à la moutarde.', '1,10,12', NULL, 0, NULL, 0, 0, 1, 10),
  ('museau', 'starter', 'Salade de museau', 'Museau de bœuf en vinaigrette, cornichons, oignons nouveaux et persil plat.', '9,10,12', NULL, 0, NULL, 0, 0, 1, 20),
  ('huitres', 'starter', 'Huîtres n° 5', 'Huîtres creuses de calibre 5, vinaigre d’échalote et pain de seigle beurré.', '1,7,12,14', NULL, 0, 4, 1, 0, 1, 30),
  ('plateau', 'starter', 'Plateau de charcuteries et fromages', 'Jambon sec, rosette, pâté de campagne et trois fromages affinés, cornichons.', '1,7,12', NULL, 0, 3, 0, 0, 1, 40),
  ('maroilles', 'starter', 'Tarte au maroilles', 'Tarte fine au maroilles, crème et oignons, servie tiède avec une petite salade.', '1,3,7', NULL, 0, NULL, 0, 0, 1, 50),
  ('escargots', 'starter', 'Escargots', 'Escargots de Bourgogne au beurre persillé, ail et échalote.', '7,14', NULL, 0, NULL, 0, 0, 1, 60),
  ('flammenkuche', 'main', 'Flammenküche', 'farine, huile, crème, fromage blanc, oignons, lardons, muscade.', '1,4,6,7,12', NULL, 0, NULL, 0, 0, 1, 70),
  ('cassoulet', 'main', 'Cassoulet', 'Haricots blancs mijotés, confit de canard, saucisse de Toulouse et lard, gratinés au four.', '1,9,12', NULL, 0, NULL, 0, 0, 1, 80),
  ('raclette', 'main', 'Raclette', 'Fromage à raclette fondu à table, charcuteries, pommes de terre et cornichons.', '7,12', 2, 1, NULL, 0, 0, 1, 90),
  ('savoyarde', 'main', 'Fondue savoyarde', 'Mélange de fromages de Savoie, vin blanc et cubes de pain de campagne.', '1,7,12', 2, 1, NULL, 0, 0, 1, 100),
  ('bourguignonne', 'main', 'Fondue bourguignonne', 'Bœuf tendre à plonger dans l’huile, trois sauces maison et pommes grenaille.', '3,10,12', 2, 1, NULL, 0, 0, 1, 110),
  ('bourguignon', 'main', 'Bœuf bourguignon', 'Bœuf mijoté au vin rouge, lardons, champignons et pommes vapeur.', '1,9,12', NULL, 0, NULL, 0, 0, 1, 120),
  ('choucroute', 'main', 'Choucroute', 'Choucroute garnie : saucisse, lard fumé, palette et pommes de terre.', '9,10,12', NULL, 0, NULL, 0, 0, 1, 130),
  ('aligot', 'main', 'Aligot', 'Aligot onctueux à la tomme fraîche, saucisse de Toulouse grillée.', '7', NULL, 0, NULL, 0, 0, 1, 140),
  ('rognons', 'main', 'Rognons', 'Rognons de veau sautés, sauce moutarde à l’ancienne, gratin dauphinois.', '1,7,10', NULL, 0, NULL, 0, 0, 1, 150),
  ('tripes', 'main', 'Tripes à la mode de Caen', 'Tripes mijotées au cidre et au calvados, carottes, oignons et pommes vapeur.', '9,12', NULL, 0, NULL, 0, 0, 1, 160),
  ('foie', 'main', 'Foie de veau', 'Foie de veau poêlé, jus au vin et purée maison.', '1,7,12', NULL, 0, 3, 0, 0, 1, 170),
  ('sanglier', 'main', 'Daube de sanglier', 'Sanglier mijoté au vin rouge et aux baies de genièvre, pommes de terre.', '9,12', NULL, 0, 2, 1, 0, 1, 180),
  ('jarret', 'main', 'Jarret de porc', 'Jarret braisé à la bière, légumes racines et moutarde.', '1,9,10', NULL, 0, NULL, 0, 0, 1, 190),
  ('baba', 'dessert', 'Baba au rhum', 'Baba moelleux imbibé de rhum ambré, crème chantilly.', '1,3,7', NULL, 0, NULL, 0, 1, 1, 200),
  ('fondant', 'dessert', 'Fondant au chocolat', 'Chocolat noir et cœur coulant, crème anglaise.', '1,3,7', NULL, 0, NULL, 0, 0, 1, 210),
  ('bananabread', 'dessert', 'Banana bread', 'Banana bread maison tiède, noix et boule de glace vanille.', '1,3,7,8', NULL, 0, NULL, 0, 0, 1, 220),
  ('split', 'dessert', 'Banana split', 'Banane, glaces vanille, chocolat et fraise, chantilly et sauce chocolat.', '3,7,8', NULL, 0, NULL, 0, 0, 1, 230),
  ('profiteroles', 'dessert', 'Profiteroles', 'Choux garnis de glace vanille, sauce chocolat chaude.', '1,3,7', NULL, 0, NULL, 0, 0, 1, 240),
  ('speculoos', 'dessert', 'Cheesecake au spéculoos', 'Cheesecake crémeux sur un lit de spéculoos.', '1,3,6,7', NULL, 0, NULL, 0, 0, 1, 250),
  ('colonel', 'dessert', 'Colonel', 'Sorbet citron arrosé de vodka, à déguster à la cuillère.', '', NULL, 0, NULL, 0, 1, 1, 260),
  ('parisbrest', 'dessert', 'Paris-Brest', 'Pâte à choux, crème mousseline pralinée et éclats de noisettes.', '1,3,7,8', NULL, 0, NULL, 0, 0, 1, 270),
  ('biere', 'drink', 'Bière', 'Bière à la pression, sélection du moment.', '1', NULL, 0, NULL, 0, 1, 1, 280),
  ('rhum', 'drink', 'Rhum arrangé', 'Rhum arrangé maison, fruits et épices selon la saison.', '', NULL, 0, NULL, 0, 1, 1, 290),
  ('chartreuse', 'drink', 'Chartreuse', 'Liqueur de plantes des Alpes, à déguster fraîche ou à température ambiante.', '', NULL, 0, NULL, 0, 1, 1, 300),
  ('vins', 'drink', 'Vins', 'Sélection de vins de nos régions, rouge, blanc ou rosé. Carte sur demande.', '12', NULL, 0, NULL, 0, 1, 1, 310),
  ('prune', 'drink', 'Prune de Papy', 'Notre digestif à la prune, recette maison.', '', NULL, 0, NULL, 0, 1, 1, 320),
  ('jacqueline', 'drink', 'Jacqueline', 'Une spécialité de la maison à découvrir. [Description à préciser par le restaurant]', '', NULL, 0, NULL, 0, 1, 1, 330),
  ('calvados', 'drink', 'Calvados', 'Eau-de-vie de cidre normande, ronde et fruitée.', '', NULL, 0, NULL, 0, 1, 1, 340),
  ('armagnac', 'drink', 'Armagnac', 'Eau-de-vie de Gascogne, boisée et soyeuse.', '', NULL, 0, NULL, 0, 1, 1, 350),
  ('eau', 'soft', 'Eau minérale', 'Plate ou gazeuse.', '', NULL, 0, NULL, 0, 0, 1, 360),
  ('soda', 'soft', 'Soda', 'Sélection de sodas.', '', NULL, 0, NULL, 0, 0, 1, 370),
  ('jus', 'soft', 'Jus de fruits', 'Jus de fruits au choix.', '', NULL, 0, NULL, 0, 0, 1, 380),
  ('cafe', 'soft', 'Café', 'Café serré ou allongé.', '', NULL, 0, NULL, 0, 0, 1, 390);

-- ----- Formats et prix -----
INSERT IGNORE INTO plat_format (plat_id, ordre, libelle, prix) VALUES
  ('gesiers', 0, '', 9.5),
  ('museau', 0, '', 9),
  ('huitres', 0, '6 pièces', 13.5),
  ('huitres', 1, '12 pièces', 25),
  ('plateau', 0, '', 16.5),
  ('maroilles', 0, '', 9.5),
  ('escargots', 0, '6 pièces', 10.5),
  ('escargots', 1, '12 pièces', 18),
  ('flammenkuche', 0, '', 19.5),
  ('cassoulet', 0, '', 19.5),
  ('raclette', 0, 'par personne', 24),
  ('savoyarde', 0, 'par personne', 23),
  ('bourguignonne', 0, 'par personne', 26),
  ('bourguignon', 0, '', 19),
  ('choucroute', 0, '', 21),
  ('aligot', 0, '', 17.5),
  ('rognons', 0, '', 18.5),
  ('tripes', 0, '', 17.5),
  ('foie', 0, '', 22),
  ('sanglier', 0, '', 21.5),
  ('jarret', 0, '', 20),
  ('baba', 0, '', 8.5),
  ('fondant', 0, '', 8),
  ('bananabread', 0, '', 7),
  ('split', 0, '', 8.5),
  ('profiteroles', 0, '', 9),
  ('speculoos', 0, '', 8),
  ('colonel', 0, '', 8.5),
  ('parisbrest', 0, '', 8.5),
  ('biere', 0, '25 cl', 4.5),
  ('biere', 1, '50 cl', 7.5),
  ('rhum', 0, '4 cl', 6.5),
  ('chartreuse', 0, '4 cl', 7),
  ('vins', 0, 'Verre 12 cl', 5.5),
  ('vins', 1, 'Bouteille 75 cl', 26),
  ('prune', 0, '4 cl', 6),
  ('jacqueline', 0, '4 cl', 6.5),
  ('calvados', 0, '4 cl', 7),
  ('armagnac', 0, '4 cl', 7.5),
  ('eau', 0, '50 cl', 3),
  ('soda', 0, '33 cl', 3.5),
  ('jus', 0, '25 cl', 3.5),
  ('cafe', 0, '', 2);

-- ----- Formules -----
INSERT IGNORE INTO formule (id, nom, description, prix, categories, actif, ordre) VALUES
  (1, 'Formule Bistro', 'Une entrée et un plat', 26, 'starter,main', 1, 10),
  (2, 'Formule Gourmande', 'Une entrée, un plat et un dessert', 32, 'starter,main,dessert', 1, 20),
  (3, 'Formule Complète', 'Une entrée, un plat, un dessert et une boisson sans alcool', 35, 'starter,main,dessert,soft', 1, 30);
