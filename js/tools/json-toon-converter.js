class ToonEncoder {
  constructor(options = {}) {
    this.indentSize = options.indent ?? 2;
    this.delimiter = this.getDelimiter(options.delimiter ?? 'comma');
  }

  getDelimiter(type) {
    switch (type) {
      case 'tab': return '\t';
      case 'pipe': return '|';
      default: return ',';
    }
  }

  encode(value) {
    return this.encodeValue(value, 0);
  }

  encodeValue(value, depth) {
    if (value === null) return 'null';
    if (value === undefined) return '';
    if (Array.isArray(value)) return this.encodeArray(value, depth, '');
    if (typeof value === 'object') return this.encodeObject(value, depth);
    if (typeof value === 'string') return this.encodeString(value);
    if (typeof value === 'number') return this.encodeNumber(value);
    if (typeof value === 'boolean') return value.toString();
    return '';
  }

  encodeNumber(num) {
    if (!Number.isFinite(num)) return 'null';
    if (num === 0) return '0';
    const str = num.toString();
    if (str.includes('e') || str.includes('E')) {
      return num.toLocaleString('en-US', { maximumFractionDigits: 20, useGrouping: false });
    }
    return str;
  }

  encodeString(str, forceQuote = false) {
    if (str === '') return '""';
    const needsQuote = forceQuote || this.needsQuoting(str);
    if (!needsQuote) return str;
    const escaped = str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    return '"' + escaped + '"';
  }

  needsQuoting(str) {
    if (str === '') return true;
    if (/^\s|\s$/.test(str)) return true;
    if (['true', 'false', 'null'].includes(str)) return true;
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/i.test(str)) return true;
    if (/^0\d+/.test(str)) return true;
    if (/[:\[\]{}"\\]/.test(str)) return true;
    if (/[,\t|]/.test(str)) return true;
    if (str.startsWith('-')) return true;
    if (/[\n\r\t]/.test(str)) return true;
    return false;
  }

  encodeKey(key) {
    if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(key)) return key;
    return this.encodeString(key, true);
  }

  encodeObject(obj, depth = 0) {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '';
    const indent = ' '.repeat(depth * this.indentSize);
    const lines = [];
    for (const [key, value] of entries) {
      const encodedKey = this.encodeKey(key);
      if (value === null) {
        lines.push(indent + encodedKey + ': null');
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        if (Object.keys(value).length === 0) {
          lines.push(indent + encodedKey + ':');
        } else {
          lines.push(indent + encodedKey + ':');
          lines.push(this.encodeObject(value, depth + 1));
        }
      } else if (Array.isArray(value)) {
        lines.push(this.encodeArray(value, depth, encodedKey));
      } else if (typeof value === 'boolean') {
        lines.push(indent + encodedKey + ': ' + value);
      } else if (typeof value === 'number') {
        lines.push(indent + encodedKey + ': ' + this.encodeNumber(value));
      } else if (typeof value === 'string') {
        lines.push(indent + encodedKey + ': ' + this.encodeString(value));
      }
    }
    return lines.join('\n');
  }

  encodeArray(arr, depth, keyName) {
    if (arr.length === 0) {
      const indent = ' '.repeat(depth * this.indentSize);
      return indent + keyName + ':';
    }
    
    const indent = ' '.repeat(depth * this.indentSize);
    const itemIndent = ' '.repeat((depth + 1) * this.indentSize);
    const header = indent + keyName + '[' + arr.length + ']';
    
    if (this.isTabularArray(arr)) {
      return this.encodeTabularArray(arr, header, itemIndent);
    } else if (this.isPrimitiveArray(arr)) {
      return this.encodePrimitiveArray(arr, header);
    } else {
      return this.encodeMixedArray(arr, header, itemIndent);
    }
  }

  isPrimitive(value) {
    return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  }

  isPrimitiveArray(arr) {
    return arr.every(item => this.isPrimitive(item));
  }

  isTabularArray(arr) {
    if (arr.length === 0) return false;
    if (!arr.every(item => item !== null && typeof item === 'object' && !Array.isArray(item))) return false;
    const firstKeys = Object.keys(arr[0]);
    const allSameKeys = arr.every(item => {
      const keys = Object.keys(item);
      if (keys.length !== firstKeys.length) return false;
      return firstKeys.every(k => keys.includes(k));
    });
    if (!allSameKeys) return false;
    return arr.every(item => Object.values(item).every(v => this.isPrimitive(v)));
  }

  encodePrimitiveArray(arr, header) {
    const values = arr.map(item => {
      if (item === null) return 'null';
      if (typeof item === 'boolean') return item.toString();
      if (typeof item === 'number') return this.encodeNumber(item);
      if (typeof item === 'string') return this.encodeString(item);
      return '';
    });
    return header + ': ' + values.join(this.delimiter);
  }

  encodeTabularArray(arr, header, itemIndent) {
    const fields = Object.keys(arr[0]);
    const fieldList = fields.map(f => this.encodeKey(f)).join(this.delimiter);
    const fullHeader = header + '{' + fieldList + '}:';
    const rows = arr.map(item => {
      const values = fields.map(f => {
        const val = item[f];
        if (val === null) return 'null';
        if (typeof val === 'boolean') return val.toString();
        if (typeof val === 'number') return this.encodeNumber(val);
        if (typeof val === 'string') {
          const needsDelimiterQuote = (this.delimiter === ',' && val.includes(',')) || (this.delimiter === '\t' && val.includes('\t')) || (this.delimiter === '|' && val.includes('|'));
          return this.encodeString(val, needsDelimiterQuote);
        }
        return '';
      });
      return itemIndent + values.join(this.delimiter);
    });
    return fullHeader + '\n' + rows.join('\n');
  }

  encodeMixedArray(arr, header, itemIndent) {
    const fullHeader = header + ':';
    const items = arr.map(item => {
      if (this.isPrimitive(item)) {
        if (item === null) return itemIndent + '- null';
        if (typeof item === 'string') return itemIndent + '- ' + this.encodeString(item);
        if (typeof item === 'number') return itemIndent + '- ' + this.encodeNumber(item);
        if (typeof item === 'boolean') return itemIndent + '- ' + item;
      } else if (Array.isArray(item)) {
        if (item.length === 0) return itemIndent + '- []:';
        return itemIndent + '- [array]';
      } else if (typeof item === 'object' && item !== null) {
        const entries = Object.entries(item);
        if (entries.length === 0) return itemIndent + '-';
        const firstKey = this.encodeKey(entries[0][0]);
        const firstValue = entries[0][1];
        if (this.isPrimitive(firstValue)) {
          const rest = entries.slice(1).map(([k, v]) => {
            const key = this.encodeKey(k);
            const val = this.encodeValue(v, 0);
            return itemIndent + '  ' + key + ': ' + val;
          }).join('\n');
          let result = itemIndent + '- ' + firstKey + ': ';
          if (firstValue === null) result += 'null';
          else if (typeof firstValue === 'string') result += this.encodeString(firstValue);
          else if (typeof firstValue === 'number') result += this.encodeNumber(firstValue);
          else if (typeof firstValue === 'boolean') result += firstValue;
          return rest ? result + '\n' + rest : result;
        }
        return itemIndent + '- ' + firstKey + ':';
      }
      return itemIndent + '- [object]';
    });
    return fullHeader + '\n' + items.join('\n');
  }
}

