#!/usr/bin/env sh
#
# package.sh — build EdgeOps Console and tarball build/ for Controller embed.
#

set -e

. scripts/utils.sh

VERSION="$(node -p "require('./package.json').version")"
DISTRIBUTION="${VITE_DISTRIBUTION:-$(sh scripts/resolve-distribution.sh | tr -d '[:space:]')}"
DISTRO_NAME="edgeops-console_${DISTRIBUTION}_${VERSION}.tar.gz"

prettyTitle "EdgeOps Console packaging (${DISTRIBUTION})"
echoInfo "Beginning build-only packaging"

if [ -f "${DISTRO_NAME}" ]; then
    echoInfo "Removing old artifact"
    rm "${DISTRO_NAME}"
fi

echoInfo "Installing dependencies"
if [ -n "${CI}" ]; then
    npm ci --legacy-peer-deps
else
    npm install --legacy-peer-deps
fi

echoInfo "Building production app (VITE_DISTRIBUTION=${DISTRIBUTION})"
case "${DISTRIBUTION}" in
    datasance|iofog)
        npm run "build:${DISTRIBUTION}"
        ;;
    *)
        echoError "Unknown VITE_DISTRIBUTION: ${DISTRIBUTION} (expected datasance or iofog)"
        exit 1
        ;;
esac

if [ ! -d build ]; then
    echoError "build/ directory missing after vite build"
    exit 1
fi

echoInfo "Creating tarball '${DISTRO_NAME}'"
tar -czvf "${DISTRO_NAME}" build/

echoInfo "Packaging complete: ${DISTRO_NAME}"
