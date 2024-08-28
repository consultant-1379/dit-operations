#!/bin/bash
npm run build:client &
npm run build:server &
while [ ! -f dist/bundle.js ]
do
  sleep 1
done
nodemon --watch dist/bundle.js dist/bundle.js