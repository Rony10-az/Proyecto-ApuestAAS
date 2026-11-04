const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('../src/services/auth.service');

test('verifyPassword acepta la contraseña correcta', () => {
  const hash = hashPassword('Test1234');
  assert.equal(verifyPassword('Test1234', hash), true);
});

test('verifyPassword rechaza una contraseña incorrecta', () => {
  const hash = hashPassword('Test1234');
  assert.equal(verifyPassword('otra-clave', hash), false);
});

test('hashPassword genera un salt distinto en cada llamada', () => {
  const hashA = hashPassword('Test1234');
  const hashB = hashPassword('Test1234');
  assert.notEqual(hashA, hashB);
  assert.equal(verifyPassword('Test1234', hashA), true);
  assert.equal(verifyPassword('Test1234', hashB), true);
});
