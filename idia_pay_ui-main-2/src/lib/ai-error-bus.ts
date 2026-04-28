// Global event bus for AI error assistant
type ErrorListener = (error: string) => void;
const listeners = new Set<ErrorListener>();

export const pushAIError = (error: string) => listeners.forEach(fn => fn(error));
export const subscribeAIError = (fn: ErrorListener) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
