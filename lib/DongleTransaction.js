/**
 * Class which represents the state of a transaction
 *
 * A transaction is basically a single (request/response combo) sent to
 * the slave device.  The PDU (request bytes) are stored in the
 * DongleTransaction along with various state variables.
 *
 * The transaction starts when it is given to the transport to send.
 * The transport will call either .handleResponse() if it gets a response
 * from the slave device, or .handleError() if an error is detected.
 *
 * The DongleTransaction itself sets a timer which catches the case of
 * no response from the slave device (handleTimeout)
 *
 * Status of the transaction is reported to the client, which is
 * designated when the DongleTransaction is created.  This client
 * must have functions for
 * .transactionComplete - when a response has been received (even if it is an exception response)
 * .transactionError - called if an error is detected
 * .transactionTimeout - called if no response is received from the slave device
 * Note that .transactionError() is also called in case of a .transactionTimeout()
 *
 * The client may use the .shouldRetry() and/or .shouldRetryException()
 * functions to decide whether to submit the DongleTransaction to the transport
 * again, or give up.
 *
 * The transaction can be .cancel()-ed, which basically sets a state variable
 * so that the client or transport can use .isCancelled() to make decisions about
 * what to do.
 *
 * When you no longer care about this transaction, you can .destroy() it.
 *
 * @class      DongleTransaction
 */

import Logger from './CsLogger.js';
const logger = new Logger('DongleTransation', false); // second argument=false, disables logging

const DEFAULT_OPTIONS = {
  unit: 0,
  maxRetries: 0,
  timeout: 1,
};

export default class DongleTransaction {

  /**
   * Constructs a new instance.
   *
   * @param      {<type>}  options  The options
   * @param {Array} options.pdu an array of bytes containing the PDU to be sent
   * @param {Object} options.client an object instance containing callback functions for status reporting
   * @param {number} [options.unit]
   * @param {number} [options.timeout]
   * @param {number} [options.maxRetries]
   * @param {function} [options.resolve] function to call on success
   * @param {function} [options.reject] function to call on failure
   */
  constructor(options) {

    this.options = Object.assign({}, DEFAULT_OPTIONS, options);

    // have we been requested to cancel
    this.cancelled = false;

    // how many times have we failed
    this.failures = 0;

    // timer handle
    this.timeoutTimer = null;

  }

  /**
   * Clean up at end of life
   */
  destroy() {

    logger.info('destroy');

    if(this.timeoutTimer !== null) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }

    if(this.options.client) {
      this.options.client = null;
    }

  }

  /**
   * @returns {number}
   */
  getUnit() {
    return this.options.unit;
  }

  getMaxRetries() {
    return this.options.maxRetries;
  }

  getTimeout() {
    return this.options.timeout;
  }

  getRequest() {
    return this.options.pdu;
  }


  /**
   * @param {Array} response bytes
   */
  handleResponse(response) {
    let me = this;

    me.stopTimeout();

    if(Array.isArray(response) && response.length > 1 && response[0] & 0x80) {
      me.failures += 1;
    } else {
      me.failures = 0;
    }

    if(this.options.client) {
      this.options.client.transactionComplete(this, response);
    }
  }

  /**
   * @param {Error} error
   */
  handleError(error) {

    logger.info('handleError', this.failures);
    this.stopTimeout();

    this.failures += 1;

    if(this.options.client) {
      this.options.client.transactionError(this, error);
    }
  }

  /**
   * Starts the transaction
   *
   * The transport calls this, and offers a callback that
   * we use if the transaction times out.
   *
   * @param {function} onTimeout
   */
  start(onTimeout) {
    this.timeoutTimer = setTimeout(
      this.handleTimeout.bind(this, onTimeout),
      this.options.timeout
    );
  }


  /**
   * @returns {boolean} true if we have not exceeded our retries
   */
  shouldRetry() {
    return this.failures <= this.options.maxRetries;
  }

  /**
   * Test whether to retry on an exception
   *
   * @param      {Number}  ex      { parameter_description }
   */
  retryException(ex) {
    return (this.options.retryOnException && this.options.retryOnException.indexOf(ex) > -1);
  }

  cancel() {
    this.cancelled = true;

  }

  isCancelled() {
    return this.cancelled;
  }


  /**
   * @private
   */
  stopTimeout() {
    if(this.timeoutTimer !== null) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  /**
   * @private
   * @param {function} cb
   */
  handleTimeout(cb) {

    logger.info('handleTimeout');

    this.timeoutTimer = null;

    cb();

    if(!this.isCancelled() && this.options.client) {
      this.options.client.transactionTimeout(this);
    }

    this.handleError(new Error('Response Timed Out'));
  }

}
