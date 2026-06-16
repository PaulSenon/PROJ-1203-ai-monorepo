SHELL := /bin/bash
COMPOSE_PROJECT_NAME = ai-monorepo
DOCKER_COMPOSE_FILE = ./docker/docker-compose.dev.yml
COMPOSE = docker compose --file $(DOCKER_COMPOSE_FILE) --project-name $(COMPOSE_PROJECT_NAME)
OPENCODE_ATTACH_URL ?= http://localhost:4096
RALPH_ITERATIONS ?= 10
RALPH_ALLOW_LOCAL_FALLBACK ?= 1

# Smart container execution - runs in existing container or starts new one
define run_in_container_smart
	@if [ $$( $(COMPOSE) ps --status running --services | grep -c app) -gt 0 ]; then \
		echo "attaching to running container..."; \
		$(COMPOSE) exec $(1) $(2); \
	else \
		echo "starting container and running command..."; \
		$(COMPOSE) run --rm --service-ports --use-aliases $(1) $(2) && \
		$(MAKE) stop; \
	fi
endef

# REQUIRED COMMANDS (must be implemented in every project)
install: ## Install everything needed for development
	$(MAKE) docker-build
	$(MAKE) pnpm-install
	$(MAKE) convex-dev-once

dev: ## Start development server
	$(MAKE) pnpm-dev

bash: ## Access container shell
	$(call run_in_container_smart,app,bash)

tunnel: ## create cloudflare tunnel
	$(COMPOSE) run --rm --service-ports tunnel

run: ## Run arbitrary command in container (for LLM agents)
	$(call run_in_container_smart,app,$(cmd))

clean-soft: ## keep volumes
	$(MAKE) pnpm-clean
	$(MAKE) docker-clean-soft

clean-hard: ## Clean everything (containers, volumes, dependencies)
	$(MAKE) pnpm-clean
	$(MAKE) docker-clean-hard
	$(MAKE) llms-ref-clear

clean-install: ## Clean everything (containers, volumes, dependencies)
	$(MAKE) pnpm-clean
	$(MAKE) docker-clean-hard
	$(MAKE) docker-build-force
	$(MAKE) pnpm-install
	$(MAKE) convex-dev-once

opencode-serve:
	$(call run_in_container_smart,app,bash -lc 'npm i -g @openai/codex@latest && npx -y opencode-ai@latest web --port 4096 --hostname 0.0.0.0')

opencode:
	$(call run_in_container_smart,app,npx -y opencode-ai@latest attach $(OPENCODE_ATTACH_URL))

t3-serve: ## Update Codex globally, then start latest T3 server
	$(call run_in_container_smart,app,bash -lc 'npm i -g @openai/codex@latest && export T3CODE_NO_BROWSER=1; npx -y t3@latest')

codex: ## Update and run Codex CLI inside container
	$(call run_in_container_smart,app,bash -lc 'npm i -g @openai/codex@latest && codex')

codex-login: ## Headless Codex login inside container volume
	$(call run_in_container_smart,app,bash -lc 'npm i -g @openai/codex@latest && codex login --device-auth')

ralph-once: ## Run one Ralph iteration via opencode run --attach
	bash -lc "OPENCODE_ATTACH_URL='$(OPENCODE_ATTACH_URL)' RALPH_ALLOW_LOCAL_FALLBACK='$(RALPH_ALLOW_LOCAL_FALLBACK)' ./.llms/ralph/once.sh"

ralph-afk: ## Run Ralph AFK loop (RALPH_ITERATIONS=10)
	bash -lc "OPENCODE_ATTACH_URL='$(OPENCODE_ATTACH_URL)' RALPH_ALLOW_LOCAL_FALLBACK='$(RALPH_ALLOW_LOCAL_FALLBACK)' ./.llms/ralph/afk.sh $(RALPH_ITERATIONS)"

opencode-upgrade:
	$(call run_in_container_smart,app,pnpm up -D -w opencode-ai@latest)

stop: ## Stop all containers
	$(COMPOSE) down --remove-orphans

# UTILITY COMMANDS
docker-build: ## Build development image
	$(COMPOSE) build

docker-build-force: ## Force rebuild image
	$(COMPOSE) build --no-cache

docker-clean: ## Clean all docker containers
	$(COMPOSE) down --rmi all --remove-orphans

