# node-red-contrib-bravia2

[![npm version](https://img.shields.io/npm/v/node-red-contrib-bravia2.svg)](https://www.npmjs.com/package/node-red-contrib-bravia2)
[![npm downloads](https://img.shields.io/npm/dm/node-red-contrib-bravia2.svg)](https://www.npmjs.com/package/node-red-contrib-bravia2)
[![Node.js Version](https://img.shields.io/node/v/node-red-contrib-bravia2.svg)](https://nodejs.org)
[![License](https://img.shields.io/npm/l/node-red-contrib-bravia2.svg)](https://github.com/metaneutrons/node-red-contrib-bravia2/blob/master/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/metaneutrons/node-red-contrib-bravia2.svg)](https://github.com/metaneutrons/node-red-contrib-bravia2/issues)

Node-RED nodes to control Sony BRAVIA Android TVs.

## Features

- **IRCC Node** - Send remote control commands (power, volume, navigation, etc.)
- **API Node** - Call any Sony BRAVIA REST API method
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

### bravia-ircc

Send IRCC (IR-like) commands to control the TV. Commands can be specified by name (e.g., `VolumeUp`, `Home`, `Hdmi1`) or as raw IRCC codes.

**Input:** `msg.payload` - Command name or comma-separated list of commands

### bravia-api

Call any Sony BRAVIA API method directly.

**Input:**
- `msg.method` - Method in format `protocol:version:method` (e.g., `system:1.0:getPowerStatus`)
- `msg.payload` - Optional JSON payload for the method

**Output:** `msg.payload` - API response

## Credits

This project is a modernized fork of [node-red-contrib-bravia](https://github.com/waynehaffenden/node-red-contrib-bravia), originally created by [Wayne Haffenden](https://github.com/waynehaffenden). 

The original implementation provided the foundation for controlling Sony BRAVIA TVs from Node-RED. This fork updates the codebase to modern Node.js standards and removes deprecated dependencies.

## License

MIT
