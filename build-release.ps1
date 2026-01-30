# Build script for signed Android release APK
$env:KEYSTORE_FILE="C:/Users/pasca/Coding/Ski-GPX-Analyzer/ski-analyzer-release.keystore"
$env:KEYSTORE_PASSWORD="SkiGPX2026!Release"
$env:KEY_ALIAS="ski-analyzer"
$env:KEY_PASSWORD="SkiGPX2026!Release"

# Set JAVA_HOME to Android Studio's bundled JDK
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"

# Navigate to android directory and build
cd android
.\gradlew assembleRelease
