#!/bin/bash
npm run lint:server
if [[ $? -ne 0 ]]
then
  exit 1
fi
npm run lint:client
if [[ $? -ne 0 ]]
then
  exit 1
fi
