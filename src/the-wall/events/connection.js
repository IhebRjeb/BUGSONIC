const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function bridgeCommand(origin = location.origin) {
  return LOOPBACK_HOSTS.has(new URL(origin).hostname)
    ? 'npm run bridge'
    : `npm run bridge -- --allow-origin ${JSON.stringify(origin)}`;
}

export function connectionProblem(address, pageProtocol = location.protocol) {
  let target;
  try { target = new URL(address); } catch { return 'Enter a valid ws:// or wss:// address.'; }
  if (!['ws:', 'wss:'].includes(target.protocol) || target.hash || target.username || target.password) {
    return 'Enter a ws:// or wss:// address without credentials or a fragment.';
  }
  if (pageProtocol === 'https:' && target.protocol === 'ws:' && !LOOPBACK_HOSTS.has(target.hostname)) {
    return 'This HTTPS page requires wss:// for a remote bridge. Configure TLS on the bridge or its reverse proxy first.';
  }
  return '';
}

export function connectionHelp() {
  return `Run ${bridgeCommand()} on the computer receiving OSC. Allow local-network access if prompted. If your browser blocks local ws://, use a trusted wss:// bridge or run BUGSONIC locally.`;
}