.PHONY: setup reproduce test test:watch e2e app clean-clone-check build

setup:
	npm install
	cd packages/shared && npm install
	cd apps/api && npm install 2>/dev/null || true
	cd apps/web && npm install

reproduce:
	npm run build
	npm run test

test:
	npm run test

test:watch:
	npm run test:watch

e2e:
	npx playwright test

app:
	./scripts/start_all.sh

build:
	npm run build

clean-clone-check:
	./scripts/verify_fresh_clone.sh

# PayPal specific targets
paypal-doctor:
	npm run paypal:doctor

paypal-setup:
	npm run paypal:setup

seed-sandbox:
	npm run seed:sandbox

worker-webhooks:
	npm run worker:webhooks

worker-scheduled:
	npm run worker:scheduled