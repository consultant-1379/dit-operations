#!/bin/bash
# This script is used to create a backup of the data DB from the Upgrade Tool.
# Note:
# - To create backup of production DBs, use: ./create_mongodb_backup.sh
# - To create backup of another networks DBs, provide the network name: ./create_mongodb_backup.sh <network_name>
# To be run nightly at 8am via crontab entry
# 0 8 * * * /dit-operations/upgradeTool/create_mongodb_backup.sh upgradetoolproduction_default

NETWORK=upgradetoolproduction_default

BACKUP_ROOT="/export/UPGRADETOOL/"
DATABASE="mean"

BACKUP_DIR=$BACKUP_ROOT$DATABASE/`date "+%Y%m%d%H%M%S"`
echo "Backing up mongodb $DATABASE database to directory $BACKUP_DIR"
mkdir -p $BACKUP_DIR
if [[ $? -ne 0 ]]
then
  exit 1
fi
chmod 777 $BACKUP_DIR
if [[ $1 != "" ]]
then
    echo "Creating backup via specified network ($1)"
    NETWORK=$1
fi
docker run -v $BACKUP_DIR:/backup --network=$NETWORK armdocker.seli.gic.ericsson.se/dockerhub-ericsson-remote/mongo:4.0.14 mongodump -u root -p roott --authenticationDatabase admin --db=$DATABASE --excludeCollection=sessions --out /backup --host mongodb
