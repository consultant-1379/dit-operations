#!/bin/bash
git checkout master
git reset --hard origin/master
git pull
cd upgradeTool
./run.sh production
