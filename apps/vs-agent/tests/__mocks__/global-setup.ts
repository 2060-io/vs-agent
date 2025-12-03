const IGNORED_ERRORS = ['Error fetching witness proofs', 'fetch failed', 'getaddrinfo EAI_AGAIN']

process.on('uncaughtException', err => {
  if (typeof err?.message === 'string' && IGNORED_ERRORS.some(msg => err.message.includes(msg))) {
    return
  }
  throw err
})

process.on('unhandledRejection', (err: any) => {
  const msg = err?.message ?? err?.toString?.() ?? ''
  if (IGNORED_ERRORS.some(m => msg.includes(m))) {
    return
  }
  throw err
})
