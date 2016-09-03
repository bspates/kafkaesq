var Connection = require('./connection');
var api = require('./api');
var parser = require('./parser');
var definitions = require('./definitions');
var types = require('./types');

// Always leave room for the size (int32) at the start of the request
const REQUEST_OFFSET = 4;

module.exports = class Protocol {

  constructor(options, cb) {
    this.client = new Connection(options, cb);
    this.options = options;
  }

  send(data, apiDef, buffer, offset, cb) {
    var startOffset = offset;

    offset = parser.encode({
      apiKey: definitions.getApiKey(apiDef.name),
      version: apiDef.version,
      correlationId: this.client.requests.length,
      clientId: this.options.clientId
    }, api.Header.request, buffer, offset + REQUEST_OFFSET);

    offset = parser.encode(
      data,
      apiDef.request,
      buffer,
      offset);

    // Add size to begining of buffer
    types.encodeInt32(offset, buffer, startOffset);
    this.client.send(buffer.slice(startOffset, offset), (err, data) => {
      var offset = 0;
      var result;
      [result, offset] = parser.decode(apiDef.response, data, offset);
      cb(null, result);
    });
  }

  metadata(topics, cb) {
    var buffer = Buffer.alloc(64);
    this.send(topics, api.Metadata, buffer, 0, cb);
  }

  produce(topics, cb) {
    var buffer = new Buffer(1028);
    var request = {
      acks: this.options.acks,
      timeout: this.options.timeout,
      topics: topics
    }
    this.send(request, api.Produce, buffer, 0, cb);
  }
};
