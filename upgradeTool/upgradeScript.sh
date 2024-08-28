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

{
    mkdir -p ~/.ssh
    # Remove old key
    ssh-keygen -R $TARGET_URL
    # Add the new key
    ssh-keyscan $TARGET_URL >> ~/.ssh/known_hosts
} &> /dev/null

# Run Commands after sshing
sshpass -p "stratus@dmin" ssh root@$TARGET_URL << !
    cd $TOOL_PATH;
    printf 'Y' | sudo ./auto_upgrade.sh $UPGRADE_VERSION;
!

echo "PROCESS FINISHED"
