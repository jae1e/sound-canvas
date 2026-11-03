# This module has no reflection, JNI or serialization. Expo's module registry instantiates the Module class by name
# (from expo-module.config.json), so keep it explicitly: R8 has burned this project before.
-keep class expo.modules.vlcvoicecoach.VlcVoiceCoachModule { *; }
