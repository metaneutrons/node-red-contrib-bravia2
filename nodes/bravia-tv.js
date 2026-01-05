'use strict';

const Bravia = require('../lib/bravia');

module.exports = (RED) => {
  class BraviaTvNode {
    constructor(config) {
      RED.nodes.createNode(this, config);

      this.name = config.name;
      this.host = config.host;
      this.port = config.port;
      this.psk = config.psk;
      this.timeout = parseInt(config.timeout, 10) || 2000;

      if (this.host && this.port && this.psk) {
        this.bravia = new Bravia(this.host, this.port, this.psk, this.timeout);
      }
    }

    async invoke(protocol, method, version, payload) {
      if (!this.bravia) {
        throw new Error('The Sony BRAVIA TV is not configured properly, please check your settings.');
      }
      return this.bravia[protocol].invoke(method, version, payload);
    }

    async sendIRCC(codes) {
      if (!this.bravia) {
        throw new Error('The Sony BRAVIA TV is not configured properly, please check your settings.');
      }
      return this.bravia.send(codes);
    }
  }

  RED.nodes.registerType('bravia-tv', BraviaTvNode);

  RED.httpAdmin.get('/bravia/discover', async (req, res) => {
    try {
      const devices = await Bravia.discover();
      res.json(devices);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
};
