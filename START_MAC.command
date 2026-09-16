#!/bin/zsh
cd "${0:A:h}" || exit 1
exec ./START_LOCAL_MAC.command "$@"
