import { Controller, Get, Query, Res } from '@nestjs/common'
import { Response } from 'express'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'
import { ApiTags } from '@nestjs/swagger'

const execAsync = promisify(exec)

@ApiTags('sdk')
@Controller({
  path: 'sdk',
  version: '1',
})
export class SdkController {
  @Get()
  async generateSdk(@Query('lang') lang: string, @Res() res: Response) {
    const supportedLanguages = ['java', 'python', 'csharp']
    if (!supportedLanguages.includes(lang)) {
      return res.status(400).json({ error: `Unsupported language: ${lang}` })
    }

    const outputDir = path.join(__dirname, `../../sdk-${lang}`)
    const openApiPath = path.join(__dirname, '../../openapi.json')

    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true })
    }

    const command = `npx @openapitools/openapi-generator-cli generate -i ${openApiPath} -g ${lang} -o ${outputDir}`

    try {
      await execAsync(command)

      // Zip opcional (requiere 'archiver' o usar shell directamente)
      // Aquí enviamos el zip generado directamente:
      const zipPath = `${outputDir}.zip`
      await execAsync(`zip -r ${zipPath} ${outputDir}`)

      res.download(zipPath, `sdk-${lang}.zip`, () => {
        fs.rmSync(zipPath, { force: true }) // limpieza opcional
      })
    } catch (error) {
      console.error('Error generating SDK:', error)
      res.status(500).json({ error: 'Failed to generate SDK' })
    }
  }
}
