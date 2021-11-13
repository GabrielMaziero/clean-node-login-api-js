const bcrypt = require('bcrypt')

const MissingParamError = require('../../src/utils/errors/missing-param-error')

const Encrypter = require('../../src/utils/encrypter')

const FAKE_GENERIC_PASSWORD = 'any_password'
const FAKE_HASHED_PASSWORD = 'hashed_password'
const FAKE_WRONG_HASHED_PASSWORD = 'wrong_hashed_password'

const createSutFactory = () => {
  const sut = new Encrypter()
  return { sut }
}

describe('Encrypter', () => {
  it('Should call bcrypt with correct values', async () => {
    const { sut } = createSutFactory()
    await sut.compare(FAKE_GENERIC_PASSWORD, FAKE_HASHED_PASSWORD)
    expect(bcrypt.value).toBe(FAKE_GENERIC_PASSWORD)
    expect(bcrypt.hashValue).toBe(FAKE_HASHED_PASSWORD)
  })

  it('Should return "true" if bcrypt returns "true"', async () => {
    const { sut } = createSutFactory()
    const isValid = await sut.compare(FAKE_GENERIC_PASSWORD, FAKE_HASHED_PASSWORD)
    expect(isValid).toBe(true)
  })

  it('Should return "false" if bcrypt returns "false"', async () => {
    bcrypt.isValid = false
    const { sut } = createSutFactory()
    const isValid = await sut.compare(FAKE_GENERIC_PASSWORD, FAKE_WRONG_HASHED_PASSWORD)
    expect(isValid).toBe(false)
  })

  it('Should throw MissingParamError if no value is not provided', () => {
    const { sut } = createSutFactory()
    const promise = sut.compare(undefined, FAKE_HASHED_PASSWORD)
    expect(promise).rejects.toThrow(new MissingParamError('value'))
  })
})
