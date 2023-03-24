/**
 * Runs Live tests on a Dongle Instance
 *
 * This test requires an actual Dongle to be present.
 * The test runner will have already connected to the dongle and
 * run Dongle.initialize() before we get here
 *
 * @type       {Function}
 */

import chai from 'chai';
const expect = chai.expect;

describe('Dongle Tests', function() {

  // runs before any of the tests in this group
  before(async function() {
    //...
  });


  // runs before any of the tests in this group
  after(async function() {
    //...
  });


  it('Returns valid data from readDongleInfo()', async function() {

    this.timeout(5000).slow(2000);

    let info = await this.device.readDongleInfo();

    this.logger.info('readDongleInfo %O', info);

    expect(info).to.be.an('object');
    expect(info.model).to.be.a('string');
    expect(info.model.substr(0, 2)).to.equal('CS');
    expect(info.serial).to.be.a('string');
    expect(info.fw).to.be.a('string');
    expect(info.sw).to.be.a('string');
    expect(info.mfr).to.be.a('string');
    expect(info.product).to.be.a('string');

  });

  it('Returns valid data from readInterface()', async function() {

    let info = await this.device.readInterface();

    this.logger.info('readInterface %O', info);

    expect(info).to.be.an('object');
    expect(info.mode).to.be.a('string');
    expect(info.protocol).to.be.a('string');
    // expect(info.config).to.be.a('object');
    expect(info.status).to.be.a('object');

  });

  it('Returns valid softwareVersion', async function() {

    let info = this.device.softwareRevision;

    this.logger.info('softwareVersion %O', info);

    expect(info).to.be.an('object');

    expect(info.string).to.be.a('string');
    expect('info.string').to.have.length.above(0);

    expect(info.bytes).to.be.an('object');
    expect(info.bytes).to.have.keys(['major', 'minor', 'patch']);

    expect(info.scalar).to.be.a('number');

    expect(info.scalar).to.equal(info.bytes.major * 65536 + info.bytes.minor * 256 + info.bytes.patch);
  });


  it('Reads and writes the flash page (potentially destructive)', async function() {
    let result;

    this.timeout(10000);

    let page = Buffer.alloc(128).fill(0);

    let original = await this.device.readObject(this.device.ID, 0);

    result = await this.device.writeObject(this.device.ID, 0, page);

    expect(result).to.equal(0);

    result = await this.device.readObject(this.device.ID, 0);

    expect(result).to.be.an('array');

    expect(Buffer.from(result)).to.deep.equal(page);

    page = Buffer.alloc(128).fill(0x55);

    result = await this.device.writeObject(this.device.ID, 0, page);


    result = await this.device.readObject(this.device.ID, 0);

    expect(result).to.be.an('array');

    expect(Buffer.from(result)).to.deep.equal(page);

    result = await this.device.writeObject(this.device.ID, 0, original)

    expect(result).to.equal(0);

    result = await this.device.readObject(this.device.ID, 0);
    expect(result).to.be.an('array');

    expect(result).to.deep.equal(original);

  });


  describe('OP_CONFIGURE Command', function() {

    it('Rejects a badly formed command', async function() {

      let response = await this.device.command(this.device.ID, 0x00, [1]);

      expect(response).to.be.an('array');
      expect(response[1]).to.not.equal(0);

    });


  });
});
