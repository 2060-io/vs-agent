//import { Passport } from './dump'
import type tsemrtd from '@li0ard/tsemrtd'

const { DG1 } = require('../esm/bundle.js') as typeof tsemrtd

const func = async () => {
    //const tsemrtd = await import('@li0ard/tsemrtd')
    const dg1 = Buffer.from('YVtfH1hQPEQ8PE1VU1RFUk1BTk48PEVSSUtBPDw8PDw8PDw8PDw8PDw8PDw8PDw8PEMxMVQwMDJKTTREPDw5NjA4MTIyRjEzMTAzMTc8PDw8PDw8PDw8PDw8PDw2', 'base64')
    //const data = tsemrtd.DG1.load(Buffer.from(Passport.DG1,'base64'))
    const data = DG1.load(dg1)
    console.log(data)
}

func()