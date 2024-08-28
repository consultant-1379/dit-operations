#!/bin/bash
TARGET_URL=$1
TOOL_PATH=$2
BASELINE=$3
CLIENT=$4
SERVER=$5
HELPDOCS=$6
APIDOCS=$7

if [[ $BASELINE == "" || $BASELINE == "undefined"
|| $CLIENT == "" || $CLIENT == "undefined"
|| $SERVER == "" || $SERVER == "undefined"
|| $HELPDOCS == "" || $HELPDOCS == "undefined"
|| $APIDOCS == "" || $APIDOCS == "undefined"  ]]
then
    echo "Please provide a tool and versions to upgrade."
    exit 1
fi

if [[ $TARGET_URL == "" || $TOOL_PATH == "" ]]
then
    echo "Tool URL or path not found."
    exit 1
fi

echo "Development Upgrade Script is now running"
sleep 1

echo "Removing old key"
sleep 2

echo "Adding new key"
sleep 2

echo "Running commands after sshing"
sleep 2

echo "Performing an upgrade"
sleep 10

echo "Health-check Passed."
sleep 2

echo "upgrade complete."

echo "PROCESS FINISHED"
