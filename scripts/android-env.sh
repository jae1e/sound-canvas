# Source this file to use the locally installed Android toolchain:
#   source scripts/android-env.sh
# Installed without sudo: JDK 17 in ~/.local/jdk-17, Android SDK in ~/Android/Sdk.
export JAVA_HOME="$HOME/.local/jdk-17"
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
