import { AgentMessage, HandshakeProtocol, parseDid } from '@credo-ts/core'

import { AGENT_INVITATION_BASE_URL, AGENT_INVITATION_IMAGE_URL } from '../config/constants'

import { VsAgent } from './VsAgent'

/**
 * Creates an out of band invitation that will equal to the public DID in case the agent has one defined,
 * and a new one every time in case the agent does not have any public DID.
 *
 * @param agent
 * @returns
 */
export async function createInvitation(options: {
  agent: VsAgent
  messages?: AgentMessage[]
  useLegacyDid?: boolean
}) {
  const { agent, messages, useLegacyDid } = options

  // Use legacy did:web in case agent's did is webvh and using legacy did
  const invitationDid =
    agent.did && parseDid(agent.did).method === 'webvh' && useLegacyDid
      ? `did:web:${parseDid(agent.did).id.split(':')[1]}`
      : agent.did

  const outOfBandInvitation = (
    await agent.oob.createInvitation({
      label: agent.config.label,
      handshakeProtocols: [HandshakeProtocol.DidExchange, HandshakeProtocol.Connections],
      invitationDid,
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
