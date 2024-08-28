# DIT Dashboard #
-------------------------------------------------
1. Build: docker build . -t dit_dashboard
2. Run: docker run -it -p 4001:4000 dit_dashboard
3. Install this cron job: 59 23 * * * docker exec $(docker ps --filter "ancestor=dit_dashboard" -q) bash -c "./createStatsAndGraph.sh"