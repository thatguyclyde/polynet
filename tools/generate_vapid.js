import crypto from 'crypto'

// Use ECDH to generate a P-256 keypair and output base64url strings
const ecdh = crypto.createECDH('prime256v1')
ecdh.generateKeys()
const pub = ecdh.getPublicKey() // uncompressed (65 bytes, 0x04 + X + Y)
const priv = ecdh.getPrivateKey() // 32 bytes

const toBase64Url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'')

console.log('VAPID_PUBLIC_KEY=' + toBase64Url(pub))
console.log('VAPID_PRIVATE_KEY=' + toBase64Url(priv))
