#!/usr/bin/env sh
set -eu

bun install
bun run build
bun link
maxmem install-hooks
