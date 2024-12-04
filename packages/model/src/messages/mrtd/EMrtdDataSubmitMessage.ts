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

    const newEmrtdData: EMrtdRawData = {
      raw: raw,
      processed: {
        documentType: parsedMrz.format,
        documentNumber: parsedMrz.documentNumber ?? undefined,
        issuingState: parsedMrz.fields.issuingState ?? undefined,
        dateOfExpiry: parsedMrz.fields.expirationDate ?? undefined, // TODO: Check and specify date format
        sex: parsedMrz.fields.sex ?? undefined,
        nationality: parsedMrz.fields.nationality ?? undefined,
        lastName: parsedMrz.fields.lastName ?? undefined,
        firstName: parsedMrz.fields.firstName ?? undefined,
        mrzOptionalData: parsedMrz.fields.optional1 ?? undefined,
        faceImages: dataUrls,
        nameOfHolder:
          parsed.fields.additionalPersonalData?.nameOfHolder ??
          `${parsedMrz.fields.lastName} ${parsedMrz.fields.firstName}`,
        dateOfBirth:
          birthDateFromAdditionalPersonalData && birthDateFromAdditionalPersonalData !== 0
            ? birthDateFromAdditionalPersonalData.toString().slice(2)
            : (parsedMrz.fields.birthDate ?? undefined), // TODO: Check and specify date format
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
}
