/* eslint-disable max-classes-per-file */

// Receber o bearer token - (accessToken)
// Verificar o bearer token é válido
// Pegar o id de usuário dentro do bearer token
// Verificar se o usuário existe
// Setar o accessToken como nulo a partir do ID

require('../../../src/main/bootstrap');

const faker = require('faker');

const MongoHelper = require('../../../src/infra/helpers/mongo-helper');

const SutFactory = require('../helpers/factory-methods/load-user-by-id-repository-sut-factory');

let db;

describe('LoadUserById Repository', () => {
  process.env.MONGO_CONNECT_RETRY = '2';
  process.env.MONGO_DISCONNECT_RETRY = '2';

  const mongoHelper = MongoHelper;

  beforeAll(async () => {
    await mongoHelper.connect(
      process.env.MONGO_URL,
      process.env.MONGO_INITDB_DATABASE,
    );
    db = mongoHelper.getDb();
  });

  beforeEach(async () => {
    await db.collection('users').deleteMany();
  });

  it('Should return user if an user is found', async () => {
    const fakeEmail = faker.internet.email();
    const fakePassword = faker.internet.password(10, true);
    const { sut, userModel } = new SutFactory(db).create();
    const fakeUserInsert = await userModel.insertOne({
      email: fakeEmail,
      password: fakePassword,
    });
    const fakeUserfound = await userModel.findOne({
      _id: fakeUserInsert.insertedId,
    });
    const user = await sut.load(fakeUserInsert.insertedId);
    expect(user).toEqual(fakeUserfound);
  });

  afterAll(async () => {
    await mongoHelper.disconnect();
  });
});
