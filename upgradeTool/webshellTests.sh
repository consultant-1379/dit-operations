#!/bin/bash
docker exec -it $(docker ps --filter "ancestor=upgradetoolproduction_nodejs" -q) ./tests/styles.sh
