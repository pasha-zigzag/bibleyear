## Tasks

### up-dev
Starts the project
```sh
docker compose -f docker/dev/docker-compose.yml up -d --remove-orphans
```

### down-dev
Stops the project
```sh
docker compose -f docker/dev/docker-compose.yml down
```

### cli-dev
Stops the project
```sh
docker compose -f docker/dev/docker-compose.yml exec bot sh
```

### restart
Restarts the project
```sh
docker compose -f docker/dev/docker-compose.yml down
docker compose -f docker/dev/docker-compose.yml up -d --remove-orphans
```

### logs
Shows the logs
```sh
docker compose -f docker/dev/docker-compose.yml logs -f
```

### fetch
Fetches chapters for a specific day. Usage: `xc fetch-chapter <dayNumber>`
```sh
docker compose -f docker/dev/docker-compose.yml run --rm bot node cli/fetchChapter.js $1
```

### mongo-shell
Runs the mongo shell in the biblebot-mongo container
```sh
docker compose -f docker/dev/docker-compose.yml exec biblebot-mongo mongosh
```