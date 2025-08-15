#!/bin/bash

# Bun compatibility script for environments where bun is not yet available
# This script provides bun command equivalents using npm

case "$1" in
  "run")
    shift
    echo "Running with npm: npm run $@"
    npm run "$@"
    ;;
  "install")
    shift
    echo "Installing with npm: npm install $@"
    npm install "$@"
    ;;
  "add")
    shift
    echo "Adding packages with npm: npm install $@"
    npm install "$@"
    ;;
  "remove")
    shift
    echo "Removing packages with npm: npm uninstall $@"
    npm uninstall "$@"
    ;;
  "dev")
    echo "Starting development server with npm..."
    npm run dev
    ;;
  "build")
    echo "Building with npm..."
    npm run build
    ;;
  "start")
    echo "Starting production server with npm..."
    npm run start
    ;;
  "--version")
    echo "Bun compatibility script v1.0 (using npm $(npm --version))"
    ;;
  *)
    echo "Bun compatibility script"
    echo "Usage: ./bun-compat.sh [command]"
    echo "Available commands:"
    echo "  run [script]    - Run npm script"
    echo "  install [pkg]   - Install packages"
    echo "  add [pkg]       - Add packages"
    echo "  remove [pkg]    - Remove packages"
    echo "  dev             - Start development server"
    echo "  build           - Build for production"
    echo "  start           - Start production server"
    echo "  --version       - Show version"
    echo ""
    echo "Note: This is a compatibility script. Install bun for native support."
    ;;
esac