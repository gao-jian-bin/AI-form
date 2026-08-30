#!/bin/sh
set -eu

# Bind mounts replace the ownership prepared in the image. Initialise the one
# persistent application directory before dropping privileges permanently.
mkdir -p /data/uploads
chown -R node:node /data

exec gosu node:node "$@"

