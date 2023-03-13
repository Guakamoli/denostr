import debug from 'debug'

export const createLogger = (
  namespace: string,
  options: { enabled?: boolean; stdout?: boolean } = { enabled: false, stdout: false }
) => {
  const prefix = (process.env.WORKER_TYPE || 'primary') as string
  const instance = debug(prefix)
  if (options.enabled) {
    debug.enable(`${prefix}:${namespace}:*`)
  }
  if (options.stdout) {
    instance.log = console.log.bind(console)
  }
  const fn = instance.extend(namespace)

  return fn
}
