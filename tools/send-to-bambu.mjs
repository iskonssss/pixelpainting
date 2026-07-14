#!/usr/bin/env node
// send-to-bambu.mjs — upload a .gcode file to a Bambu Lab printer over the LAN
// and optionally start the print, using the printer's local FTPS + MQTT services.
//
// Requirements on the printer:
//   * LAN Mode enabled (printer settings → network). On recent firmware you may
//     also need "Developer Mode" / LAN Dev Mode for MQTT access.
//   * The LAN Access Code from the printer's network settings screen.
//
// Usage:
//   node tools/send-to-bambu.mjs --ip <printer-ip> --code <access-code> file.gcode
//   node tools/send-to-bambu.mjs --ip <ip> --code <code> --serial <SN> --start file.gcode
//
//   --ip       printer IP address on your LAN
//   --code     LAN access code (printer screen → settings → network)
//   --serial   printer serial number (needed only with --start)
//   --start    start printing the file right after upload (EXPERIMENTAL)
//
// This is community-protocol territory (same as OrcaSlicer / Home Assistant
// integrations use); Bambu firmware updates can change behavior. Uploading is
// safe; --start begins a print, so make sure the bed is clear first.

import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--start' || a === '--help') args[a.slice(2)] = true;
    else if (a.startsWith('--')) args[a.slice(2)] = argv[++i];
    else args._.push(a);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.ip || !args.code || args._.length !== 1) {
  console.log(`Usage: node tools/send-to-bambu.mjs --ip <printer-ip> --code <access-code> [--serial <SN> --start] <file.gcode>

  --ip       printer IP on your LAN
  --code     LAN access code (printer screen -> settings -> network)
  --serial   printer serial number (required with --start)
  --start    start the print after upload (experimental; clear the bed first!)`);
  process.exit(args.help ? 0 : 1);
}

const file = args._[0];
if (!existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}
const remoteName = basename(file).replace(/[^\w.-]/g, '_');

// --- 1. Upload over implicit FTPS (port 990, user "bblp") ---
const { Client } = await import('basic-ftp').catch(() => {
  console.error('Missing dependency. Run: npm install');
  process.exit(1);
});

console.log(`Uploading ${file} -> ftps://${args.ip}/${remoteName} ...`);
const ftp = new Client(30000);
try {
  await ftp.access({
    host: args.ip,
    port: 990,
    user: 'bblp',
    password: args.code,
    secure: 'implicit',
    secureOptions: { rejectUnauthorized: false }, // printer uses a self-signed cert
  });
  await ftp.uploadFrom(file, `/${remoteName}`);
  console.log('Upload complete.');
} catch (err) {
  console.error(`Upload failed: ${err.message}`);
  console.error('Check: LAN Mode enabled, correct IP, correct access code.');
  process.exit(1);
} finally {
  ftp.close();
}

if (!args.start) {
  console.log(`Done. On the printer screen: Files -> SD card -> ${remoteName} -> print.`);
  process.exit(0);
}

// --- 2. Start the print via MQTT (port 8883, user "bblp") ---
if (!args.serial) {
  console.error('--start requires --serial <printer serial number>.');
  process.exit(1);
}
const mqtt = await import('mqtt').catch(() => {
  console.error('Missing dependency. Run: npm install');
  process.exit(1);
});

console.log('Connecting to printer MQTT to start the print...');
const client = mqtt.connect(`mqtts://${args.ip}:8883`, {
  username: 'bblp',
  password: args.code,
  rejectUnauthorized: false,
  connectTimeout: 15000,
});

const bail = (msg, codeNum = 1) => { console.error(msg); client.end(true); process.exit(codeNum); };
const timer = setTimeout(() => bail('Timed out talking to the printer over MQTT.'), 20000);

client.on('error', err => bail(`MQTT error: ${err.message}`));
client.on('connect', () => {
  const payload = {
    print: {
      sequence_id: '1',
      command: 'gcode_file',
      param: `/sdcard/${remoteName}`,
    },
  };
  client.publish(`device/${args.serial}/request`, JSON.stringify(payload), { qos: 1 }, err => {
    clearTimeout(timer);
    if (err) bail(`Failed to send print command: ${err.message}`);
    console.log(`Print command sent for /sdcard/${remoteName}.`);
    console.log('Watch the printer screen — the job should start within a few seconds.');
    client.end();
  });
});
