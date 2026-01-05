'use strict';

class ServiceProtocol {
  constructor(bravia, protocol) {
    this.bravia = bravia;
    this.protocol = protocol;
    this._methods = null;
  }

  async getVersions() {
    return this.invoke('getVersions');
  }

  async getMethodTypes(version) {
    if (!this._methods) {
      const versions = await this.getVersions();
      this._methods = [];
      for (const v of versions) {
        const results = await this.invoke('getMethodTypes', '1.0', v);
        if (results) {
          this._methods.push({ version: v, methods: results });
        }
      }
    }
    return version ? this._methods.find((m) => m.version === version) : this._methods;
  }

  async invoke(method, version = '1.0', params) {
    const response = await this.bravia._requestJson(`/${this.protocol}`, {
      id: 3,
      method,
      version,
      params: params ? [params] : [],
    });

    if (response.error) {
      const [code, message] = response.error;
      throw new Error(`${message} (code: ${code})`);
    }

    if (response.results) return response.results;
    if (response.result) return response.result[response.result.length > 1 ? 1 : 0];
    return null;
  }
}

module.exports = ServiceProtocol;
