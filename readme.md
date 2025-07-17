# Personal bot
<hr>
Bot qui récupère données de youtube (RSS feed) et qui les posts dans un serveur Discord


The DISCORD_TOkEN is in the .env file
the MUSIC_PATH is defined in the .env and in the docker compose :
    > in the .env, it's to work when launching bot with `npm run start`
    > in the docker compose it's when the bot is dockerise
All other configuration are in the config.json file




To build to docker with the bot :
docker compose -f docker-compose.linux.yml build

to run the bot :
docker compose -f docker-compose.linux.yml up