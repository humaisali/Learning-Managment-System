import { useEffect, useRef } from "react";
import { getSocket } from "../lib/socket";

/**
 * Subscribe to a socket event. Automatically cleans up on unmount.
 * Usage: useSocket("doubt:responded", (data) => { ... });
 */
export function useSocket(event, handler) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const listener = (...args) => savedHandler.current(...args);
    socket.on(event, listener);

    return () => {
      socket.off(event, listener);
    };
  }, [event]);
}

/**
 * Emit a socket event.
 */
export function emitSocket(event, data) {
  const socket = getSocket();
  if (socket?.connected) {
    socket.emit(event, data);
  }
}
