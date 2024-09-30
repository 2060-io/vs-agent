import { isUri } from '@credo-ts/core/build/utils'
import { PictureData } from '@2060.io/credo-ts-didcomm-user-profile'

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
