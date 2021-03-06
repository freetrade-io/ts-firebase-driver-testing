#!make

node_modules: package.json
	yarn install || npm install

dist: node_modules $(shell find src -type f) prettier
	./node_modules/.bin/tsc

.PHONY: prettier
prettier:
	./node_modules/.bin/prettier './src/**/*.ts' './tests/**/*.ts' --write
	./node_modules/.bin/tslint -c ./tslint.json --fix 'src/**/*.ts' 'tests/**/*.ts'

.PHONY: test
test: node_modules
	./node_modules/.bin/tslint -c ./tslint.json 'src/**/*.ts' 'tests/**/*.ts'
	./node_modules/.bin/rimraf ./dist/
	./node_modules/.bin/jest
