#!/bin/bash
# Usage:  ./setup.sh https://YOURNAME.github.io/YOURREPO/  com.yourname.cardly
set -e
URL="$1"; BUNDLE="$2"
if [ -z "$URL" ] || [ -z "$BUNDLE" ]; then
  echo "Usage: ./setup.sh <your GitHub Pages URL> <unique bundle id, e.g. com.shivam.cardly>"; exit 1
fi
case "$URL" in */) ;; *) URL="$URL/";; esac

# 1. point the app at your site + set the bundle id
python3 - "$URL" "$BUNDLE" <<'PY'
import json,sys
c=json.load(open('capacitor.config.json'))
c['server']['url']=sys.argv[1]; c['appId']=sys.argv[2]
json.dump(c,open('capacitor.config.json','w'),indent=2)
PY

# 2. install Capacitor and create the iOS project
npm install
[ -d ios ] || npx cap add ios

# 3. add the native file plugin
cp native/CardlyFilePlugin.swift native/CardlyViewController.swift ios/App/App/

# 4. use our view controller instead of the default one
python3 - <<'PY'
import re
p='ios/App/App/Base.lproj/Main.storyboard'
s=open(p).read()
new,n=re.subn(r'customClass="CAPBridgeViewController"(\s+customModule="Capacitor")?(\s+customModuleProvider="target")?','customClass="CardlyViewController" customModule="App" customModuleProvider="target"',s)
if n==0 and 'CardlyViewController' in s:
    print('storyboard already patched')
elif n==0:
    print('!! Could not patch Main.storyboard automatically - see README step "If something is missing"')
else:
    open(p,'w').write(new); print('storyboard patched')
PY

# 5. add the files to the Xcode target
ruby add_to_xcode.rb || echo "(could not auto-add files; see README)"

# 6. app icon
ICON=$(find ios/App/App/Assets.xcassets/AppIcon.appiconset -name '*.png' | head -1)
[ -n "$ICON" ] && cp icon.png "$ICON" && echo "icon replaced"

npx cap sync ios
echo
echo "Done. Next: npx cap open ios   (then follow README.md, step 3)"
