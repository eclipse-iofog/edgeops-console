#!/usr/bin/env sh
# Resolve build flavor: env VITE_DISTRIBUTION > config/distribution.arg > datasance

set -e

if [ -n "${VITE_DISTRIBUTION}" ]; then
  printf '%s\n' "${VITE_DISTRIBUTION}"
  exit 0
fi

if [ -f config/distribution.arg ]; then
  tr -d '[:space:]' < config/distribution.arg
  exit 0
fi

printf '%s\n' "datasance"
