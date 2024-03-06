const { RSocketServer, RSocketError } = require('rsocket-core');
const RSocketTCPServer = require('rsocket-tcp-server');
const { Single } = require('rsocket-flowable');

const TcpTransport = RSocketTCPServer.default;
const host = '127.0.0.1';
const port = 9090;

const transportOpts = {
  host: host,
  port: port,
};

const transport = new TcpTransport(transportOpts);

const statuses = {
  PENDING: 'pending',
  CANCELLED: 'cancelled',
};

const getRequestHandler = (requestingRSocket, setupPayload) => {
  let counter = 0;
  function handleRequestResponse(payload) {
    let status = statuses.PENDING;

    console.log(`requestResponse request`, payload);

    return new Single((subscriber) => {
      function handleCancellation() {
        status = statuses.CANCELLED;
      }

      subscriber.onSubscribe(() => handleCancellation());

      /**
       * Leverage `setTimeout` to simulate a delay
       * in responding to the client.
       */
      setTimeout(() => {
        if (status === statuses.CANCELLED) {
          return;
        }

        const msg = `${new Date()}`;
        console.log(`requestResponse response`, msg);
        try {
          if (counter++ % 2 === 0) {
            const error = new RSocketError(1234, 'Custom Error');
            // const error = new Error('My Error');
            throw error;
          }
          subscriber.onComplete({
            data: msg,
            metadata: null, // or new Buffer(...)
          });
        } catch (e) {
          subscriber.onError(e);
        }
      }, 100);
    });
  }

  return {
    requestResponse: handleRequestResponse,
  };
};

const rSocketServer = new RSocketServer({
  transport,
  getRequestHandler,
});

console.log(`Server starting on port ${port}...`);

rSocketServer.start();