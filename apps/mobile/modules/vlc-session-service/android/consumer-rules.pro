# sherpa-onnx JNI reads Kotlin config objects (e.g. VadModelConfig) by field name.
-keep class com.k2fsa.sherpa.onnx.** { *; }
# commons-compress references optional codecs we never touch (xz, zstd, brotli, asm).
-dontwarn org.apache.commons.compress.**
-dontwarn org.tukaani.xz.**
-dontwarn com.github.luben.zstd.**
-dontwarn org.brotli.dec.**
-dontwarn org.objectweb.asm.**
# ML Kit GenAI TTS (alpha) is reflective/proto based inside Play Services helpers; keep its public API.
-keep class com.google.mlkit.genai.** { *; }
-dontwarn com.google.mlkit.genai.**
# ML Kit / Firebase-components discovery (MlKitInitProvider -> ComponentDiscovery) instantiates every registrar listed in
# the merged manifest by reflection: `Class.forName(name).getDeclaredConstructor().newInstance()`. R8 otherwise strips
# the no-arg constructors ("NoSuchMethodException: CommonComponentRegistrar.<init> []") and ML Kit clients then NPE.
-keep class * implements com.google.firebase.components.ComponentRegistrar { <init>(); }
-keep class * implements com.google.firebase.components.ComponentRegistrar
-keep class com.google.mlkit.common.internal.** { *; }
-keep class com.google.mlkit.common.sdkinternal.** { *; }
-keep class com.google.android.gms.internal.mlkit_** { *; }
-keep class com.google.firebase.components.** { *; }
-dontwarn com.google.android.gms.internal.mlkit_**
