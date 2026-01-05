# node-red-contrib-bravia2

[![npm version](https://img.shields.io/npm/v/node-red-contrib-bravia2.svg)](https://www.npmjs.com/package/node-red-contrib-bravia2)
[![npm downloads](https://img.shields.io/npm/dm/node-red-contrib-bravia2.svg)](https://www.npmjs.com/package/node-red-contrib-bravia2)
[![CI](https://github.com/metaneutrons/node-red-contrib-bravia2/actions/workflows/ci.yml/badge.svg)](https://github.com/metaneutrons/node-red-contrib-bravia2/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/node/v/node-red-contrib-bravia2.svg)](https://nodejs.org)
[![License](https://img.shields.io/npm/l/node-red-contrib-bravia2.svg)](https://github.com/metaneutrons/node-red-contrib-bravia2/blob/main/LICENSE)

Node-RED nodes to control Sony BRAVIA Android TVs.

## Features

- **Control Node** - Simple way to control basic TV functions (power, volume, input) with a single compound message
- **API Node** - Full access to the Sony BRAVIA REST API for advanced use cases
- **IRCC Node** - Send remote control commands (power, volume, navigation, etc.)
- **Auto-discovery** - Automatically discover TVs on your network
- **Modern codebase** - Native fetch, async/await, zero vulnerabilities

## Requirements

- Node.js >= 18.0.0
- Node-RED >= 3.0.0
- Sony BRAVIA Android TV with IP Control enabled

## Installation

```bash
npm install node-red-contrib-bravia2
```

Or install via the Node-RED palette manager.

## TV Setup

1. Turn on your TV
2. Go to **Settings > Network > Home network setup > Remote device/Renderer > On**
3. Go to **Settings > Network > Home network setup > IP Control > Authentication > Normal and Pre-Shared Key**
4. Go to **Settings > Network > Home network setup > Remote device/Renderer > Enter Pre-Shared Key** and set your PSK (e.g., `0000`)
5. Go to **Settings > Network > Home network setup > Remote device/Renderer > Simple IP Control > On**

## Nodes

### bravia-tv (Config)

Configuration node for your TV connection. Set the hostname/IP, port (default: 80), and PSK.

### bravia-control

Bidirectional node that polls TV status and accepts commands.

**Polling:** Configurable interval (1s to 1h) with selectable status items:
- Power status (always polled)
- Volume/mute level
- Input source

**Features:**
- Built-in RBE (Report by Exception) - only outputs on change
- Skip-if-busy prevents request pileup

**Input:** `msg.payload` - JSON object with commands:
```json
{"power": true, "volume": 30, "input": "hdmi1"}
```

**Output:** `msg.payload` - Current TV state in same format

### bravia-api

Call any Sony BRAVIA API method directly.

**Input:**
- `msg.method` - Method in format `protocol:version:method` (e.g., `system:1.0:getPowerStatus`)
- `msg.payload` - Optional JSON payload for the method

**Output:** `msg.payload` - API response

### bravia-ircc

Send IRCC (IR-like) commands to control the TV. Commands can be specified by name (e.g., `VolumeUp`, `Home`, `Hdmi1`) or as raw IRCC codes.

**Input:** `msg.payload` - Command name or comma-separated list of commands

## Credits

This project is a modernized fork of [node-red-contrib-bravia](https://github.com/waynehaffenden/node-red-contrib-bravia), originally created by [Wayne Haffenden](https://github.com/waynehaffenden). 

The original implementation provided the foundation for controlling Sony BRAVIA TVs from Node-RED. This fork updates the codebase to modern Node.js standards and removes deprecated dependencies.

## Release Process

This project uses [release-please](https://github.com/googleapis/release-please) for automated releases. The workflow:

1. Push commits to `main` using [Conventional Commits](https://www.conventionalcommits.org/) format
2. Release-please automatically creates/updates a release PR with changelog
3. Merge the release PR to trigger npm publish

Do NOT manually create tags or bump versions in package.json.

## License

MIT
