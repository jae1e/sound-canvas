package expo.modules.vlcsessionservice.log

/** Full exception chain as one line: `Class: message <- CauseClass: message <- ...` (depth-limited, cycle-safe). */
fun Throwable.chainText(): String {
  val parts = ArrayList<String>()
  val seen = HashSet<Throwable>()
  var t: Throwable? = this
  while (t != null && seen.add(t) && parts.size < 8) {
    val where = t.stackTrace.firstOrNull()?.let { " @${it.className.substringAfterLast('.')}.${it.methodName}:${it.lineNumber}" } ?: ""
    parts.add("${t.javaClass.name}: ${t.message}$where")
    t = t.cause
  }
  return parts.joinToString(" <- ")
}
