const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateEnrollmentCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

function generateCertificateCode() {
  return `MEL-${generateEnrollmentCode(4)}-${generateEnrollmentCode(4)}`;
}

module.exports = { generateEnrollmentCode, generateCertificateCode };
