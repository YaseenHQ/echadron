---
"echadron": patch
---

Install Echadron without an approval prompt. The interactive terminal's native module was built from source at install time, so `npm install -g echadron` stopped to ask about running install scripts, and anyone who declined ended up with a broken terminal tool. It now ships as a prebuilt binary selected per platform, so a global install runs no scripts at all.
