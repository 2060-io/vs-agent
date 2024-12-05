import { EMrtdData } from '@2060.io/credo-ts-didcomm-mrtd'
import * as Mrz from 'mrz'

import { BaseMessage, BaseMessageOptions } from '../BaseMessage'
import { MessageType } from '../MessageType'

import { MrtdSubmitState } from './MrtdSubmitState'

export type EMrtdRawData = {
  raw: Record<string, string>
  processed: {
    documentType: string
    documentNumber?: string
    issuingState?: string
    dateOfBirth?: string
    dateOfExpiry?: string
    sex?: string
    nationality?: string
    lastName?: string
    firstName?: string
    mrzOptionalData?: string
    faceImages: string[]
    nameOfHolder?: string
    otherNames?: string[]
    personalNumber?: string
    placeOfBirth?: string[]
    permanentAddress?: string[]
    telephone?: string
    profession?: string
    title?: string
    personalSummary?: string
    custodyInformation?: string
  }
}

export interface EMrtdDataSubmitMessageOptions extends BaseMessageOptions {
  state: MrtdSubmitState
  dataGroups?: EMrtdData
}

export class EMrtdDataSubmitMessage extends BaseMessage {
  public constructor(options: EMrtdDataSubmitMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      if (options.dataGroups) {
        this.dataGroups = this.parseDataGroups(options.dataGroups)
      }
      this.state = options.state
    }
  }

  public readonly type = EMrtdDataSubmitMessage.type
  public static readonly type = MessageType.EMrtdDataSubmitMessage

  public state!: MrtdSubmitState

  public dataGroups?: EMrtdRawData

  public parseDataGroups({ raw, parsed }: EMrtdData) {
    if (!parsed || !parsed.fields) return this.dataGroups

    const dataUrls = parsed.fields.images.map(image => {
      const faceMimeType = image.imageType === 1 ? 'image/jp2' : 'image/jpeg'
      return `data:${faceMimeType};base64,${image.imageData.toString('base64')}`
    })

    const mrzString = parsed.fields.mrzData
    const formattedMrz = (len => {
      switch (len) {
        case 88:
          return mrzString.slice(0, 44) + '\n' + mrzString.slice(44)
        case 72:
          return mrzString.slice(0, 36) + '\n' + mrzString.slice(36)
        case 90:
          return mrzString.slice(0, 30) + '\n' + mrzString.slice(30, 60) + '\n' + mrzString.slice(60)
        case 30:
          return mrzString
        case 18:
          return mrzString.slice(0, 9) + '\n' + mrzString.slice(9)
        default:
          throw new Error(`Unrecognized MRZ length: ${len}`)
      }
    })(mrzString.length)
    const parsedMrz = Mrz.parse(formattedMrz)
    const birthDateFromAdditionalPersonalData = parsed.fields.additionalPersonalData?.fullDateOfBirth
    const dateOfBirth =
      !birthDateFromAdditionalPersonalData || birthDateFromAdditionalPersonalData.toString().length < 6
        ? parsedMrz.fields.birthDate
        : birthDateFromAdditionalPersonalData?.toString()

    const newEmrtdData: EMrtdRawData = {
      raw: raw,
      processed: {
        documentType: parsedMrz.format,
        documentNumber: parsedMrz.documentNumber ?? undefined,
        issuingState: parsedMrz.fields.issuingState ?? undefined,
        dateOfExpiry: this.convertMRTDDate(parsedMrz.fields.expirationDate, true),
        sex: parsedMrz.fields.sex ?? undefined,
        nationality: parsedMrz.fields.nationality ?? undefined,
        lastName: parsedMrz.fields.lastName ?? undefined,
        firstName: parsedMrz.fields.firstName ?? undefined,
        mrzOptionalData: parsedMrz.fields.optional1 ?? undefined,
        faceImages: dataUrls,
        nameOfHolder:
          parsed.fields.additionalPersonalData?.nameOfHolder ??
          `${parsedMrz.fields.lastName} ${parsedMrz.fields.firstName}`,
        dateOfBirth: this.convertMRTDDate(dateOfBirth, false),
        otherNames: parsed.fields.additionalPersonalData?.otherNames,
        personalNumber: parsed.fields.additionalPersonalData?.personalNumber,
        placeOfBirth: parsed.fields.additionalPersonalData?.placeOfBirth,
        permanentAddress: parsed.fields.additionalPersonalData?.permanentAddress,
        telephone: parsed.fields.additionalPersonalData?.telephone,
        profession: parsed.fields.additionalPersonalData?.profession,
        title: parsed.fields.additionalPersonalData?.title,
        personalSummary: parsed.fields.additionalPersonalData?.personalSummary,
        custodyInformation: parsed.fields.additionalPersonalData?.custodyInformation,
      },
    }
    return newEmrtdData
  }

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
  public convertMRTDDate(date: string | null | undefined, isExpirationDate: boolean) {
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
}
