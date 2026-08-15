import test from 'node:test'
import assert from 'node:assert/strict'

import { isExpiredAuthError } from './authRecovery.js'

test('detects JWT expiry from Supabase auth errors', () => {
  assert.equal(isExpiredAuthError({ code: 'PGRST303', message: 'JWT expired' }), true)
  assert.equal(isExpiredAuthError({ status: 401, message: 'Unauthorized' }), true)
  assert.equal(isExpiredAuthError({ message: 'database error' }), false)
})
