package expo.modules.vcaudio.core

/** Device keys are stable across Android device-id changes and require all three components. */
object DeviceKeyResolver {
  fun key(type: String, productName: String, addressHash: String): String = "$type:$productName:$addressHash"
  fun resolve(preferredKey: String?, inputs: List<InputInfo>): InputInfo? =
    inputs.firstOrNull { preferredKey != null && key(it.type, it.productName, it.addressHash.orEmpty()) == preferredKey }
      ?: inputs.firstOrNull { it.type == "builtin" }
}
