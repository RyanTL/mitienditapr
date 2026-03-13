#!/bin/bash
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"
cd /Users/ryan/mitienditapr
npm run dev -- --port "${PORT:-3001}"
