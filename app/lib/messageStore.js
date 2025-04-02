import { mutate } from "swr";

class MessageStore {
  static listeners = new Set();

  static subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  static publish(message) {
    this.listeners.forEach((callback) => callback(message));
    // Trigger SWR revalidation
    mutate("/api/messages");
  }
}

export default MessageStore;
