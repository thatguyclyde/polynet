// Convert hex VAPID keys to base64url
const pub = '46f8269f76dbc955c5f40c7085c7e56de60dcd61d6364d505335e6c01b8e1bdb'
const priv = 'e1d35ec4a98f336f080105db4f6eee788011748200b43105e8afce235ac325f0'
function toB64u(hex) {
  return Buffer.from(hex, 'hex').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
console.log('VAPID_PUBLIC_KEY=' + toB64u(pub))
console.log('VAPID_PRIVATE_KEY=' + toB64u(priv))
