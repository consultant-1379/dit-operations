#!/bin/bash
echo "Creating and Configuring Monitoring Tool..."
URL='http://atvts2716.athtem.eei.ericsson.se:4002'
SETUP_API=$URL'/setup'
USERNAME=admin
PASSWORD=password
ADMIN_EMAIL=user@ericsson.com
curl $SETUP_API --noproxy "*" \
    --data 'db_connection=sqlite&project=DE+Monitoring+Tool&description=Monitoring+all+DE+Tools&domain="'"$URL"'"&username='"$USERNAME"'&password='"$PASSWORD"'&email='"$ADMIN_EMAIL"'' \
    --compressed
echo "Complete."