#!/bin/bash

GERRIT_CLONE=https://dittest:otZPzm5craKQJ\&IN@gerrit.ericsson.se/a/OSS/
BASE_FOLDER="/opt/mean.js/allTools/"
TOOL_REPOS=$1

echo "Cleaning out allTools folder..."
cd ${BASE_FOLDER} && rm -rf *

echo "Cloning Tools..."
for TOOL_REPO in $(echo $TOOL_REPOS | sed "s/,/ /g")
do
    echo $GERRIT_CLONE$TOOL_REPO
    git clone $GERRIT_CLONE$TOOL_REPO
done
echo "Cloning Completed."
