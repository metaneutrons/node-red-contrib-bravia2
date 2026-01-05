'use strict';

const Bravia = require('../lib/bravia');

const POLL_METHODS = [
  { value: 'system:1.0:getPowerStatus', label: 'getPowerStatus (power state)' },
  { value: 'audio:1.0:getVolumeInformation', label: 'getVolumeInformation (volume/mute)' },
  { value: 'avContent:1.0:getPlayingContentInfo', label: 'getPlayingContentInfo (current input)' },
  { value: 'avContent:1.0:getCurrentExternalInputsStatus', label: 'getCurrentExternalInputsStatus (HDMI status)' },
];

module.exports = (RED) => {
  class BraviaApiNode {
    constructor(config) {
      RED.nodes.createNode(this, config);

      this.tv = RED.nodes.getNode(config.tv);
      this.method = config.method;
      this.payload = config.payload;
      this.name = config.name;
      this.polling = config.polling || false;
      this.interval = config.interval || 10;
      this.intervalUnit = config.intervalUnit || 'seconds';
      this.outputMode = config.outputMode || 'change';

      this._polling = false;
      this._timer = null;
      this._lastResult = null;

      if (!this.tv) {
        this.status({ fill: 'red', shape: 'ring', text: 'no TV configured' });
        return;
      }

      this.on('input', (msg) => this.handleInput(msg));
      this.on('close', () => this.cleanup());

      if (this.polling && this.method) {
        this.startPolling();
        this.poll();
      }
    }

    getIntervalMs() {
      const multipliers = { seconds: 1000, minutes: 60000, hours: 3600000 };
      return (parseInt(this.interval, 10) || 0) * (multipliers[this.intervalUnit] || 1000);
    }

    startPolling() {
      const ms = this.getIntervalMs();
      if (ms === 0) return;
      this._timer = setInterval(() => {
        if (!this._polling) this.poll();
      }, ms);
    }

    cleanup() {
      if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
    }

    formatError(error) {
      const msg = error.message || 'Unknown error';
      if (msg.includes('timeout') || msg.includes('abort') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED')) {
        return { type: 'timeout', text: msg };
      }
      const codeMatch = msg.match(/code[:\s]+(\d+)/i);
      const code = codeMatch ? codeMatch[1] : null;
      const short = msg.length > 20 ? msg.substring(0, 20) + '...' : msg;
      return { type: 'error', text: code ? `[${code}] ${short}` : short };
    }

    async poll() {
      if (this._polling) return;
      this._polling = true;
      this.status({ fill: 'blue', shape: 'dot', text: 'polling...' });

      try {
        const result = await this.invokeMethod(this.method, this.payload);

        if (this.outputMode === 'change') {
          const resultStr = JSON.stringify(result);
          if (resultStr === JSON.stringify(this._lastResult)) {
            this.status({});
            this._polling = false;
            return;
          }
          this._lastResult = JSON.parse(resultStr);
        }

        this.send({ payload: result });
        this.status({});
      } catch (error) {
        const err = this.formatError(error);
        if (err.type === 'timeout') {
          const intervalSec = Math.round(this.getIntervalMs() / 1000);
          this.status({ fill: 'red', shape: 'ring', text: `timeout (retry ${intervalSec}s)` });
        } else {
          this.status({ fill: 'red', shape: 'dot', text: err.text });
        }
      } finally {
        this._polling = false;
      }
    }

    async invokeMethod(method, payload) {
      const parts = method.split(':');
      if (parts.length !== 3) {
        throw new Error(`Invalid method "${method}". Format: protocol:version:method`);
      }

      let parsedPayload = payload;
      if (parsedPayload && typeof parsedPayload === 'string') {
        parsedPayload = JSON.parse(parsedPayload);
      }

      return this.tv.invoke(parts[0], parts[2], parts[1], parsedPayload);
    }

    async handleInput(msg) {
      const method = this.method || msg.method;
      if (!method) {
        this.error('No method given. Specify in config or via msg.method');
        return;
      }

      const payload = this.payload || msg.payload;

      this.status({ fill: 'blue', shape: 'dot', text: 'invoking...' });
      try {
        const response = await this.invokeMethod(method, payload);
        msg.payload = response;
        this.send(msg);
        this.status({ fill: 'green', shape: 'dot', text: 'success' });
      } catch (error) {
        this.error(error, msg);
        this.status({ fill: 'red', shape: 'dot', text: 'failed' });
      }
      setTimeout(() => this.status({}), 3000);
    }
  }

  RED.nodes.registerType('bravia-api', BraviaApiNode);

  RED.httpAdmin.get('/bravia/methods/pollable', (req, res) => {
    res.json(POLL_METHODS);
  });

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
