#!/bin/bash
UPGRADE_VERSION=$1
TOOL_NAME=$2
TARGET_URL=$3
TOOL_PATH=$4

if [[ $UPGRADE_VERSION == "" || $UPGRADE_VERSION == "undefined"
|| $TOOL_NAME == "" || $TOOL_NAME == "undefined"  ]]
then
    echo "Please provide a tool and version to upgrade."
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
