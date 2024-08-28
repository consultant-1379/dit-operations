FROM  armdocker.seli.gic.ericsson.se/dockerhub-ericsson-remote/node:10.16.3-jessie

# 80 = HTTP
EXPOSE 80

# Set development environment variable
ENV NODE_ENV development

# Set the working directory
WORKDIR /opt/mean.js

# Install the production packages
COPY package.json /opt/mean.js/package.json
COPY allTools /opt/mean.js

RUN npm install \
 && npm link gulp@4.0.0 \
 && npm link webpack@4.27.1 \
 && npm link webpack-cli@3.1.2 \
 && npm link nodemon@1.18.9 \
 && npm install --no-cache tzdata
# Update sources.list to use archive and install sshpass
RUN echo "deb http://archive.debian.org/debian-security jessie/updates main" > /etc/apt/sources.list \
    && echo "Acquire::Check-Valid-Until false;" > /etc/apt/apt.conf.d/99no-check-valid-until \
    && echo "deb http://archive.debian.org/debian jessie main contrib non-free" >> /etc/apt/sources.list \
    && echo "deb-src http://archive.debian.org/debian jessie main contrib non-free" \
    && apt-get update \
    && apt-get -y --force-yes install sshpass

RUN npm install nyc@13.2.0 -g

CMD ["./tool_start_development.sh"]