function countTokens(text) {
  if (!text || !text.trim()) return 0;
  const tokens = text.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]+/gu) || [];
  return tokens.length;
}

document.addEventListener('DOMContentLoaded', function() {
  const input = document.getElementById('json-input');
  const output = document.getElementById('toon-output');
  const convertBtn = document.getElementById('convert-btn');
  const uploadBtn = document.getElementById('upload-btn');
  const downloadBtn = document.getElementById('download-btn');
  const clearBtn = document.getElementById('clear-btn');
  const fileInput = document.getElementById('file-input');
  const statusMessage = document.getElementById('status-message');
  const delimiterSelect = document.getElementById('delimiter-select');
  const indentSelect = document.getElementById('indent-select');
  const keyFoldingSelect = document.getElementById('keyfolding-select');
  const jsonTokensEl = document.getElementById('json-tokens');
  const toonTokensEl = document.getElementById('toon-tokens');
  const tokenSavingsEl = document.getElementById('token-savings');

  let currentToonOutput = '';

  function setStatus(message, isError) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message' + (isError ? ' error' : ' success');
  }

  function clearStatus() {
    statusMessage.textContent = '';
    statusMessage.className = 'status-message';
  }

  function getEncodingOptions() {
    return {
      delimiter: delimiterSelect.value,
      indent: parseInt(indentSelect.value, 10)
    };
  }

  function updateTokenStats(jsonText, toonText) {
    const jsonTokens = countTokens(jsonText);
    const toonTokens = countTokens(toonText);
    
    jsonTokensEl.textContent = '~' + jsonTokens.toLocaleString();
    toonTokensEl.textContent = '~' + toonTokens.toLocaleString();
    
    if (jsonTokens > 0) {
      const savings = Math.round((jsonTokens - toonTokens) / jsonTokens * 100);
      tokenSavingsEl.textContent = (savings >= 0 ? '+' : '') + savings + '%';
      tokenSavingsEl.className = 'stat-value stat-savings' + (savings > 0 ? ' positive' : '');
    } else {
      tokenSavingsEl.textContent = '~0%';
      tokenSavingsEl.className = 'stat-value stat-savings';
    }
  }

  function convert() {
    clearStatus();
    const text = input.value.trim();
    if (!text) {
      setStatus('Error: No input provided', true);
      jsonTokensEl.textContent = '~0';
      toonTokensEl.textContent = '~0';
      tokenSavingsEl.textContent = '~0%';
      return;
    }
    try {
      const parsed = JSON.parse(text);
      const encoder = new ToonEncoder(getEncodingOptions());
      currentToonOutput = encoder.encode(parsed);
      output.value = currentToonOutput;
      downloadBtn.disabled = false;
      setStatus('Success: TOON generated', false);
      updateTokenStats(text, currentToonOutput);
    } catch (e) {
      setStatus('Error: ' + e.message, true);
      output.value = '';
      currentToonOutput = '';
      downloadBtn.disabled = true;
      jsonTokensEl.textContent = '~0';
      toonTokensEl.textContent = '~0';
      tokenSavingsEl.textContent = '~0%';
    }
  }

  function clear() {
    input.value = '';
    output.value = '';
    currentToonOutput = '';
    fileInput.value = '';
    clearStatus();
    downloadBtn.disabled = true;
    jsonTokensEl.textContent = '~0';
    toonTokensEl.textContent = '~0';
    tokenSavingsEl.textContent = '~0%';
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setStatus('Error: Please select a JSON file', true);
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      input.value = e.target.result;
      convert();
    };
    reader.onerror = function() {
      setStatus('Error: Could not read file', true);
    };
    reader.readAsText(file);
  }

  function download() {
    if (!currentToonOutput) return;
    const blob = new Blob([currentToonOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.toon';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  convertBtn.addEventListener('click', convert);
  clearBtn.addEventListener('click', clear);
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  downloadBtn.addEventListener('click', download);

  input.addEventListener('dragover', (e) => {
    e.preventDefault();
    input.style.borderColor = '#4a9eff';
  });

  input.addEventListener('dragleave', () => {
    input.style.borderColor = '';
  });

  input.addEventListener('drop', (e) => {
    e.preventDefault();
    input.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    handleFile(file);
  });

  delimiterSelect.addEventListener('change', () => {
    if (input.value.trim()) convert();
  });

  indentSelect.addEventListener('change', () => {
    if (input.value.trim()) convert();
  });

  keyFoldingSelect.addEventListener('change', () => {
    if (input.value.trim()) convert();
  });
});
