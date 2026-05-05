-- Ajout du champ "standing" sur la table accommodations
-- À exécuter sur la base MySQL de production

ALTER TABLE `accommodations`
  ADD COLUMN IF NOT EXISTS `standing` VARCHAR(50) NULL AFTER `star_rating`;

