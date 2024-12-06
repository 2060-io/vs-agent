/**
 * Converts a Machine Readable Travel Document (MRTD) date in the format `YYMMDD` to a complete
 * `YYYYMMDD` date format, taking into account the current century.
 *
 * **Note:** This method is limited to interpreting dates based on the current year.
 * It may not handle dates correctly for years beyond the range determined by the
 * current century (e.g., for dates after 2050 when the current year is in the 21st century).
 *
 * @param {string} date - The MRTD date string in the format `YYMMDD`.
 * @param {boolean} isExpirationDate - A boolean flag indicating whether the date is an expiration date.
 * @returns {string} - The converted date in the format `YYYYMMDD`, or the original input
 *                     if the input is not a valid `YYMMDD` date.
 *
 * @example
 * // Current year: 2024
 * convertMRTDDate("240101"); // Returns "20240101"
 * convertMRTDDate("991231"); // Returns "19991231"
 * convertMRTDDate("abcd12"); // Returns "abcd12" (invalid input)
 */
export function convertShortDate(date: string | null | undefined, isExpirationDate: boolean) {
  if (!date || !/^\d{6}$/.test(date)) return date ?? undefined

  const currentYear = new Date().getFullYear()
  const currentCentury = Math.floor(currentYear / 100)
  const year = parseInt(date.slice(0, 2), 10)
  const month = date.slice(2, 4)
  const day = date.slice(4, 6)

  let fullYear: number

  if (isExpirationDate) {
    if (year <= currentYear % 100) {
      fullYear = currentCentury * 100 + year
      if (fullYear < currentYear) {
        fullYear += 100
      }
    } else {
      fullYear = currentCentury * 100 + year
    }
  } else {
    if (year <= currentYear % 100) {
      fullYear = currentCentury * 100 + year
    } else {
      fullYear = (currentCentury - 1) * 100 + year
    }
  }
  return `${fullYear}${month}${day}`
}
