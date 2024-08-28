FROM ubuntu:16.04
EXPOSE 4000
WORKDIR /opt/dit_dashboard
COPY public/ /opt/dit_dashboard/public
COPY views/index.ejs /opt/dit_dashboard/views/index.ejs
COPY views/statsPage.ejs /opt/dit_dashboard/views/statsPage.ejs
COPY run.sh createStatsAndGraph.sh server.js package.json /opt/dit_dashboard/
RUN apt-get update \
    && apt-get install -y curl ruby-full ruby-dev gcc zlib1g-dev \
    make ruby-nokogiri git npm --no-install-recommends && gem install git_stats
RUN npm config set strict-ssl false && npm cache clean -f && npm install -g n
RUN n 6.10.2 && npm install
RUN git clone https://dittest:otZPzm5craKQJ\&IN@gerrit.ericsson.se/a/OSS/com.ericsson.de.openstack/deployment-inventory-tool
CMD ["sh", "run.sh"]