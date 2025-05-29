import { PictureData } from '@2060.io/credo-ts-didcomm-user-profile'
import { didcommMessageState, ServiceAgentMessageReceipt } from '@2060.io/vs-agent-model'
import { isUri } from '@credo-ts/core/build/utils'
import { MessageReceipt } from 'credo-ts-receipts'

export function parseDataUrl(dataUrl: string) {
  const regex = /^data:(.+);base64,(.*)$/

  const matches = dataUrl.match(regex)
  if (!matches) return null

  return { mimeType: matches[1], data: matches[2] }
}

export function parsePictureData(pictureData: string): PictureData | undefined {
  const parsedDataUrl = parseDataUrl(pictureData)
  if (parsedDataUrl) {
    return { base64: parsedDataUrl.data, mimeType: parsedDataUrl.mimeType }
  } else if (isUri(pictureData)) {
    return { links: [pictureData] }
  }
}

export function createDataUrl(pictureData: PictureData): string | undefined {
  if (pictureData.base64 && pictureData.mimeType) {
    return `data:${pictureData.mimeType};base64,${pictureData.base64}`
  } else if (pictureData.links && pictureData.links.length > 0) {
    return pictureData.links[0]
  }
}

export const didcommReceiptFromServiceAgentReceipt = (receipt: ServiceAgentMessageReceipt) =>
  new MessageReceipt({ ...receipt, state: didcommMessageState[receipt.state.toLowerCase()] })
