#!/bin/bash
AUTH='Authorization: <key from output of setup.sh script>'
TEAMS=(
    "Stratus,pdldestrat@pdl.internal.ericsson.com,https://confluence-oss.seli.wh.rnd.internal.ericsson.com/display/TST/Stratus+On-Call+Rota"
    "Stack Centric,pdlstackce@pdl.internal.ericsson.com,https://confluence-oss.seli.wh.rnd.internal.ericsson.com/display/CIE/Physical+Environments%2C+Cloud+%28VMware%2C+Openstack%2C+Netsim+vFarm%29+On-Call+Rota"
    "Axis Ops,pdldepanam@pdl.internal.ericsson.com,https://confluence-oss.seli.wh.rnd.internal.ericsson.com/display/CIE/1.+On+Call+Information"
    "Cloud Centric,Hyderabad.TCSCLOUDCENTRIC@tcs.com,https://confluence-oss.seli.wh.rnd.internal.ericsson.com/display/CIE/Cloud-Centric+Roster"
    "TAF,PDLTAFRAME@ex1.eemea.ericsson.se,https://confluence-oss.seli.wh.rnd.internal.ericsson.com/display/TAF/On-Call+Rota"
)
GROUPS_API='http://atvts2716.athtem.eei.ericsson.se:4002/api/groups'

echo "Creating Teams..."
for TEAM in "${TEAMS[@]}"
do
    TEAM_NAME=`echo $TEAM | cut -d "," -f1`;
    TEAM_EMAIL=`echo $TEAM | cut -d "," -f2`;
    TEAM_ONCALL=`echo $TEAM | cut -d "," -f3`;
    echo "Creating Group ${TEAM_NAME}..."
    curl $GROUPS_API --noproxy "*" \
        -H "$AUTH" \
        -sf \
        --data '{"name":"'"$TEAM_NAME"'","TeamEmail":"'"${TEAM_EMAIL}"'","OnCallURL":"'"${TEAM_ONCALL}"'","public":true}' --compressed \
         > /dev/null
done
echo "Completed."
