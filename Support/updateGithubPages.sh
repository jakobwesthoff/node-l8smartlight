#!/bin/bash
# Abort on errors
set -e

SCRIPT_DIRECTORY="$(dirname "${0}")"
pushd "${SCRIPT_DIRECTORY}/.." >/dev/null
echo "Regenerating documentation"
grunt clean
grunt documentation
echo "Switching to gh-pages branch"
git checkout gh-pages
echo "Deleting old version"
find ./ \
    -mindepth 1 -maxdepth 1 \
    -not -name "Documentation" \
    -and -not -name ".git" \
    -and -not -name ".gitignore" \
    -and -not -name ".idea" \
    -and -not -name "node_modules" \
    -exec rm -rf {} \;

echo "Moving new documentation into place"
mv Documentation/* ./
rm -rf Documentation

echo "New generation in place. Please commit to update."
popd >/dev/null
