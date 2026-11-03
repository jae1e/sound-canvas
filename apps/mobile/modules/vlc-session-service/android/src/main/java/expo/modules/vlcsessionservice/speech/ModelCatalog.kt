package expo.modules.vlcsessionservice.speech

/**
 * Downloadable model sets. URLs and checksums are plain constants so they can be changed
 * (mirror, different model) without touching the downloader. Models are never bundled in the APK.
 *
 * Sources (checked 2026-11-03):
 *  - Korean: huggingface.co/kangkyu/icefall-asr-ko-streaming-zipformer-174m (Apache-2.0, KsponSpeech-trained,
 *    int8 streaming zipformer, chunk-16 / left-128 variant = lowest latency).
 *  - English: huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-06-26 (Apache-2.0).
 *  - Silero VAD: k2-fsa/sherpa-onnx "asr-models" release asset.
 * SHA-256 values are the Hugging Face LFS object ids (== SHA-256 of the file) or computed by us.
 */
data class ModelFile(val name: String, val url: String, val sizeBytes: Long, val sha256: String)

data class ModelSet(val id: String, val title: String, val files: List<ModelFile>) {
  val totalBytes: Long get() = files.sumOf { it.sizeBytes }
}

object ModelCatalog {
  private const val KO_BASE = "https://huggingface.co/kangkyu/icefall-asr-ko-streaming-zipformer-174m/resolve/main"
  private const val EN_BASE = "https://huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-06-26/resolve/main"
  private const val VAD_URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx"

  val vad = ModelSet(
    "vad", "Silero VAD",
    listOf(ModelFile("silero_vad.onnx", VAD_URL, 643_854, "9e2449e1087496d8d4caba907f23e0bd3f78d91fa552479bb9c23ac09cbb1fd6")),
  )

  val ko = ModelSet(
    "ko", "Korean streaming zipformer 174M int8 (chunk-16)",
    listOf(
      ModelFile("encoder.int8.onnx", "$KO_BASE/encoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx", 156_840_518, "e595e2e37f46078387868ffa656b775de787fa511cf851cf8e1892d7dbdabe54"),
      ModelFile("decoder.int8.onnx", "$KO_BASE/decoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx", 1_544_210, "f5dfa6c8609b29da86c739d4904889475c33b62e28e70c619952a0ee6c31416f"),
      ModelFile("joiner.int8.onnx", "$KO_BASE/joiner-epoch-99-avg-1-chunk-16-left-128.int8.onnx", 1_270_777, "64efd9aeb71fb2278c713b3d5eb5ec45edf6b2ccd8716d3709044f17723c13fd"),
      ModelFile("tokens.txt", "$KO_BASE/tokens.txt", 20_844, "435dfb9e0a2b6a79124f1a4d8f0f33a951b25384726e2e0d854f081533e6ec9d"),
    ),
  )

  val en = ModelSet(
    "en", "English streaming zipformer int8 (2023-06-26, chunk-16)",
    listOf(
      ModelFile("encoder.int8.onnx", "$EN_BASE/encoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx", 71_083_163, "563fde436d16cf7607cf408cd6b30909819d03162652ef389c2450ced3f45ac1"),
      ModelFile("decoder.int8.onnx", "$EN_BASE/decoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx", 1_307_236, "98da299f471e38bb4e1a8df579b8cc9122d6039576a77e357b3c60f17dd83b02"),
      ModelFile("joiner.int8.onnx", "$EN_BASE/joiner-epoch-99-avg-1-chunk-16-left-128.int8.onnx", 259_335, "d944208d660d67c8d72cd2acaeac971fa5ceb8c80e76c1968148846fedd6e297"),
      ModelFile("tokens.txt", "$EN_BASE/tokens.txt", 5_048, "49e3c2646595fd907228b3c6787069658f67b17377c60aeb8619c4551b2316fb"),
    ),
  )

  val all: List<ModelSet> = listOf(vad, ko, en)

  fun find(id: String): ModelSet? = all.firstOrNull { it.id == id }
}
