-- docs/DECISIONS.md (places): the free-text region becomes a region or a city of the list.
CREATE TYPE "Locality" AS ENUM ('AUVERGNE_RHONE_ALPES', 'BOURGOGNE_FRANCHE_COMTE', 'BRETAGNE', 'CENTRE_VAL_DE_LOIRE', 'CORSE', 'GRAND_EST', 'HAUTS_DE_FRANCE', 'ILE_DE_FRANCE', 'NORMANDIE', 'NOUVELLE_AQUITAINE', 'OCCITANIE', 'PAYS_DE_LA_LOIRE', 'PROVENCE_ALPES_COTE_D_AZUR', 'GUADELOUPE', 'MARTINIQUE', 'GUYANE', 'LA_REUNION', 'MAYOTTE', 'PARIS', 'MARSEILLE', 'LYON', 'TOULOUSE', 'NICE', 'NANTES', 'MONTPELLIER', 'STRASBOURG', 'BORDEAUX', 'LILLE', 'RENNES', 'TOULON', 'REIMS', 'SAINT_ETIENNE', 'LE_HAVRE', 'DIJON', 'VILLEURBANNE', 'ANGERS', 'GRENOBLE', 'NIMES');

ALTER TABLE "Post" ADD COLUMN "locality" "Locality";
ALTER TABLE "Alert" ADD COLUMN "locality" "Locality";

-- The names that match the list (accents and case ignored) keep their place.
UPDATE "Post" SET "locality" = CASE lower(f_unaccent(trim("region")))
    WHEN 'auvergne-rhone-alpes' THEN 'AUVERGNE_RHONE_ALPES'::"Locality"
    WHEN 'bourgogne-franche-comte' THEN 'BOURGOGNE_FRANCHE_COMTE'::"Locality"
    WHEN 'bretagne' THEN 'BRETAGNE'::"Locality"
    WHEN 'centre-val de loire' THEN 'CENTRE_VAL_DE_LOIRE'::"Locality"
    WHEN 'corse' THEN 'CORSE'::"Locality"
    WHEN 'grand est' THEN 'GRAND_EST'::"Locality"
    WHEN 'hauts-de-france' THEN 'HAUTS_DE_FRANCE'::"Locality"
    WHEN 'ile-de-france' THEN 'ILE_DE_FRANCE'::"Locality"
    WHEN 'normandie' THEN 'NORMANDIE'::"Locality"
    WHEN 'nouvelle-aquitaine' THEN 'NOUVELLE_AQUITAINE'::"Locality"
    WHEN 'occitanie' THEN 'OCCITANIE'::"Locality"
    WHEN 'pays de la loire' THEN 'PAYS_DE_LA_LOIRE'::"Locality"
    WHEN 'provence-alpes-cote d''azur' THEN 'PROVENCE_ALPES_COTE_D_AZUR'::"Locality"
    WHEN 'guadeloupe' THEN 'GUADELOUPE'::"Locality"
    WHEN 'martinique' THEN 'MARTINIQUE'::"Locality"
    WHEN 'guyane' THEN 'GUYANE'::"Locality"
    WHEN 'la reunion' THEN 'LA_REUNION'::"Locality"
    WHEN 'mayotte' THEN 'MAYOTTE'::"Locality"
    WHEN 'paris' THEN 'PARIS'::"Locality"
    WHEN 'marseille' THEN 'MARSEILLE'::"Locality"
    WHEN 'lyon' THEN 'LYON'::"Locality"
    WHEN 'toulouse' THEN 'TOULOUSE'::"Locality"
    WHEN 'nice' THEN 'NICE'::"Locality"
    WHEN 'nantes' THEN 'NANTES'::"Locality"
    WHEN 'montpellier' THEN 'MONTPELLIER'::"Locality"
    WHEN 'strasbourg' THEN 'STRASBOURG'::"Locality"
    WHEN 'bordeaux' THEN 'BORDEAUX'::"Locality"
    WHEN 'lille' THEN 'LILLE'::"Locality"
    WHEN 'rennes' THEN 'RENNES'::"Locality"
    WHEN 'toulon' THEN 'TOULON'::"Locality"
    WHEN 'reims' THEN 'REIMS'::"Locality"
    WHEN 'saint-etienne' THEN 'SAINT_ETIENNE'::"Locality"
    WHEN 'le havre' THEN 'LE_HAVRE'::"Locality"
    WHEN 'dijon' THEN 'DIJON'::"Locality"
    WHEN 'villeurbanne' THEN 'VILLEURBANNE'::"Locality"
    WHEN 'angers' THEN 'ANGERS'::"Locality"
    WHEN 'grenoble' THEN 'GRENOBLE'::"Locality"
    WHEN 'nimes' THEN 'NIMES'::"Locality"
  END
