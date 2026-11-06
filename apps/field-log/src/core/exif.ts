/**
 * EXIF DateTimeOriginal ("YYYY:MM:DD HH:MM:SS") plus OffsetTimeOriginal ("+09:00") to epoch ms.
 * Returns undefined unless both are present and valid (a time without an offset is ambiguous).
 */
export function exifToWallMs(dateTimeOriginal: unknown, offsetTimeOriginal: unknown): number | undefined {
  if (typeof dateTimeOriginal !== 'string' || typeof offsetTimeOriginal !== 'string') return undefined;
  const d = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(dateTimeOriginal.trim());
  const o = /^([+-])(\d{2}):(\d{2})$/.exec(offsetTimeOriginal.trim());
  if (!d || !o) return undefined;
  const [y, mo, da, h, mi, s] = d.slice(1).map(Number);
  if (mo < 1 || mo > 12 || da < 1 || da > 31 || h > 23 || mi > 59 || s > 60) return undefined;
  const offMin = (o[1] === '-' ? -1 : 1) * (Number(o[2]) * 60 + Number(o[3]));
  return Date.UTC(y, mo - 1, da, h, mi, s) - offMin * 60000;
}
