const { MongoNotConnectedError, MongoServerClosedError } = require('mongodb');
const NoError = require('./errors/no-error');
const MongoDirector = require('../../../src/infra/helpers/builders/mongo-director');

const SutFactory = require('./factory-methods/mongo-helper-sut-factory');

const {
  MONGO_ATTEMPTS_TO_RETRY,
  MONGO_FAKE_URI,
  MONGO_FAKE_DATABASE_NAME,
  MONGO_HELPER_WITH_EMPTY_ARGS_SUT,
  MONGO_HELPER_WITH_ARGS_SUT,
} = require('./constants');

jest.mock('../../../src/infra/helpers/builders/mongo-director');

const getError = async call => {
  try {
    await call();

    throw new NoError();
  } catch (error) {
    return error;
  }
};

describe('Mongo Helper', () => {
  beforeAll(() => {
    process.env.MONGO_CONNECT_RETRY = '2';
    process.env.MONGO_DISCONNECT_RETRY = '2';
  });

  beforeEach(() => {
    MongoDirector.mockImplementation(() => {
      return {
        construct: async _builder => {
          return {
            client: {
              close: jest.fn(),
            },
            db: {},
          };
        },
      };
    });
  });

  it('Should set retryConnect property with default env value when args dependency is not provided', () => {
    const { sut } = new SutFactory().create();
    expect(sut.retryConnect).toBe(
      parseInt((process.env.MONGO_CONNECT_RETRY = '2'), 10),
    );
  });

  it('Should set retryDisconnect property with default env value when args dependency is not provided', () => {
    const { sut } = new SutFactory().create();
    expect(sut.retryDisconnect).toBe(
      parseInt((process.env.MONGO_DISCONNECT_RETRY = '2'), 10),
    );
  });

  it('Should set retryConnect property with default env value when args dependency is an empty object', () => {
    const { sut } = new SutFactory().create(MONGO_HELPER_WITH_EMPTY_ARGS_SUT);
    expect(sut.retryConnect).toBe(
      parseInt((process.env.MONGO_CONNECT_RETRY = '2'), 10),
    );
  });

  it('Should set retryDisconnect property with default env value when args dependency is an empty object', () => {
    const { sut } = new SutFactory().create(MONGO_HELPER_WITH_EMPTY_ARGS_SUT);
    expect(sut.retryDisconnect).toBe(
      parseInt((process.env.MONGO_DISCONNECT_RETRY = '2'), 10),
    );
  });

  it('Should set retryConnect property with correct value when args dependency is provided', () => {
    const { sut } = new SutFactory().create(MONGO_HELPER_WITH_ARGS_SUT);
    expect(sut.retryConnect).toBe(MONGO_ATTEMPTS_TO_RETRY);
  });

  it('Should set retryDisconnect property with correct value when args dependency is provided', () => {
    const { sut } = new SutFactory().create(MONGO_HELPER_WITH_ARGS_SUT);
    expect(sut.retryDisconnect).toBe(MONGO_ATTEMPTS_TO_RETRY);
  });

  it('Should build client and db if connect was called with success', async () => {
    const { sut } = new SutFactory().create(MONGO_HELPER_WITH_ARGS_SUT);
    const connectionError = await getError(async () =>
      sut.connect(MONGO_FAKE_URI, MONGO_FAKE_DATABASE_NAME),
    );
    const disconnectionError = await getError(async () => sut.disconnect());
    expect(connectionError).toEqual(new NoError());
    expect(disconnectionError).toEqual(new NoError());
    expect(sut.client).toHaveProperty('close');
    expect(sut.db).toEqual({});
  });

  it('Should build client and db if connect was called with success after first retry attempt', async () => {
    MongoDirector.mockImplementationOnce(() => {
      return {
        construct: async _builder => {
          throw new Error();
        },
      };
    }).mockImplementationOnce(() => {
      return {
        construct: async _builder => {
          return {
            client: {
              close: jest.fn(),
            },
            db: {},
          };
        },
      };
    });
    const { sut } = new SutFactory().create();
    const { retryConnect } = sut;
    const { retryDisconnect } = sut;
    const connectionError = await getError(async () =>
      sut.connect(MONGO_FAKE_URI, MONGO_FAKE_DATABASE_NAME),
    );
    const disconnectionError = await getError(async () => sut.disconnect());
    expect(connectionError).toEqual(new NoError());
    expect(disconnectionError).toEqual(new NoError());
    expect(retryConnect).toBe(parseInt(process.env.MONGO_CONNECT_RETRY, 10));
    expect(retryDisconnect).toBe(
      parseInt(process.env.MONGO_DISCONNECT_RETRY, 10),
    );
    expect(sut.retryConnect).toBe(
      parseInt(process.env.MONGO_CONNECT_RETRY, 10) - 1,
    );
    expect(sut.retryDisconnect).toBe(
      parseInt(process.env.MONGO_DISCONNECT_RETRY, 10),
    );
    expect(sut.client).toHaveProperty('close');
    expect(sut.db).toEqual({});
  });

  it('Should call client close method in disconnect after connect was called with success', async () => {
    const { sut } = new SutFactory().create(MONGO_HELPER_WITH_ARGS_SUT);
    const connectionError = await getError(async () =>
      sut.connect(MONGO_FAKE_URI, MONGO_FAKE_DATABASE_NAME),
    );
    const disconnectionError = await getError(async () => sut.disconnect());
    expect(connectionError).toEqual(new NoError());
    expect(disconnectionError).toEqual(new NoError());
    expect(sut.client).toHaveProperty('close');
    expect(sut.client.close).toHaveBeenCalled();
  });

  it('Should call client close method in disconnect after close retry failed once', async () => {
    MongoDirector.mockImplementation(() => {
      return {
        construct: async _builder => {
          return {
            client: {
              close: jest
                .fn()
                .mockImplementationOnce(() => {
                  throw new Error();
                })
                .mockImplementationOnce(() => {}),
            },
            db: {},
          };
        },
      };
    });
    const { sut } = new SutFactory().create();
    const { retryConnect } = sut;
    const { retryDisconnect } = sut;
    const connectionError = await getError(async () =>
      sut.connect(MONGO_FAKE_URI, MONGO_FAKE_DATABASE_NAME),
    );
    const disconnectionError = await getError(async () => sut.disconnect());
    expect(connectionError).toEqual(new NoError());
    expect(disconnectionError).toEqual(new NoError());
    expect(retryConnect).toBe(parseInt(process.env.MONGO_CONNECT_RETRY, 10));
    expect(retryDisconnect).toBe(
      parseInt(process.env.MONGO_DISCONNECT_RETRY, 10),
    );
    expect(sut.retryConnect).toBe(
      parseInt(process.env.MONGO_CONNECT_RETRY, 10),
    );
    expect(sut.retryDisconnect).toBe(
      parseInt(process.env.MONGO_DISCONNECT_RETRY, 10) - 1,
    );
    expect(sut.client).toHaveProperty('close');
    expect(sut.client.close).toHaveBeenCalled();
  });

  it('Should throw MongoNotConnectedError if connection retry fails', async () => {
    MongoDirector.mockImplementation(() => {
      return {
        construct: async _builder => {
          throw new Error();
        },
      };
    });
    const { sut } = new SutFactory().create();
    const { retryConnect } = sut;
    const { retryDisconnect } = sut;
    const connectionError = await getError(async () =>
      sut.connect(MONGO_FAKE_URI, MONGO_FAKE_DATABASE_NAME),
    );
    expect(retryConnect).toBe(parseInt(process.env.MONGO_CONNECT_RETRY, 10));
    expect(retryDisconnect).toBe(
      parseInt(process.env.MONGO_DISCONNECT_RETRY, 10),
    );
    expect(sut.retryConnect).toBe(0);
    expect(sut.retryDisconnect).toBe(
      parseInt(process.env.MONGO_DISCONNECT_RETRY, 10),
    );
    expect(connectionError).toEqual(
      new MongoNotConnectedError('Not possible to connect to MongoDB Driver'),
    );
  });

  it('Should throw MongoServerClosedError if disconnection retry fails', async () => {
    MongoDirector.mockImplementation(() => {
      return {
        construct: async _builder => {
          return {
            client: {
              close: jest.fn().mockImplementation(() => {
                throw new Error();
              }),
            },
            db: {},
          };
        },
      };
    });
    const { sut } = new SutFactory().create();
    const { retryConnect } = sut;
    const { retryDisconnect } = sut;
    const connectionError = await getError(async () =>
      sut.connect(MONGO_FAKE_URI, MONGO_FAKE_DATABASE_NAME),
    );
    const disconnectionError = await getError(async () => sut.disconnect());
    expect(connectionError).toEqual(new NoError());
    expect(retryConnect).toBe(parseInt(process.env.MONGO_CONNECT_RETRY, 10));
    expect(retryDisconnect).toBe(
      parseInt(process.env.MONGO_DISCONNECT_RETRY, 10),
    );
    expect(sut.retryConnect).toBe(
      parseInt(process.env.MONGO_DISCONNECT_RETRY, 10),
    );
    expect(sut.retryDisconnect).toBe(0);
    expect(disconnectionError).toEqual(
      new MongoServerClosedError('Not possible to close MongoDB Driver'),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
