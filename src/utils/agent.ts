import { HandshakeProtocol } from '@credo-ts/core'

import { ServiceAgent } from './ServiceAgent'

/**
 * Creates an out of band invitation that will equal to the public DID in case the agent has one defined,
 * and a new one every time in case the agent does not have any public DID.
 *
 * @param agent
 * @returns
 */
export async function createInvitation(agent: ServiceAgent) {
  const outOfBandInvitation = (
    await agent.oob.createInvitation({
      label: agent.config.label,
      handshakeProtocols: [HandshakeProtocol.DidExchange, HandshakeProtocol.Connections],
      did: agent.did,
      multiUseInvitation: true,
      imageUrl: process.env.AGENT_INVITATION_IMAGE_URL,
    })
  ).outOfBandInvitation
  return {
    url: outOfBandInvitation.toUrl({ domain: process.env.AGENT_INVITATION_BASE_URL ?? 'https://2060.io/i' }),
  }
}
