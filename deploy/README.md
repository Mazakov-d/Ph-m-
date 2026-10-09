# Mise en ligne (version web)

Une seule machine, derrière la box : Caddy (HTTPS Let's Encrypt automatique), l'API, PostgreSQL et
le stockage privé, dans `docker-compose.yml`. Le site est sur `https://DOMAIN`, l'API sur
`https://api.DOMAIN`.

## Une fois

1. `cp deploy/.env.example deploy/.env`, puis remplir les secrets (`openssl rand -hex 32`).
2. Sur la box (Freebox OS › Paramètres › Gestion des ports), rediriger vers l'IP locale de la
   machine (bail DHCP fixe conseillé) : TCP **80 → 8080** et TCP **443 → 8443**.
   Apache occupe déjà le port 80 de la machine, d'où ces ports.
3. `deploy/deploy.sh`

Les certificats arrivent seuls dès que les ports sont ouverts (Caddy réessaie).

## Premier compte administrateur

S'inscrire depuis le site, puis donner le rôle :

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env exec postgres \
  psql -U pheme -d pheme -c "UPDATE \"User\" SET role='ADMIN' WHERE email='votre@adresse.fr';"
```

Se déconnecter et se reconnecter. Les modérateurs se créent ensuite depuis le tableau de bord.

## Mettre à jour

`deploy/deploy.sh` (reconstruit le site et l'API ; les migrations s'appliquent au démarrage).
