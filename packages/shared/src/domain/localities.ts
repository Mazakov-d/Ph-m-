import { Locality, type Zone } from "../enums.js";

/**
 * docs/DECISIONS.md (places): the 18 regions of France and its 20 most populated cities, each
 * city with its region. A LOCAL post or filter names one of them.
 */
type LocalityInfo = { label: string } & ({ kind: "REGION" } | { kind: "CITY"; region: Locality });

export const LOCALITIES: Record<Locality, LocalityInfo> = {
  AUVERGNE_RHONE_ALPES: { kind: "REGION", label: "Auvergne-Rhône-Alpes" },
  BOURGOGNE_FRANCHE_COMTE: { kind: "REGION", label: "Bourgogne-Franche-Comté" },
  BRETAGNE: { kind: "REGION", label: "Bretagne" },
  CENTRE_VAL_DE_LOIRE: { kind: "REGION", label: "Centre-Val de Loire" },
  CORSE: { kind: "REGION", label: "Corse" },
  GRAND_EST: { kind: "REGION", label: "Grand Est" },
  HAUTS_DE_FRANCE: { kind: "REGION", label: "Hauts-de-France" },
  ILE_DE_FRANCE: { kind: "REGION", label: "Île-de-France" },
  NORMANDIE: { kind: "REGION", label: "Normandie" },
  NOUVELLE_AQUITAINE: { kind: "REGION", label: "Nouvelle-Aquitaine" },
  OCCITANIE: { kind: "REGION", label: "Occitanie" },
  PAYS_DE_LA_LOIRE: { kind: "REGION", label: "Pays de la Loire" },
  PROVENCE_ALPES_COTE_D_AZUR: { kind: "REGION", label: "Provence-Alpes-Côte d'Azur" },
  GUADELOUPE: { kind: "REGION", label: "Guadeloupe" },
  MARTINIQUE: { kind: "REGION", label: "Martinique" },
  GUYANE: { kind: "REGION", label: "Guyane" },
  LA_REUNION: { kind: "REGION", label: "La Réunion" },
  MAYOTTE: { kind: "REGION", label: "Mayotte" },
  PARIS: { kind: "CITY", label: "Paris", region: "ILE_DE_FRANCE" },
  MARSEILLE: { kind: "CITY", label: "Marseille", region: "PROVENCE_ALPES_COTE_D_AZUR" },
  LYON: { kind: "CITY", label: "Lyon", region: "AUVERGNE_RHONE_ALPES" },
  TOULOUSE: { kind: "CITY", label: "Toulouse", region: "OCCITANIE" },
  NICE: { kind: "CITY", label: "Nice", region: "PROVENCE_ALPES_COTE_D_AZUR" },
  NANTES: { kind: "CITY", label: "Nantes", region: "PAYS_DE_LA_LOIRE" },
  MONTPELLIER: { kind: "CITY", label: "Montpellier", region: "OCCITANIE" },
  STRASBOURG: { kind: "CITY", label: "Strasbourg", region: "GRAND_EST" },
  BORDEAUX: { kind: "CITY", label: "Bordeaux", region: "NOUVELLE_AQUITAINE" },
  LILLE: { kind: "CITY", label: "Lille", region: "HAUTS_DE_FRANCE" },
  RENNES: { kind: "CITY", label: "Rennes", region: "BRETAGNE" },
  TOULON: { kind: "CITY", label: "Toulon", region: "PROVENCE_ALPES_COTE_D_AZUR" },
  REIMS: { kind: "CITY", label: "Reims", region: "GRAND_EST" },
  SAINT_ETIENNE: { kind: "CITY", label: "Saint-Étienne", region: "AUVERGNE_RHONE_ALPES" },
  LE_HAVRE: { kind: "CITY", label: "Le Havre", region: "NORMANDIE" },
  DIJON: { kind: "CITY", label: "Dijon", region: "BOURGOGNE_FRANCHE_COMTE" },
  VILLEURBANNE: { kind: "CITY", label: "Villeurbanne", region: "AUVERGNE_RHONE_ALPES" },
  ANGERS: { kind: "CITY", label: "Angers", region: "PAYS_DE_LA_LOIRE" },
  GRENOBLE: { kind: "CITY", label: "Grenoble", region: "AUVERGNE_RHONE_ALPES" },
  NIMES: { kind: "CITY", label: "Nîmes", region: "OCCITANIE" },
};

export const REGIONS: Locality[] = Locality.options.filter(
  (locality) => LOCALITIES[locality].kind === "REGION",
);
export const CITIES: Locality[] = Locality.options.filter(
  (locality) => LOCALITIES[locality].kind === "CITY",
);

/** The localities a filter on `locality` covers: a region and all its cities, or the city. */
export function localitiesWithin(locality: Locality): Locality[] {
  const info = LOCALITIES[locality];
  if (info.kind === "CITY") return [locality];
  return [
    locality,
    ...CITIES.filter((city) => {
      const cityInfo = LOCALITIES[city];
      return cityInfo.kind === "CITY" && cityInfo.region === locality;
    }),
  ];
}

/**
 * docs/DECISIONS.md (places): one list for the place of a post, a filter or an alert, in this
 * order — International, Europe, France, the regions, the cities. A place is a wide zone or a
 * locality (then the zone is LOCAL).
 */
export type WideZone = Exclude<Zone, "LOCAL">;
export type Place = WideZone | Locality;
export const WIDE_ZONES: WideZone[] = ["INTERNATIONAL", "EUROPE", "FRANCE"];

export function isLocality(place: Place): place is Locality {
  return Locality.safeParse(place).success;
}

/** The zone and locality stored for a place. */
export function placeToZone(place: Place): { zone: Zone; locality: Locality | null } {
  return isLocality(place) ? { zone: "LOCAL", locality: place } : { zone: place, locality: null };
}

/** The place of a stored zone and locality (null for a LOCAL zone without locality). */
export function zoneToPlace(zone: Zone, locality: Locality | null): Place | null {
  if (zone !== "LOCAL") return zone;
  return locality;
}
