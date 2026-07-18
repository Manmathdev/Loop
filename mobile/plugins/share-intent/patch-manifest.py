import re
import sys

mf = "android/app/src/main/AndroidManifest.xml"

with open(mf) as f:
    xml = f.read()

share = """          <intent-filter>
            <action android:name="android.intent.action.SEND" />
            <category android:name="android.intent.category.DEFAULT" />
            <data android:mimeType="text/plain" />
          </intent-filter>
"""

xml = re.sub(
    r'(<action android:name="android.intent.action.MAIN"\s*/>.*?</intent-filter>)',
    r"\1\n" + share,
    xml,
    flags=re.DOTALL,
)

with open(mf, "w") as f:
    f.write(xml)
