import { AgentMessage, HandshakeProtocol } from '@credo-ts/core'

import { AGENT_INVITATION_BASE_URL, AGENT_INVITATION_IMAGE_URL } from '../config/constants'

import { VsAgent } from './VsAgent'

/**
 * Creates an out of band invitation that will equal to the public DID in case the agent has one defined,
 * and a new one every time in case the agent does not have any public DID.
 *
 * @param agent
 * @returns
 */
export async function createInvitation(agent: VsAgent, messages?: AgentMessage[]) {
  const outOfBandInvitation = (
    await agent.oob.createInvitation({
      label: agent.config.label,
      handshakeProtocols: [HandshakeProtocol.DidExchange, HandshakeProtocol.Connections],
      invitationDid: agent.did,
      multiUseInvitation: !messages,
      imageUrl: AGENT_INVITATION_IMAGE_URL,
      messages,
    })
  ).outOfBandInvitation
  return {
    url: outOfBandInvitation.toUrl({
      domain: AGENT_INVITATION_BASE_URL,
    }),
  }
}
