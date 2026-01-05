'use strict';

const Bravia = require('../lib/bravia');

module.exports = (RED) => {
  class BraviaIrccNode {
    constructor(config) {
      RED.nodes.createNode(this, config);

      this.tv = RED.nodes.getNode(config.tv);
      this.ircc = config.ircc;
      this.name = config.name;

      this.on('input', async (msg) => {
        if (!this.tv) {
          this.error('No TV configured');
          return;
        }

        let codes = this.ircc || msg.payload;
        if (!codes) {
          this.error('No IRCC code given. Specify either in the config or via msg.payload!');
          return;
        }

        if (typeof codes === 'string') {
          codes = codes.split(',');
        }

        this.status({ fill: 'blue', shape: 'dot', text: 'Sending...' });
        try {
          await this.tv.sendIRCC(codes);
          this.send(msg);
          this.status({ fill: 'green', shape: 'dot', text: 'Successful' });
        } catch (error) {
          this.error(error, msg);
          this.status({ fill: 'red', shape: 'dot', text: 'Failed' });
        }
        setTimeout(() => this.status({}), 3000);
      });
    }
  }

  RED.nodes.registerType('bravia-ircc', BraviaIrccNode);

  RED.httpAdmin.get('/bravia/ircc', async (req, res) => {
    const { host, port, psk } = req.query;
    if (!host || !port || !psk) {
      return res.status(500).send('Missing arguments.');
    }

    try {
      const bravia = new Bravia(host, port, psk);
      const commands = await bravia.getIRCCCodes();
      res.json(commands);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
};
