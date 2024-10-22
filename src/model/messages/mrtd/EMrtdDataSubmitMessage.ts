import { EMrtdData } from '@2060.io/credo-ts-didcomm-mrtd'
import { Expose } from 'class-transformer'

import { BaseMessage, BaseMessageOptions } from '../BaseMessage'
import { MessageType } from '../MessageType'

export type EMrtdRawData = {
  raw: Record<string, string>;
  processed: {
      fields?: EMrtdProcessedData;
  };
};

export type EMrtdProcessedData = {
  mrzData: string;
  firstName: string;
  lastName: string;
  faceDataUrl: string;
  fingerprintDataUrl?: string;
  birthDate: number;
  placeOfBirth: string;
  issuanceDate: number;
};

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
    if (!parsed || !parsed.fields) return this.dataGroups;

    const [lastName, firstName] = parsed.fields.additionalPersonalData?.nameOfHolder.split('<<') || [];
    const faceMimeType = parsed.fields.images[0].imageType === 1 ? 'image/jp2':'image/jpeg'

    const newEmrtdData: EMrtdRawData = {
      raw: raw,
      processed: {
        fields: {
            mrzData: parsed.fields.mrzData ?? 'null',
            firstName: firstName ? firstName.replace('<', ' ').trim() : 'null',
            lastName: lastName ? lastName.replace('<', ' ').trim() : 'null',
            faceDataUrl: `data:${faceMimeType};base64,${(parsed.fields.images[0].imageData).toString('base64')}`,
            birthDate: parsed.fields.additionalPersonalData?.fullDateOfBirth ?? 0,
            placeOfBirth: parsed.fields.additionalPersonalData?.placeOfBirth[0] ?? "null",
            issuanceDate:parsed.fields.additionalDocumentData?.dateOfIssue ?? 0,
        }
      }
    }
    return newEmrtdData;
  }
}
