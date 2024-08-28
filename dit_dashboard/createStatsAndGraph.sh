#!/bin/bash
cd deployment-inventory-tool/
../node_modules/.bin/git-stats --global-activity --raw | ../node_modules/.bin/git-stats-html -o ../views/out.ejs
git_stats generate --out-path="../views/"
cd .. && rm views/index.html && sed -i 's/index.html/general.html/' views/general.html && cp views/general.html views/general.ejs