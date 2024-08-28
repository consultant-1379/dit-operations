# Statping :latest Docker Image
FROM alpine:latest
LABEL maintainer="Hunter Long (https://github.com/hunterlong)"

ARG VERSION
ENV IS_DOCKER=true
ENV STATPING_DIR=/app
ENV PORT=4002
RUN apk --no-cache add curl jq libsass

COPY sass /usr/local/bin/sass
COPY statping /usr/local/bin/statping

WORKDIR /app
VOLUME /app
EXPOSE $PORT

HEALTHCHECK --interval=5s --timeout=5s --retries=5 CMD curl -s "http://atvts2716.athtem.eei.ericsson.se:$PORT/health" | jq -r -e ".online==true"

# DE specific settings
ENV CONFLUENCE_BASE https://confluence-oss.seli.wh.rnd.internal.ericsson.com/display/
ENV JIRA_BASE https://jira-oss.seli.wh.rnd.internal.ericsson.com/browse/

CMD statping -port $PORT