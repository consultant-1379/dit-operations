#!/bin/bash
export COMPOSE_PROJECT_NAME="upgradetool"$1
time docker-compose down --volumes

if [[ $1 == "development" ]]
then
    echo "Starting Development mode"
    time docker-compose build
    if [[ $? -ne 0 ]]
    then
        exit 1
    fi
    time docker-compose up --force-recreate
    if [[ $? -ne 0 ]]
    then
        exit 1
    fi
elif [[ $1 == "production" ]]
then
    echo "Starting Production mode"
    time docker-compose -f docker-compose-production.yml build
    if [[ $? -ne 0 ]]
    then
        exit 1
    fi
    time docker-compose -f docker-compose-production.yml up --force-recreate -d
    if [[ $? -ne 0 ]]
    then
        exit 1
    fi
    #Development vm use "localhost" and for live Production use "atvts2716.athtem.eei.ericsson.se"
    host="atvts2716.athtem.eei.ericsson.se"
    while true
    do
      if curl -s --head  --request GET http://$host | grep "200 OK" > /dev/null; then
        echo "Tool is ready."
        break
      else
        echo "Tool not ready yet..."
        sleep 5
      fi
    done
    echo "Getting data for DB..."
    ./tests/import_latest_DB.sh upgradetoolproduction_default live
    echo "Clone Tools GIT Repos..."
    content=$(curl -s "http://$host/api/cloneTools")
    echo "$content"
else
    echo "Please choose between production and development.";
    exit 1
fi
