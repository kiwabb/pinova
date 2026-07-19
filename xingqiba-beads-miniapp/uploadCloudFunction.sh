#!/usr/bin/env bash

set -euo pipefail

readonly WECHAT_CLI="${WECHAT_CLI:-/Applications/wechatwebdevtools.app/Contents/MacOS/cli}"
readonly CLOUD_ENV_ID="${CLOUD_ENV_ID:-cloud1-d6gtwjvgqe576cbf0}"
readonly WECHAT_IDE_PORT="${WECHAT_IDE_PORT:-19268}"
readonly PROJECT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -x "${WECHAT_CLI}" ]]; then
  echo "未找到微信开发者工具 CLI：${WECHAT_CLI}" >&2
  exit 1
fi

if (($#)); then
  functions=("$@")
else
  functions=(userBootstrap galleryService userService adminService)
fi

"${WECHAT_CLI}" cloud functions deploy \
  --env "${CLOUD_ENV_ID}" \
  --names "${functions[@]}" \
  --remote-npm-install \
  --project "${PROJECT_PATH}" \
  --port "${WECHAT_IDE_PORT}" \
  --lang zh
