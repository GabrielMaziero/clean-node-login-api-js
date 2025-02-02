const RedisBuilderSingleton = require('./builders/singletons/redis-builder-singleton');

const RedisDirector = require('./builders/redis-director');

module.exports = {
  setClient(host, port) {
    const { client } = new RedisDirector().construct(
      RedisBuilderSingleton.getInstance(host, port),
    );
    this.client = client;
  },

  getClient() {
    return this.client;
  },

  disconnect() {
    this.client.quit();
  },
};
