/**
 * Implements a transport handler that packages up outgoing messages, sends them,
 * and waits for a valid response
 *
 * The transport adds a header (7 bytes) followed by function code and data.
 * It watches for the corresponding response to come back from the slave
 * device, and errors out if no valid response arrives within the timeout.
 *
 * To use this transport, you need to call the .onData() function with
 * incoming bytes from the connection.
 *
 * To initiate a message, use .sendRequest() and give it a Transaction
 * object with the details of the request.
 * The options.client object will be used to report a
 * result ->transactionComplete, ->transactionError, ->transactionTimeout
 *
 * At end of life, call .destroy() to clean up
 */

import Logger from './CsLogger.js';
const logger = new Logger('DongleTransport', false); // second argument=false, disables logging

// A helper class for parsing the header
class IpHeader {
  constructor() {
    this.reset();
  }

  // clear the header
  reset() {
    this.id = -1;
    this.version = -1;
    this.length = -1;
    this.unit = -1;
  }

  // interpret the header bytes
  read(buf) {
    this.id = buf[0] * 256 + buf[1];
    this.version = buf[2] * 256 + buf[3];
    this.length = buf[4] * 256 + buf[5] - 1;
    this.unit = buf[6];
  }

  /**
   * is the header we have valid for the given transaction?
   *
   * @param      {Object}  transaction  The transaction to compare against
   * @return     {null|Error}  null if valid; an Error object otherwise
   */
  validate(transaction) {
    var message;
    var expectedUnit = transaction.getUnit();

    if (this.version !== 0) {
      message = `Invalid version in response header. Expected: 0, got: ${this.version}`;
    } else if (this.length === 0) {
      // eslint-disable-next-line quotes
      message = `Invalid length in response header. Expected: at least 1, got: 0.`;
    } else if (this.unit !== expectedUnit) {
      message = `Invalid unit response header. Expected: ${expectedUnit}, got: ${this.unit}.`;
    }

    return typeof message === 'undefined' ? null : new Error(message);
  }
}

/**
 * This class describes a dongle transport.
 *
 * @class      DongleTransport
 */
export default class DongleTransport {
  /**
   * Constructs a new instance.
   */
  constructor(connection) {
    // collects incoming data until a full message is received
    this.reader = [];

    // decodes the incoming message header
    this.header = new IpHeader();

    // the sequence counter embedded in each outgoing message
    this.nextTransactionId = 0;

    // The list of pending transactions (messages) that are in progress or requested
    this.transactions = {};

    // the connection to which we will write our bytes
    this.connection = connection;
  }

  /**
   * clean up anything we need to at end of life
   */
  destroy() {
    // Fail any pending transactions
    if (this.transactions !== null) {
      Object.keys(this.transactions).forEach(function (id) {
        this.transactions[id].destroy();
      }, this);

      this.transactions = null;
    }
  }

  destroyAllTransactions() {
    if (this.transactions) {
      Object.keys(this.transactions).forEach(function (id) {
        this.transactions[id].destroy();
      }, this);

      this.transactions = {};
    }
  }

  /**
   * Send an outgoing request to the slave
   *
   * @param      {Object}  transaction  The transaction
   */
  sendRequest(transaction) {
    var id = this.getNextTransactionId();
    logger.info('sendRequest', id, transaction);

    var adu = this.buildAdu(id, transaction);

    this.transactions[id] = transaction;

    this.connection.write(adu);

    transaction.start(this.createTimeoutHandler(id));
  }

  /**
   * Handles incoming data
   *
   * This should be called with all incoming bytes from the slave
   *
   * @param      {Array}  data    incoming bytes
   */
  onData(data) {
    logger.info('onData', data);

    if (Array.isArray(data)) {
      this.reader.push(...data);
    }
    logger.info('onData reader', this.reader);

    if (this.header.id === -1 && this.reader.length >= 7) {
      this.header.read(this.reader);
      this.reader.splice(0, 7);
    }

    logger.info('onData header', this.header);
    if (this.header.id !== -1 && this.reader.length >= this.header.length) {
      this.handleFrameData();
    }
  }

  /**
   * Gets the next transaction identifier.
   *
   * @return     {Number}  The next transaction identifier.
   * @private
   */
  getNextTransactionId = function () {
    if (++this.nextTransactionId === 0xffff) {
      this.nextTransactionId = 0;
    }

    return this.nextTransactionId;
  };

  /**
   * Returns the Application Data Unit
   *
   * Given the transport sequence ID and transaction, forms
   * and returns an array containing header and message bytes
   *
   * @param      {Number}  id           The transport sequence #
   * @param      {Object}  transaction  The transaction
   * @return     {Array}  The adu.
   * @private
   */
  buildAdu(id, transaction) {
    var pdu = transaction.getRequest();
    var len = pdu.length + 1;

    return [
      // eslint-disable-next-line no-bitwise
      id >> 8,
      // eslint-disable-next-line no-bitwise
      id & 0xff,
      0,
      0,
      // eslint-disable-next-line no-bitwise
      len >> 8,
      // eslint-disable-next-line no-bitwise
      len & 0xff,
      transaction.getUnit(),
      ...pdu,
    ];
  }

  /**
   * Returns a function that can be called if a timeout occurs for the transaction
   *
   * the function deletes the transaction from our list
   *
   * @param      {<type>}  id      The transport sequence ID
   * @return     {undefined}
   */
  createTimeoutHandler(id) {
    var transactions = this.transactions;

    return function () {
      if (typeof transactions[id] !== 'undefined') {
        logger.info('TIMEOUT ', id);
        delete transactions[id];
      }
    };
  }

  /**
   * Once enough bytes for a header and payload are received, process them
   *
   */
  handleFrameData() {
    logger.info('handleFrameData', this.reader, this.transactions);

    var transaction = this.transactions[this.header.id];

    if (typeof transaction === 'undefined') {
      // we got a response... for a transaction we don't know about.
      // possible that the transaction timed out or was cancelled
      this.skipResponseData();
      this.connection.transactionError(null, new Error('Response for unknown transaction'));
      this.header.reset();
      this.onData();

      return;
    }

    delete this.transactions[this.header.id];

    var validationError = this.header.validate(transaction);

    if (validationError !== null) {
      logger.info('Validation error');
      this.skipResponseData();
      transaction.handleError(validationError);
      this.header.reset();
      this.onData();
      return;
    }

    // remove the response bytes from our buffer
    var response = this.reader.splice(0, this.header.length);

    this.header.reset();

    try {
      logger.info('Completing transaction', this.header.id, this.reader);
      transaction.handleResponse(response);
    } catch (error) {
      transaction.handleError(error);
    }

    this.onData();
  }

  /**
   * Clears the message response data from our reader array
   */
  skipResponseData() {
    logger.info('skipResponseData');
    if (this.header.length > 0) {
      this.reader.splice(0, this.header.length);
    }
  }
}
