/**
 * Test of the lib/Watcher.js class implementation
 *
 *
 */

import chai from 'chai';
import sinon from 'sinon';

const expect = chai.expect;

import { Watcher } from '../../index.js';

describe('Watcher Class', function() {

  it('constructor() with invalid callback should throw', async function() {

    expect(() => new Watcher(1, 0x0203, 4, 4)).to.throw();

  });

  it('constructor() with an invalid mask should throw', async function() {

    let cb = function() {};

    // mask is not an array
    expect(() => new Watcher(1, 0x0203, 4, 1, cb)).to.throw();

    // mask array length not correct
    expect(() => new Watcher(1, 0x0203, 4, [0xFF, 0xFF, 0xFF], cb)).to.throw();

  });

  it('hasMask should indicate if the watcher has a mask', async function() {

    let cb = function() {};

    // no mask
    let w = new Watcher(1, 0x0203, 4, cb);

    expect(w.hasMask).to.equal(false);

    // with a mask
    w = new Watcher(1, 0x0203, 3, [0xFF, 0xFF, 0xFF], cb);

    expect(w.hasMask).to.equal(true);

  });


  it('toArray() method', async function() {

    let watcher = new Watcher(1, 0x0203, 4, function() {});

    let a = watcher.toArray();

    expect(a).to.be.an('array');
    expect(a).to.deep.equal([0x01, 0x02, 0x03, 4]);
  });

  it('toArray() method with mask', async function() {
    let mask = new Array(8).fill(0xFF);

    let watcher = new Watcher(1, 0x0203, 8, mask, function() {});

    let a = watcher.toArray();

    expect(a).to.be.an('array');
    expect(a).to.deep.equal([0x01, 0x02, 0x03, 8, ...mask]);
  });

  it('isEmpty() method', async function() {

    let watcher = new Watcher(-1, 0, 1, function() {});

    expect(watcher.isEmpty()).to.equal(true);

    watcher = new Watcher(255, 0, 1, function() {});

    expect(watcher.isEmpty()).to.equal(false);

  });

  it('handleUpdate() notification', async function() {

    let callback = sinon.spy();
    const testValue = Buffer.from([0x01, 0x02, 0x03, 0x04]);

    // Normal callback
    let watcher = new Watcher(1, 0x0203, 4, callback);

    watcher.handleUpdate({ value: testValue });

    expect(callback.calledOnce).to.equal(true);
    expect(callback.calledWith(testValue, 0x0203, 1));

    // Incorrect length notification
    watcher.handleUpdate({ value: Buffer.from([0x01, 0x02, 0x03]) });
    // spy should not have been called, the update was ignored
    expect(callback.calledOnce).to.equal(true);


  });



});