WHERE "region" IS NOT NULL;
UPDATE "Alert" SET "locality" = CASE lower(f_unaccent(trim("region")))
    WHEN 'auvergne-rhone-alpes' THEN 'AUVERGNE_RHONE_ALPES'::"Locality"
    WHEN 'bourgogne-franche-comte' THEN 'BOURGOGNE_FRANCHE_COMTE'::"Locality"
    WHEN 'bretagne' THEN 'BRETAGNE'::"Locality"
    WHEN 'centre-val de loire' THEN 'CENTRE_VAL_DE_LOIRE'::"Locality"
    WHEN 'corse' THEN 'CORSE'::"Locality"
    WHEN 'grand est' THEN 'GRAND_EST'::"Locality"
    WHEN 'hauts-de-france' THEN 'HAUTS_DE_FRANCE'::"Locality"
    WHEN 'ile-de-france' THEN 'ILE_DE_FRANCE'::"Locality"
    WHEN 'normandie' THEN 'NORMANDIE'::"Locality"
    WHEN 'nouvelle-aquitaine' THEN 'NOUVELLE_AQUITAINE'::"Locality"
    WHEN 'occitanie' THEN 'OCCITANIE'::"Locality"
    WHEN 'pays de la loire' THEN 'PAYS_DE_LA_LOIRE'::"Locality"
    WHEN 'provence-alpes-cote d''azur' THEN 'PROVENCE_ALPES_COTE_D_AZUR'::"Locality"
    WHEN 'guadeloupe' THEN 'GUADELOUPE'::"Locality"
    WHEN 'martinique' THEN 'MARTINIQUE'::"Locality"
    WHEN 'guyane' THEN 'GUYANE'::"Locality"
    WHEN 'la reunion' THEN 'LA_REUNION'::"Locality"
    WHEN 'mayotte' THEN 'MAYOTTE'::"Locality"
    WHEN 'paris' THEN 'PARIS'::"Locality"
    WHEN 'marseille' THEN 'MARSEILLE'::"Locality"
    WHEN 'lyon' THEN 'LYON'::"Locality"
    WHEN 'toulouse' THEN 'TOULOUSE'::"Locality"
    WHEN 'nice' THEN 'NICE'::"Locality"
    WHEN 'nantes' THEN 'NANTES'::"Locality"
    WHEN 'montpellier' THEN 'MONTPELLIER'::"Locality"
    WHEN 'strasbourg' THEN 'STRASBOURG'::"Locality"
    WHEN 'bordeaux' THEN 'BORDEAUX'::"Locality"
    WHEN 'lille' THEN 'LILLE'::"Locality"
    WHEN 'rennes' THEN 'RENNES'::"Locality"
    WHEN 'toulon' THEN 'TOULON'::"Locality"
    WHEN 'reims' THEN 'REIMS'::"Locality"
    WHEN 'saint-etienne' THEN 'SAINT_ETIENNE'::"Locality"
    WHEN 'le havre' THEN 'LE_HAVRE'::"Locality"
    WHEN 'dijon' THEN 'DIJON'::"Locality"
    WHEN 'villeurbanne' THEN 'VILLEURBANNE'::"Locality"
    WHEN 'angers' THEN 'ANGERS'::"Locality"
    WHEN 'grenoble' THEN 'GRENOBLE'::"Locality"
    WHEN 'nimes' THEN 'NIMES'::"Locality"
  END
WHERE "region" IS NOT NULL;

-- A local post whose place is not in the list becomes national; such an alert is removed.
UPDATE "Post" SET "zone" = 'FRANCE' WHERE "zone" = 'LOCAL' AND "locality" IS NULL;
DELETE FROM "Alert" WHERE "zone" = 'LOCAL' AND "locality" IS NULL;

ALTER TABLE "Post" DROP COLUMN "region";
ALTER TABLE "Alert" DROP COLUMN "region";
