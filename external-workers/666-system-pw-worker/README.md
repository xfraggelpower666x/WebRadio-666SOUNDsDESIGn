# 666-system-pw-worker HARDLOCK v1.2.0

Deploy this Worker separately. Set `AUTH_SECRET` identically on both auth Workers.
Set `ADMIN_SERVICE_TOKEN` identically on both auth Workers and the WebRadio Worker.
The WebRadio Worker must set `ADMIN_SERVICE_ORIGIN=https://webradio.666soundsdesign-broadcaster.com`.

Never commit actual secrets.
