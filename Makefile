.PHONY: help install build test lint format clean dev docker-up docker-down

help:
	@echo "NEXUS Development Commands"
	@echo "=========================="
	@echo "make install      - Install dependencies"
	@echo "make build        - Build all packages"
	@echo "make test         - Run all tests"
	@echo "make lint         - Lint code"
	@echo "make format       - Format code"
	@echo "make clean        - Clean build artifacts"
	@echo "make dev          - Start development mode"
	@echo "make docker-up    - Start Docker services"
	@echo "make docker-down  - Stop Docker services"

install:
	pnpm install

build:
	pnpm build

test:
	pnpm test

lint:
	pnpm lint

format:
	pnpm format

clean:
	pnpm clean

dev:
	pnpm dev

docker-up:
	docker compose up -d

docker-down:
	docker compose down
