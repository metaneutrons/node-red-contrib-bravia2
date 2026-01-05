'use strict';

const dgram = require('dgram');
const { XMLParser } = require('fast-xml-parser');
const ServiceProtocol = require('./service-protocol');

const xmlParser = new XMLParser();

const SSDP_ADDRESS = '239.255.255.250';
const SSDP_PORT = 1900;
const SSDP_SERVICE_TYPE = 'urn:schemas-sony-com:service:IRCC:1';
const SERVICE_PROTOCOLS = [
  'accessControl', 'appControl', 'audio', 'avContent', 'browser',
  'cec', 'encryption', 'guide', 'recording', 'system', 'videoScreen',
];
const DEFAULT_DELAY = 350;

class Bravia {
  constructor(host, port = 80, psk = '0000', timeout = 5000) {
    this.host = host;
    this.port = port;
    this.psk = psk;
    this.timeout = timeout;
    this.protocols = SERVICE_PROTOCOLS;
    this.delay = DEFAULT_DELAY;
    this._url = `http://${this.host}:${this.port}/sony`;
    this._codes = null;

    for (const protocol of SERVICE_PROTOCOLS) {
      this[protocol] = new ServiceProtocol(this, protocol);
    }
  }

  static discover(timeout = 3000) {
    return new Promise((resolve) => {
      const socket = dgram.createSocket('udp4');
      const discovered = new Map();

      const message = Buffer.from(
        `M-SEARCH * HTTP/1.1\r\nHOST: ${SSDP_ADDRESS}:${SSDP_PORT}\r\nMAN: "ssdp:discover"\r\nMX: 1\r\nST: ${SSDP_SERVICE_TYPE}\r\n\r\n`
      );

      socket.on('message', async (msg) => {
        const response = msg.toString();
        const locationMatch = response.match(/LOCATION:\s*(.+)\r\n/i);
        if (!locationMatch) return;

        const location = locationMatch[1].trim();
        if (discovered.has(location)) return;
        discovered.set(location, true);

        try {
          const res = await fetch(location);
          const result = xmlParser.parse(await res.text());
          const device = result.root.device;
          if (!device.serviceList) return;

          const services = [].concat(device.serviceList.service);
          const service = services.find((s) => s.serviceType === SSDP_SERVICE_TYPE);
          if (!service) return;

          const url = new URL(service.controlURL);
          discovered.set(location, {
            host: url.hostname,
            port: url.port || 80,
            friendlyName: device.friendlyName,
            manufacturer: device.manufacturer,
            manufacturerURL: device.manufacturerURL,
            modelName: device.modelName,
            UDN: device.UDN,
          });
        } catch {
          // Ignore malformed responses
        }
      });

      socket.bind(() => {
        socket.send(message, 0, message.length, SSDP_PORT, SSDP_ADDRESS);
      });

      setTimeout(() => {
        socket.close();
        resolve([...discovered.values()].filter((v) => typeof v === 'object'));
      }, timeout);
    });
  }

  async getIRCCCodes() {
    if (!this._codes) {
      this._codes = await this.system.invoke('getRemoteControllerInfo');
    }
    return this._codes;
  }

  async send(codes) {
    const codeList = typeof codes === 'string' ? [codes] : codes;

    for (const code of codeList) {
      let irccCode = code;
      if (!/^[A]{5}[a-zA-Z0-9]{13}[=]{2}$/.test(code)) {
        const irccCodes = await this.getIRCCCodes();
        const found = irccCodes.find((c) => c.name === code);
        if (!found) throw new Error(`Unknown IRCC code: ${code}`);
        irccCode = found.value;
      }

      await this._sendIRCC(irccCode);
      await new Promise((r) => setTimeout(r, this.delay));
    }
  }

  async _sendIRCC(code) {
    const body = `<?xml version="1.0"?>
      <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
        <s:Body>
          <u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1">
            <IRCCCode>${code}</IRCCCode>
          </u:X_SendIRCC>
        </s:Body>
      </s:Envelope>`;

    const res = await fetch(`${this._url}/IRCC`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=UTF-8',
        'SOAPACTION': '"urn:schemas-sony-com:service:IRCC:1#X_SendIRCC"',
        'X-Auth-PSK': this.psk,
      },
      body,
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!res.ok) {
      const text = await res.text();
      try {
        const result = xmlParser.parse(text);
        const errorDesc = result['s:Envelope']['s:Body']['s:Fault'].detail.UPnPError.errorDescription;
        throw new Error(errorDesc);
      } catch {
        throw new Error(`IRCC request failed: ${res.status}`);
      }
    }
  }

  async _requestJson(path, body) {
    const res = await fetch(`${this._url}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-PSK': this.psk,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!res.ok) {
      throw new Error(`Request failed: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }
}

module.exports = Bravia;
