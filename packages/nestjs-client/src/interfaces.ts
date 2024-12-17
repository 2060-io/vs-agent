import { BaseMessage, ConnectionStateUpdated } from '@2060.io/service-agent-model'

/**
 * The EventHandler interface defines the blueprint for handling events
 * in the main class, ensuring it implements the required methods for
 * basic and proper functionality. Classes implementing this interface
 * must handle connection updates and process input messages effectively.
 */
export interface EventHandler {
  /**
   * Handles a new connection event, typically triggered when the connection
   * state changes. This method can execute synchronously or asynchronously.
   *
   * @param event - An instance of ConnectionStateUpdated representing
   *                the updated connection state.
   */
  newConnection(event: ConnectionStateUpdated): Promise<void> | void

  /**
   * Handles a terminated connection event, typically triggered when the connection
   * state changes. This method can execute synchronously or asynchronously.
   *
   * @param event - An instance of ConnectionStateUpdated representing
   *                the updated connection state.
   */
  closeConnection(event: ConnectionStateUpdated): Promise<void> | void

  /**
   * Processes an incoming message. This method allows for both synchronous
   * and asynchronous handling of messages of type BaseMessage.
   *
   * @param message - An instance of BaseMessage containing the input message details.
   */
  inputMessage(message: BaseMessage): Promise<void> | void

  /**
   * Processes the creation of a unique hash for a credential.
   * This method should ensure proper handling of credential generation
   * by identifying the session associated with the provided connection ID.
   *
   * The implementation of this method must:
   * 1. Identify the session or context using the given connectionId.
   * 2. Generate a unique hash string based on the connection session
   *    and any other required data for the credential.
   *
   * @param connectionId - The unique identifier of the connection used
   *                       to determine the session context.
   * @returns A Promise that resolves to a unique hash Uint8Array representing
   *          the generated credential.
   */
  credentialHash(connectionId: string): Promise<Uint8Array>
}
