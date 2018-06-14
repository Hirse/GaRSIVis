#!/usr/bin/env sh

cd pdf.js
npm i
npx gulp generic
if [ -d ../app/pdf.js ]; then
    rm -rf ../app/pdf.js;
fi
cp -r build/generic ../app/pdf.js
