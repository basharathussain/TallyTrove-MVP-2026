COMPOSE = docker compose

.PHONY: build up down restart logs ps seed index fx open

build:
	$(COMPOSE) build

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) down && $(COMPOSE) up -d

logs:
	$(COMPOSE) logs -f backend

ps:
	$(COMPOSE) ps

seed:
	$(COMPOSE) exec backend python -m app.workers.seed

index:
	$(COMPOSE) exec backend python -m app.workers.indexer

fx:
	$(COMPOSE) exec backend python -m app.workers.fx_refresh

open:
	@echo "Storefront: http://localhost:9400"
	@echo "Admin:      http://localhost:9401"
	@open http://localhost:9400
	@open http://localhost:9401
