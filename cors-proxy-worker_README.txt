
666SOUNDsDESIGn — Master CORS Proxy Worker
=========================================

Route
-----
/cors?u=<ENCODED_TARGET_URL>

Current allowlist
-----------------
- https://my.idjstream.com/8686/stream
- https://my.idjstream.com/cp/get_info.php?p=8686
- https://my.idjstream.com/666soundsdesign/7.html
- https://my.idjstream.com/666soundsdesign/stream

Purpose
-------
- clean byte pass-through for the radio stream
- CORS bridge for SonicPanel / IDJStream metadata
- no re-encoding -> no worker-side audio artifacts

Project config
--------------
Worker domain: https://666soundsdesign.fraggelpower666.workers.dev
Proxy route  : https://666soundsdesign.fraggelpower666.workers.dev/cors?u=

Frontend uses
-------------
- Stream direct from https://my.idjstream.com/8686/stream
- Metadata via worker proxy from https://my.idjstream.com/cp/get_info.php?p=8686
- Legacy metadata fallback via worker proxy from https://my.idjstream.com/666soundsdesign/7.html
