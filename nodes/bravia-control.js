'use strict';

module.exports = (RED) => {
  class BraviaControlNode {
    constructor(config) {
      RED.nodes.createNode(this, config);

      this.tv = RED.nodes.getNode(config.tv);
      this.pollingEnabled = config.polling === true;
      this.pollVolume = config.pollVolume;
      this.pollInput = config.pollInput;
      this.interval = config.interval || 10;
      this.intervalUnit = config.intervalUnit || 'seconds';
      this.pollAfterCommand = config.pollAfterCommand !== false;
      this.outputMode = config.outputMode || 'change';
      this.name = config.name;
      this.wires = config.wires || [];

      this.polling = false;
      this.timer = null;
      this.lastState = null;

      if (!this.tv) {
        this.status({ fill: 'red', shape: 'ring', text: 'no TV configured' });
        return;
      }

      this.on('input', (msg) => this.handleInput(msg));
      this.on('close', () => this.cleanup());

      const hasOutput = this.wires.length > 0 && this.wires[0].length > 0;
      if (this.pollingEnabled && hasOutput) {
        this.startPolling();
        this.poll();
      }
    }

    getIntervalMs() {
      const multipliers = { seconds: 1000, minutes: 60000, hours: 3600000 };
      const interval = parseInt(this.interval, 10) || 0;
      return interval * (multipliers[this.intervalUnit] || 1000);
    }

    startPolling() {
      const ms = this.getIntervalMs();
      if (ms === 0) return;

      this.timer = setInterval(() => {
        if (this.polling) return;
        this.poll();
      }, ms);
    }

    cleanup() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }

    parseInput(uri) {
      if (!uri) return null;
      const match = uri.match(/extInput:(\w+)\?port=(\d+)/);
      return match ? `${match[1]}${match[2]}` : null;
    }

    buildInputUri(input) {
      const match = input.match(/^(\w+)(\d+)$/);
      return match ? `extInput:${match[1]}?port=${match[2]}` : null;
    }

    updateStatus(state) {
      if (!state) {
        this.status({ fill: 'red', shape: 'ring', text: 'error' });
        return;
      }
      if (!state.power) {
        this.status({ fill: 'grey', shape: 'ring', text: 'power: standby' });
        return;
      }
      const parts = ['power: on'];
      if (state.volume !== undefined) parts.push(`vol: ${state.volume}${state.mute ? ' (mute)' : ''}`);
      if (state.input !== undefined) parts.push(`input: ${state.input}`);
      this.status({ fill: 'green', shape: 'dot', text: parts.join(' | ') });
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
      if (this.polling) return;
      this.polling = true;

      try {
        const state = {};

        const powerRes = await this.tv.bravia.system.invoke('getPowerStatus');
        state.power = powerRes.status === 'active';

        if (state.power) {
          if (this.pollVolume) {
            try {
              const volRes = await this.tv.bravia.audio.invoke('getVolumeInformation');
              state.volume = volRes[0].volume;
              state.mute = volRes[0].mute;
            } catch { /* ignore */ }
          }

          if (this.pollInput) {
            try {
              const playRes = await this.tv.bravia.avContent.invoke('getPlayingContentInfo');
              state.input = this.parseInput(playRes.uri);
            } catch (e) {
              if (e.message.includes('Illegal State') || e.message.includes('code: 7')) {
                state.input = 'app';
              }
            }
          }
        }

        if (this.outputMode === 'change') {
          if (JSON.stringify(state) === JSON.stringify(this.lastState)) {
            this.updateStatus(state);
            this.polling = false;
            return;
          }
        }

        this.lastState = state;
        this.updateStatus(state);
        this.send({ payload: state });

      } catch (error) {
        const err = this.formatError(error);
        if (err.type === 'timeout') {
          const intervalSec = Math.round(this.getIntervalMs() / 1000);
          this.status({ fill: 'red', shape: 'ring', text: `not connected (retry ${intervalSec}s)` });
        } else {
          this.status({ fill: 'red', shape: 'dot', text: err.text });
        }
      } finally {
        this.polling = false;
      }
    }

    async handleInput(msg) {
      const cmd = msg.payload;

      if (cmd === true || (typeof cmd === 'object' && Object.keys(cmd).length === 0)) {
        await this.poll();
        return;
      }

      if (typeof cmd !== 'object') return;

      try {
        if (cmd.power !== undefined) {
          await this.tv.bravia.system.invoke('setPowerStatus', '1.0', { status: cmd.power });
          if (cmd.power) await this.sleep(3000);
        }

        if (cmd.volume !== undefined) {
          await this.tv.bravia.audio.invoke('setAudioVolume', '1.0', {
            target: 'speaker',
            volume: String(cmd.volume),
          });
        }

        if (cmd.mute !== undefined) {
          await this.tv.bravia.audio.invoke('setAudioMute', '1.0', { status: cmd.mute });
        }

        if (cmd.input !== undefined) {
          const uri = this.buildInputUri(cmd.input);
          if (uri) {
            await this.tv.bravia.avContent.invoke('setPlayContent', '1.0', { uri });
          }
        }

        if (this.pollAfterCommand) {
          await this.sleep(500);
          await this.poll();
        }

      } catch (error) {
        this.error(error, msg);
        this.status({ fill: 'red', shape: 'dot', text: 'command failed' });
        setTimeout(() => this.updateStatus(this.lastState), 3000);
      }
    }

    sleep(ms) {
      return new Promise((r) => setTimeout(r, ms));
    }
  }

  RED.nodes.registerType('bravia-control', BraviaControlNode);
};
