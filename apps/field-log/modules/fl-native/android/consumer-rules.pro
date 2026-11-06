# Expo's module registry instantiates the Module class by name (expo-module.config.json); the service is
# referenced from the manifest. Keep both explicitly.
-keep class expo.modules.flnative.FlNativeModule { *; }
-keep class expo.modules.flnative.RecordingService { *; }
