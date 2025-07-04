import { BaseMessage } from '@2060.io/vs-agent-model'

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
  newConnection(connectionId: string): Promise<void> | void

  /**
   * Handles a terminated connection event, typically triggered when the connection
   * state changes. This method can execute synchronously or asynchronously.
   *
   * @param event - An instance of ConnectionStateUpdated representing
   *                the updated connection state.
   */
  closeConnection(connectionId: string): Promise<void> | void

  /**
   * Processes an incoming message. This method allows for both synchronous
   * and asynchronous handling of messages of type BaseMessage.
   *
   * @param message - An instance of BaseMessage containing the input message details.
   */
  inputMessage(message: BaseMessage): Promise<void> | void
}
