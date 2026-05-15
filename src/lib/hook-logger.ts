/**
 * Granular logging for data-fetching hooks.
 * Emits prefixed `[BEGIN] [scope]`, `[EXEC] [scope]`, `[ERROR] [scope]`, `[END] [scope]`
 * messages so silent stalls become visible in the console.
 */

const fmt = (level: string, scope: string, meta?: unknown) =>
  meta === undefined
    ? `[${level}] [${scope}]`
    : `[${level}] [${scope}]`;

export const logBegin = (scope: string, meta?: unknown) =>
  meta === undefined ? console.log(fmt("BEGIN", scope)) : console.log(fmt("BEGIN", scope), meta);

export const logExec = (scope: string, meta?: unknown) =>
  meta === undefined ? console.log(fmt("EXEC", scope)) : console.log(fmt("EXEC", scope), meta);

export const logError = (scope: string, err: unknown, meta?: unknown) =>
  meta === undefined
    ? console.error(fmt("ERROR", scope), err)
    : console.error(fmt("ERROR", scope), err, meta);

export const logEnd = (scope: string, meta?: unknown) =>
  meta === undefined ? console.log(fmt("END", scope)) : console.log(fmt("END", scope), meta);