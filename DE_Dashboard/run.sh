#!/bin/bash
cd statping
docker build . -t de_dashboard:build -f Dockerfile.build
docker create --name extract de_dashboard:build
docker cp extract:/go/bin/statping .
docker cp extract:/usr/local/bin/sass .
docker rm -f extract
docker build . -t de_dashboard
docker run -it -p 4002:4002 -p 587:587 de_dashboard