docker-clean-hard: ## Clean all docker containers with volumes
	$(COMPOSE) down --rmi all --volumes --remove-orphans

create-env-files: ## Create required environment files
	@if [ ! -f .env.local ]; then \
		echo "# LOCAL SECRETS - NEVER COMMIT" > .env.local; \
	fi

pnpm-install: ## Install pnpm dependencies
	$(call run_in_container_smart,app,pnpm install)

pnpm-dev: ## Install pnpm dependencies
	$(call run_in_container_smart,app,bash -c "pnpm run dev")

pnpm-clean: ## Clean pnpm dependencies
	$(call run_in_container_smart,app,pnpm run clean)

pnpm-build: ## Build production image
	$(call run_in_container_smart,app,pnpm run build)

pnpm-start: ## Start production image
		$(call run_in_container_smart,app,bash -c "pnpm dlx convex dev & pnpm start")


# CONVEX COMMANDS
convex-login: ## Login to Convex cloud
	$(call run_in_container_smart,app,pnpm dlx convex login)

convex-logout: ## Logout from Convex cloud
	$(call run_in_container_smart,app,pnpm dlx convex logout)

convex-dev: ## Start Convex development server
	$(call run_in_container_smart,app,pnpm dlx convex dev)

convex-dev-once: ## Deploy to convex dev server once (non watch mode)
	$(call run_in_container_smart,app,pnpm dlx convex dev --until-success)

convex-deploy: ## Deploy Convex functions to production
	$(call run_in_container_smart,app,pnpm dlx convex deploy --prod)

corepack-update:
	$(call run_in_container_smart,app,bash -c "corepack prepare pnpm@latest --activate && corepack use pnpm@latest")
	$(MAKE) install

# LLM REF (git submodules) HELPERS
# Usage examples:
#   make llms-ref-add url=https://github.com/vercel/ai-elements.git name=ai-elements
#   make llms-ref-fetch-all
#   make llms-ref-fetch-one name=ai-elements
#   make llms-ref-pin-tag name=ai-elements tag=v0.1.2
#   make llms-ref-remove name=ai-elements
#   make llms-ref-clear

LLMS_REF_DIR := .llms/git-references
LLMS_REF_PATH = $(LLMS_REF_DIR)/$(name)

llms-ref-fetch-all: ## Fetch/init all LLM reference submodules
	git submodule update --init --recursive

llms-ref-fetch-one: ## Fetch/init one LLM reference submodule (name=...)
	@test -n "$(name)" || (echo "Missing: name=..."; exit 1)
	git submodule update --init "$(LLMS_REF_PATH)"

llms-ref-add: ## Add a new LLM reference submodule (url=... name=...)
	@test -n "$(url)"  || (echo "Missing: url=..."; exit 1)
	@test -n "$(name)" || (echo "Missing: name=..."; exit 1)
	mkdir -p "$(LLMS_REF_DIR)"
	git submodule add "$(url)" "$(LLMS_REF_PATH)"

llms-ref-pin-tag: ## Pin one LLM reference submodule to a specific tag (name=... tag=...)
	@test -n "$(name)" || (echo "Missing: name=..."; exit 1)
	@test -n "$(tag)"  || (echo "Missing: tag=..."; exit 1)
	git submodule update --init "$(LLMS_REF_PATH)"
	cd "$(LLMS_REF_PATH)" && git fetch --tags && git checkout "$(tag)" && cd - >/dev/null
	@echo "Pinned $(LLMS_REF_PATH) to tag $(tag). Now commit the parent repo pointer with: git add $(LLMS_REF_PATH)"

llms-ref-remove: ## Remove one LLM reference submodule cleanly (name=...)
	@test -n "$(name)" || (echo "Missing: name=..."; exit 1)
	git submodule deinit -f "$(LLMS_REF_PATH)" || true
	git rm -f "$(LLMS_REF_PATH)" || true
	rm -rf ".git/modules/$(LLMS_REF_PATH)" || true
	@echo "Removed $(LLMS_REF_PATH). Now commit parent repo changes if needed."

llms-ref-clear: ## Clear local downloaded refs to free disk space (keeps submodule definitions)
	rm -rf ".llms/git-references"/*
	rm -rf ".git/modules/$(LLMS_REF_DIR)"
	@echo "Cleared local checkouts (and module cache). Restore with: make llms-ref-fetch-all"

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' 
