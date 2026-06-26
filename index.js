// Polyfill web APIs missing in Hermes before anything else loads.
// (Babel hoists `import` statements, so these MUST be require()-based.)

if (typeof globalThis.DOMException === 'undefined') {
  globalThis.DOMException = class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name || 'DOMException';
    }
  };
}

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = class TextEncoder {
    encode(str) {
      const bytes = [];
      const encoded = encodeURIComponent(str);
      for (let i = 0; i < encoded.length; i++) {
        if (encoded[i] === '%') {
          bytes.push(parseInt(encoded.substr(i + 1, 2), 16));
          i += 2;
        } else {
          bytes.push(encoded.charCodeAt(i));
        }
      }
      return new Uint8Array(bytes);
    }
  };
}

if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = class TextDecoder {
    decode(bytes) {
      if (!bytes) return '';
      const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      let str = '';
      for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
      try { return decodeURIComponent(escape(str)); } catch { return str; }
    }
  };
}

require('expo-router/entry');
