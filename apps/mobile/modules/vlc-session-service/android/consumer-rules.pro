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
