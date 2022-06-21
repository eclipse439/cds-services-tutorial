# REQUIRED SECTION
ROOT_DIR:=$(shell dirname .)
CDS_CARDS:=$(ROOT_DIR)/patient_card_cds
DOCKER_COMPOSE_FILE:=$(ROOT_DIR)/docker-compose.yml
DOCKER_COMPOSE:=docker-compose
# include $(ROOT_DIR)/.mk-lib/common.mk
# END OF REQUIRED SECTION

.PHONY: help dependencies up start stop restart status ps clean down

dependencies: check-dependencies ## Check dependencies

# SETUP
setup_registry:
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d npm_registry 
	cd $(CDS_CARDS) && npm publish --registry http://localhost:4873

# END SETUP

# DOCKER COMMANDS
up: ## Start all or c=<name> containers in foreground
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up $(c)

down: ## Stop all or c=<name> containers in foreground
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down $(c)

start: ## Start all or c=<name> containers in background
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d $(c)

stop: ## Stop all or c=<name> containers
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) stop $(c)

restart: ## Restart all or c=<name> containers
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) stop $(c)
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up $(c) -d

logs: ## Show logs for all or c=<name> containers
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) logs --tail=100 -f $(c)

status: ## Show status of containers
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) ps

ps: status ## Alias of status

clean: confirm ## Clean all data
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down