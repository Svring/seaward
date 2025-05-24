"use server"

import { NodeSSH } from 'node-ssh';
import * as fs from 'fs';
import * as path from 'path';

export async function activateGalateaForSSHDevice(
  sshConfig: {
    host: string;
    port?: number;
    username: string;
    password?: string;
    privateKey?: string;
  },
  remotePath: string = '/home/devbox/galatea'
) {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: sshConfig.host,
    port: sshConfig.port,
    username: sshConfig.username,
    password: sshConfig.password,
    privateKey: sshConfig.privateKey,
  });
  try {
    // Check if galatea exists
    const checkResult = await ssh.execCommand('test -f galatea', { cwd: '/home/devbox' });
    if (checkResult.code !== 0) {
      // galatea does not exist, upload it
      await ssh.dispose(); // Close this connection before upload
      await uploadGalateaToSSHDevice(sshConfig, remotePath);
      return;
    }
    // galatea exists, ensure it's executable and run it
    const chmodResult = await ssh.execCommand('chmod a+x galatea', { cwd: '/home/devbox' });
    if (chmodResult.stderr) throw new Error(`chmod failed: ${chmodResult.stderr}`);
    const execResult = await ssh.execCommand('./galatea', { cwd: '/home/devbox' });
    if (execResult.stderr) throw new Error(`execution failed: ${execResult.stderr}`);
  } finally {
    ssh.dispose();
  }
}

export async function uploadGalateaToSSHDevice(
  sshConfig: {
    host: string;
    port?: number;
    username: string;
    password?: string;
    privateKey?: string;
  },
  remotePath: string = '/home/devbox/galatea'
) {
  const galateaRelease = process.env.GALATEA_RELEASE;
  if (!galateaRelease) throw new Error('GALATEA_RELEASE is not set');
  const tmpFile = path.join('/tmp', 'galatea');

  // Download the file locally first
  const res = await fetch(galateaRelease);
  if (!res.ok) throw new Error('Failed to download galatea');
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(tmpFile, buffer);

  // Upload to remote using node-ssh
  const ssh = new NodeSSH();
  await ssh.connect({
    host: sshConfig.host,
    port: sshConfig.port,
    username: sshConfig.username,
    password: sshConfig.password,
    privateKey: sshConfig.privateKey,
  });
  try {
    await ssh.putFile(tmpFile, remotePath);
    // Run chmod and execute galatea
    const remoteDir = path.dirname(remotePath);
    const galateaFile = path.basename(remotePath);
    // Make executable
    const chmodResult = await ssh.execCommand(`chmod a+x ${galateaFile}`, { cwd: remoteDir });
    if (chmodResult.stderr) throw new Error(`chmod failed: ${chmodResult.stderr}`);
    // Run the binary
    const execResult = await ssh.execCommand(`./${galateaFile}`, { cwd: remoteDir });
    if (execResult.stderr) throw new Error(`execution failed: ${execResult.stderr}`);
  } finally {
    ssh.dispose();
  }
}
