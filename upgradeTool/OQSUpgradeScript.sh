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

{
    mkdir -p ~/.ssh
    # Remove old key
    ssh-keygen -R $TARGET_URL
    # Add the new key
    ssh-keyscan $TARGET_URL >> ~/.ssh/known_hosts
} &> /dev/null

# Run Commands after sshing
# sshpass -p "stratus@dmin" ssh root@$TARGET_URL << !
sshpass -p "stratus@dmin" ssh root@$TARGET_URL << !
    cd $TOOL_PATH;
    echo 'Y' | sudo ./auto_upgrade.sh $BASELINE $CLIENT $SERVER $HELPDOCS $APIDOCS;
!

echo "PROCESS FINISHED"
