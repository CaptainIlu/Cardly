# Cardly for iPhone (free Apple ID version)

This is a thin iOS app. It loads Cardly from your GitHub Pages site, and adds one
native feature: it can open your `cardly-data.json` in iCloud Drive once, remember it,
and then read and write it directly - the same file your laptop uses.

## 0. Before you start
1. Put the NEW `index.html` (the one sent with this folder) on GitHub Pages, replacing the old one. The app loads whatever is published there.
2. On the Mac you need: Xcode (App Store), Node.js (https://nodejs.org), and CocoaPods
   (`sudo gem install cocoapods`, or `brew install cocoapods`).
3. Your iPhone: Settings > Privacy & Security > Developer Mode > On (needs a restart).

## 1. Set up (one time)
Open Terminal in this folder and run (use your own URL, and a bundle id that nobody else
would use, such as com.yourname.cardly):

    ./setup.sh https://YOURNAME.github.io/YOURREPO/ com.yourname.cardly

## 2. Open in Xcode
    npx cap open ios

## 3. Run on your iPhone
1. In Xcode click the blue "App" project (top of the left list) > target "App" > **Signing & Capabilities**.
2. Tick "Automatically manage signing". Team: choose **your Apple ID (Personal Team)**
   (Xcode > Settings > Accounts > + to sign in first if it is not listed).
3. Plug in your iPhone, unlock it, pick it in the device list at the top of Xcode, press the **Play** button.
4. First launch: iPhone Settings > General > VPN & Device Management > your Apple ID > Trust.
5. Open Cardly. Tap **Open Data File** and choose `cardly-data.json` in iCloud Drive.
   From then on the app opens straight into your data, and every change is written to that file.

## Every 7 days (free account)
The app stops opening after 7 days. Plug in the phone, open the project
(`npx cap open ios`) and press Play again. Your data is not affected (it lives in the iCloud file).

## When Cardly itself changes
Nothing to do here - publish the new index.html to GitHub Pages as usual and the app loads it.

## If something is missing
- Xcode says it cannot find `CardlyFilePlugin` / `CardlyViewController`: in Xcode, drag
  `CardlyFilePlugin.swift` and `CardlyViewController.swift` from ios/App/App into the "App"
  folder in the left list (tick "Add to targets: App").
- Setup printed "Could not patch Main.storyboard": click Main.storyboard in Xcode, select the
  yellow "Bridge View Controller" scene, open the Identity Inspector (right panel) and set
  Class to `CardlyViewController` (Module: App).
- Anything else: copy the red error text from Xcode and send it to Claude.
