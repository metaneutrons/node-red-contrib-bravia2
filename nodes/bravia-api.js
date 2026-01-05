'use strict';

const Bravia = require('../lib/bravia');

module.exports = (RED) => {
  class BraviaApiNode {
    constructor(config) {
      RED.nodes.createNode(this, config);

      this.tv = RED.nodes.getNode(config.tv);
      this.method = config.method;
      this.payload = config.payload;
      this.name = config.name;

      this.on('input', async (msg) => {
        if (!this.tv) {
          this.error('No TV configured');
          return;
        }

        const method = this.method || msg.method;
        if (!method) {
          this.error('No method given. Specify either in the config or via msg.method!');
          return;
        }

        const parts = method.split(':');
        if (parts.length !== 3) {
          this.error(`Invalid method string "${method}". It must be in the format "protocol:version:method."`);
          return;
        }

        let payload = this.payload || msg.payload;
        if (payload && typeof payload === 'string') {
          try {
            payload = JSON.parse(payload);
          } catch {
            this.error(`Invalid JSON payload: ${payload}`);
            return;
          }
        }

        this.status({ fill: 'blue', shape: 'dot', text: 'Invoking...' });
        try {
          const response = await this.tv.invoke(parts[0], parts[2], parts[1], payload);
          msg.payload = response;
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

  RED.nodes.registerType('bravia-api', BraviaApiNode);

  RED.httpAdmin.get('/bravia/methods', async (req, res) => {
    const { host, port, psk } = req.query;
    if (!host || !port || !psk) {
      return res.status(500).send('Missing arguments.');
    }

    const bravia = new Bravia(host, port, psk);
    const methods = [];

    for (const protocol of bravia.protocols) {
      try {
        const results = await bravia[protocol].getMethodTypes();
        methods.push({ protocol, versions: results });
      } catch {
        // Skip protocols that fail
      }
    }

    if (methods.length > 0) {
      res.json(methods);
    } else {
      res.status(500).send('Error getting methods, check the connection to your TV.');
    }
  });

  RED.httpAdmin.get('/bravia/method', async (req, res) => {
    const { host, port, psk, protocol, version, method } = req.query;
    if (!host || !port || !psk || !protocol || !version || !method) {
      return res.status(500).send('Missing arguments.');
    }

    try {
      const bravia = new Bravia(host, port, psk);
      const versionData = await bravia[protocol].getMethodTypes(version);
      const methodData = versionData.methods.find((m) => m[0] === method);
      res.json(methodData);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
};
