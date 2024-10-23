import { EMrtdData } from '@2060.io/credo-ts-didcomm-mrtd'
import { Expose } from 'class-transformer'
import * as Mrz from 'mrz'

import { BaseMessage, BaseMessageOptions } from '../BaseMessage'
import { MessageType } from '../MessageType'

export type EMrtdRawData = {
  raw: Record<string, string>
  processed: {
    ef_dg1: EF_DG1
    ef_dg2: EF_DG2
    ef_dg11?: EF_DG11
  }
}

export type EF_DG1 = {
  documentType: string
  documentNumber: string | null
  issuingState?: string | null
  dateOfBirth?: string | null
  dateOfExpiry?: string | null
  sex?: string | null
  nationality?: string | null
  lastName?: string | null
  firstName?: string | null
  nameOfHolder?: string
  mrzOptionalData?: string | null
}

export type EF_DG2 = {
  faceImages: string[]
}

export type EF_DG11 = {
  nameOfHolder?: string
  dateOfBirth?: number
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

export interface EMrtdDataSubmitMessageOptions extends BaseMessageOptions {
  dataGroups: EMrtdData
}

export class EMrtdDataSubmitMessage extends BaseMessage {
  public constructor(options: EMrtdDataSubmitMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.dataGroups = this.parseDataGroups(options.dataGroups)
    }
  }

  public readonly type = EMrtdDataSubmitMessage.type
  public static readonly type = MessageType.EMrtdDataSubmitMessage

  @Expose()
  public dataGroups!: EMrtdRawData

  public parseDataGroups({ raw, parsed }: EMrtdData): EMrtdRawData {
    if (!parsed || !parsed.fields) return this.dataGroups

    const dataUrls = parsed.fields.images.map(image => {
      const faceMimeType = image.imageType === 1 ? 'image/jp2' : 'image/jpeg'
      return `data:${faceMimeType};base64,${image.imageData.toString('base64')}`
    })

    const mrzString = parsed.fields.mrzData
    const formattedMrz = ((len) => {
      switch(len) {
        case 88: return mrzString.slice(0, 44) + '\n' + mrzString.slice(44);
        case 72: return mrzString.slice(0, 36) + '\n' + mrzString.slice(36);
        case 90: return mrzString.slice(0, 30) + '\n' + mrzString.slice(30, 60) + '\n' + mrzString.slice(60);
        case 30: return mrzString;
        case 18: return mrzString.slice(0, 9) + '\n' + mrzString.slice(9);
        default: throw new Error(`Unrecognized MRZ length: ${len}`);
      }
    })(mrzString.length);
    const parsedMrz = Mrz.parse(formattedMrz)

    const newEmrtdData: EMrtdRawData = {
      raw: raw,
      processed: {
        ef_dg1: {
          documentType: parsedMrz.format,
          documentNumber: parsedMrz.documentNumber,
          issuingState: parsedMrz.fields.issuingState,
          dateOfBirth: parsedMrz.fields.birthDate,
          dateOfExpiry: parsedMrz.fields.expirationDate,
          sex: parsedMrz.fields.sex,
          nationality: parsedMrz.fields.nationality,
          lastName: parsedMrz.fields.lastName,
          firstName: parsedMrz.fields.firstName,
          nameOfHolder: parsed.fields.additionalPersonalData?.nameOfHolder,
          mrzOptionalData: parsedMrz.fields.optional1,
        },
        ef_dg2: {
          faceImages: dataUrls,
        },
        ef_dg11: {
          nameOfHolder: parsed.fields.additionalPersonalData?.nameOfHolder,
          dateOfBirth: parsed.fields.additionalPersonalData?.fullDateOfBirth,
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
      },
    }
    return newEmrtdData
  }
}
