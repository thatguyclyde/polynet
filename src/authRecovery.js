export function isExpiredAuthError(error) {
  if (!error) return false

  const message = String(error.message || '').toLowerCase()
  const code = String(error.code || '').toLowerCase()
  const status = Number(error.status || error.statusCode || 0)

  return (
    code === 'pgrst303' ||
    code === 'jwt_expired' ||
    status === 401 ||
    message.includes('jwt expired') ||
    message.includes('expired token') ||
    message.includes('unauthorized') ||
    message.includes('invalid jwt')
  )
}

export async function recoverExpiredSession(supabaseClient) {
  if (!supabaseClient?.auth) return false

  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession()

    if (error && isExpiredAuthError(error)) {
      await supabaseClient.auth.signOut({ scope: 'global' })
      return true
    }

    if (!session) {
      await supabaseClient.auth.signOut({ scope: 'global' })
      return true
    }

    return false
  } catch (error) {
    if (isExpiredAuthError(error)) {
      await supabaseClient.auth.signOut({ scope: 'global' })
      return true
    }

    return false
  }
}
