document.addEventListener('DOMContentLoaded', function() {
    const minuteInput = document.getElementById('cron-minute');
    const hourInput = document.getElementById('cron-hour');
    const dayInput = document.getElementById('cron-day');
    const monthInput = document.getElementById('cron-month');
    const weekdayInput = document.getElementById('cron-weekday');
    const cronStringInput = document.getElementById('cron-string');
    const cronResult = document.getElementById('cron-result');
    const validationEl = document.getElementById('cron-validation');
    const clearBtn = document.getElementById('clear-btn');

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const WEEKDAY_NAME_MAP = {
        sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
    };

    const MONTH_NAME_MAP = {
        jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
        jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };

    const SHORTCUTS = {
        '@reboot':   { cron: '@reboot', desc: 'Once at system startup', fields: null },
        '@hourly':   { cron: '0 * * * *', desc: 'Every hour at minute 0', fields: { minute: '0', hour: '*', day: '*', month: '*', weekday: '*' } },
        '@daily':    { cron: '0 0 * * *', desc: 'Every day at midnight', fields: { minute: '0', hour: '0', day: '*', month: '*', weekday: '*' } },
        '@midnight': { cron: '0 0 * * *', desc: 'Every day at midnight', fields: { minute: '0', hour: '0', day: '*', month: '*', weekday: '*' } },
        '@weekly':   { cron: '0 0 * * 0', desc: 'Every week on Sunday at midnight', fields: { minute: '0', hour: '0', day: '*', month: '*', weekday: '0' } },
        '@monthly':  { cron: '0 0 1 * *', desc: 'Every month on the 1st at midnight', fields: { minute: '0', hour: '0', day: '1', month: '*', weekday: '*' } },
        '@yearly':   { cron: '0 0 1 1 *', desc: 'Every year on January 1st at midnight', fields: { minute: '0', hour: '0', day: '1', month: '1', weekday: '*' } },
        '@annually': { cron: '0 0 1 1 *', desc: 'Every year on January 1st at midnight', fields: { minute: '0', hour: '0', day: '1', month: '1', weekday: '*' } }
    };

    function nameToNumber(name, fieldType) {
        const normalizedName = name.toLowerCase().substring(0, 3);
        if (fieldType === 'weekday') {
            return WEEKDAY_NAME_MAP[normalizedName];
        } else if (fieldType === 'month') {
            return MONTH_NAME_MAP[normalizedName];
        }
        return null;
    }

    function numberToName(num, fieldType) {
        if (fieldType === 'weekday') {
            return weekdayNames[num] || num;
        } else if (fieldType === 'month') {
            return monthNames[num - 1] || num;
        }
        return num;
    }

    function isName(value, fieldType) {
        const normalizedName = value.toLowerCase();
        if (fieldType === 'weekday') {
            return Object.keys(WEEKDAY_NAME_MAP).includes(normalizedName);
        } else if (fieldType === 'month') {
            return Object.keys(MONTH_NAME_MAP).includes(normalizedName);
        }
        return false;
    }

    function hasMixedNamesAndNumbers(value, fieldType) {
        const parts = value.split(/[,\-]/);
        let hasName = false;
        let hasNumber = false;
        
        for (let part of parts) {
            part = part.trim();
            if (!part) continue;
            
            if (/^\d+$/.test(part)) {
                hasNumber = true;
            } else if (isName(part, fieldType)) {
                hasName = true;
            }
            
            if (hasName && hasNumber) {
                return true;
            }
        }
        
        return false;
    }

    function parseShortcut(value) {
        const trimmed = value.trim().toLowerCase();
        return SHORTCUTS[trimmed] || null;
    }

    function tryMatchShortcut(minute, hour, day, month, weekday) {
        const cron = `${minute} ${hour} ${day} ${month} ${weekday}`.trim();
        
        for (const [shortcut, data] of Object.entries(SHORTCUTS)) {
            if (data.fields) {
                const expected = `${data.fields.minute} ${data.fields.hour} ${data.fields.day} ${data.fields.month} ${data.fields.weekday}`;
                if (cron === expected) {
                    return { shortcut, ...data };
                }
            }
        }
        return null;
    }

    function convertNamesToNumbers(value, fieldType, min, max) {
        const nameMap = fieldType === 'weekday' ? WEEKDAY_NAME_MAP : MONTH_NAME_MAP;
        const parts = value.split(',');
        const converted = parts.map(part => {
            part = part.trim();
            
            if (part.includes('-')) {
                const rangeParts = part.split('-');
                return rangeParts.map(p => {
                    const num = nameToNumber(p.trim(), fieldType);
                    return num !== null ? num : p;
                }).join('-');
            }
            
            const num = nameToNumber(part, fieldType);
            return num !== null ? num : part;
        }).join(',');
        
        return converted;
    }

    function validateCronInput(input, min, max, fieldType = null) {
        const allowNames = fieldType === 'weekday' || fieldType === 'month';
        
        input.addEventListener('input', function() {
            const cursorPos = this.selectionStart;
            const original = this.value;
            
            // Permitir letras si allowNames = true
            const allowedChars = allowNames ? /[^0-9*,/\-~a-zA-Z]/g : /[^0-9*,/\-~]/g;
            let filtered = original.replace(allowedChars, '');
            
            // Check for invalid comma patterns and preserve them
            const hasLeadingComma = filtered.startsWith(',');
            const hasTrailingComma = filtered.endsWith(',');
            const hasDoubleComma = filtered.includes(',,');
            
            const parts = filtered.split(',');
            const validatedParts = [];
            
            for (let part of parts) {
                part = part.trim();
                if (!part) continue;
                
                if (part === '*') {
                    validatedParts.push(part);
                    continue;
                }
                
                if (part === '*/') {
                    validatedParts.push(part);
                    continue;
                }
                
                if (part.startsWith('*/')) {
                    const interval = part.substring(2);
                    if (/^\d+$/.test(interval)) {
                        const num = Math.min(Math.max(parseInt(interval) || 1, 1), max);
                        validatedParts.push(`*/${num}`);
                    } else {
                        validatedParts.push(part);
                    }
                    continue;
                }
                
                if (part.startsWith('/') || part.includes('//')) {
                    validatedParts.push(part);
                    continue;
                }
                
                if (part.endsWith('/') && !part.startsWith('*/')) {
                    validatedParts.push(part);
                    continue;
                }
                
                if (part === '~') {
                    validatedParts.push(part);
                    continue;
                }
                
                if (part.includes('~')) {
                    const range = part.split('~');
                    if (range.length === 2) {
                        const startStr = range[0];
                        const endStr = range[1];
                        
                        if (startStr === '' && endStr === '') {
                            validatedParts.push('~');
                            continue;
                        }
                        
                        if (startStr === '' && /^\d+$/.test(endStr)) {
                            const end = Math.min(Math.max(parseInt(endStr), min), max);
                            validatedParts.push(`~${end}`);
                            continue;
                        }
                        
                        if (endStr === '' && /^\d+$/.test(startStr)) {
                            const start = Math.min(Math.max(parseInt(startStr), min), max);
                            validatedParts.push(`${start}~`);
                            continue;
                        }
                        
                        if (/^\d+$/.test(startStr) && /^\d+$/.test(endStr)) {
                            const start = Math.min(Math.max(parseInt(startStr), min), max);
                            const end = Math.min(Math.max(parseInt(endStr), min), max);
                            validatedParts.push(`${start}~${end}`);
                            continue;
                        }
                        
                        validatedParts.push(part);
                        continue;
                    }
                    validatedParts.push(part);
                    continue;
                }
                
                if (allowNames && isName(part, fieldType)) {
                    validatedParts.push(part.toLowerCase().substring(0, 3));
                    continue;
                }
                
                if (part.endsWith('-') || part.startsWith('-')) {
                    validatedParts.push(part);
                    continue;
                }
                
                if (part.includes('-')) {
                    const range = part.split('-');
                    if (range.length === 2) {
                        const startStr = range[0];
                        const endStr = range[1];
                        
                        if (allowNames && isName(startStr, fieldType) && isName(endStr, fieldType)) {
                            validatedParts.push(`${startStr.toLowerCase().substring(0, 3)}-${endStr.toLowerCase().substring(0, 3)}`);
                            continue;
                        }
                        
                        if (/^\d+$/.test(startStr) && /^\d+$/.test(endStr)) {
                            const start = Math.min(Math.max(parseInt(startStr), min), max);
                            const end = Math.min(Math.max(parseInt(endStr), min), max);
                            validatedParts.push(`${start}-${end}`);
                            continue;
                        }
                    }
                    validatedParts.push(part);
                    continue;
                }
                
                if (/^\d+$/.test(part)) {
                    const num = parseInt(part);
                    if (!isNaN(num)) {
                        const clamped = Math.min(Math.max(num, min), max);
                        validatedParts.push(clamped.toString());
                        continue;
                    }
                }
                
                if (part !== '') {
                    validatedParts.push(part);
                }
            }
            
            let validated = validatedParts.join(',');
            
            // Preserve invalid comma patterns for validation error display
            if (hasLeadingComma) validated = ',' + validated;
            if (hasTrailingComma) validated = validated + ',';
            if (hasDoubleComma) {
                // Keep double comma as-is for error display
                validated = filtered;
            }
            
            if (validated !== original) {
                this.value = validated;
                const newCursorPos = Math.min(cursorPos, validated.length);
                this.setSelectionRange(newCursorPos, newCursorPos);
            }
        });
    }

    validateCronInput(minuteInput, 0, 59);
    validateCronInput(hourInput, 0, 23);
    validateCronInput(dayInput, 1, 31);
    validateCronInput(monthInput, 1, 12, 'month');
    validateCronInput(weekdayInput, 0, 7, 'weekday');

    function validateCronField(value, min, max, fieldType = null) {
        if (!value || value === '*') {
            return { valid: true, errors: [] };
        }
        
        // Check para @shortcuts (solo en cron-string completo)
        if (value.startsWith('@')) {
            const shortcut = parseShortcut(value);
            if (!shortcut) {
                return { valid: false, errors: [`Unknown shortcut: ${value}`] };
            }
            return { valid: true, errors: [] };
        }
        
        if (value === '~') {
            return { valid: true, errors: [] };
        }
        
        if (value.startsWith('/') || value.endsWith('/')) {
            return { 
                valid: false, 
                errors: ['Invalid step format: use */n (e.g., */5)'] 
            };
        }
        
        if ((value.match(/\//g) || []).length > 1) {
            return { 
                valid: false, 
                errors: ['Invalid step format: multiple slashes not allowed'] 
            };
        }
        
        if (value.endsWith(',') || value.startsWith(',') || value.includes(',,')) {
            return { 
                valid: false, 
                errors: ['Invalid list format: empty values not allowed'] 
            };
        }
        
        // Check para nombres mixtos (solo month/weekday)
        if (fieldType && (fieldType === 'weekday' || fieldType === 'month')) {
            if (hasMixedNamesAndNumbers(value, fieldType)) {
                return { valid: false, errors: ['Cannot mix names and numbers'] };
            }
            
            // Validar que los nombres sean válidos
            const namePattern = fieldType === 'weekday' 
                ? '\\b(sun|mon|tue|wed|thu|fri|sat)\\b'
                : '\\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\b';
            const namesInValue = value.match(new RegExp(namePattern, 'gi'));
            
            if (namesInValue) {
                // Todos los nombres son válidos por definición
                return { valid: true, errors: [] };
            }
        }
        
        if (value.includes('~') && !value.includes(',')) {
            const parts = value.split('~');
            if (parts.length !== 2) {
                return { valid: false, errors: [`Invalid random format: ${value}`] };
            }
            
            const startStr = parts[0];
            const endStr = parts[1];
            
            if (startStr === '' && endStr === '') {
                return { valid: true, errors: [] };
            }
            
            if (startStr === '') {
                const end = parseInt(endStr);
                if (isNaN(end) || end < min || end > max) {
                    return { valid: false, errors: [`End value ${endStr} out of bounds (${min}-${max})`] };
                }
                return { valid: true, errors: [] };
            }
            
            if (endStr === '') {
                const start = parseInt(startStr);
                if (isNaN(start) || start < min || start > max) {
                    return { valid: false, errors: [`Start value ${startStr} out of bounds (${min}-${max})`] };
                }
                return { valid: true, errors: [] };
            }
            
            const start = parseInt(startStr);
            const end = parseInt(endStr);
            if (isNaN(start) || isNaN(end)) {
                return { valid: false, errors: [`Invalid random values: ${value}`] };
            }
            if (start < min || start > max) {
                return { valid: false, errors: [`Start ${start} out of bounds (${min}-${max})`] };
            }
            if (end < min || end > max) {
                return { valid: false, errors: [`End ${end} out of bounds (${min}-${max})`] };
            }
            if (start > end) {
                return { valid: false, errors: [`Start ${start} > end ${end}`] };
            }
            return { valid: true, errors: [] };
        }
        
        if (value.startsWith('*/')) {
            const interval = parseInt(value.substring(2));
            if (isNaN(interval) || interval < 1 || interval > max) {
                return { 
                    valid: false, 
                    errors: [`Invalid interval */${value.substring(2)} (must be 1-${max})`] 
                };
            }
            return { valid: true, errors: [] };
        }
        
        if (value.includes('/') && !value.startsWith('*/')) {
            const parts = value.split('/');
            if (parts.length !== 2) {
                return { valid: false, errors: [`Invalid step format: ${value}`] };
            }
            const range = parts[0];
            const step = parseInt(parts[1]);
            if (isNaN(step) || step < 1) {
                return { valid: false, errors: [`Invalid step value: ${parts[1]}`] };
            }
            
            if (range !== '*') {
                const rangeParts = range.split('-');
                if (rangeParts.length === 2) {
                    const start = parseInt(rangeParts[0]);
                    const end = parseInt(rangeParts[1]);
                    if (isNaN(start) || isNaN(end)) {
                        return { valid: false, errors: [`Invalid range in step: ${range}`] };
                    }
                    if (start < min || start > max || end < min || end > max) {
                        return { valid: false, errors: [`Range ${range} out of bounds (${min}-${max})`] };
                    }
                    if (start > end) {
                        return { valid: false, errors: [`Start ${start} > end ${end}`] };
                    }
                }
            }
            return { valid: true, errors: [] };
        }
        
        const parts = value.split(',');
        const errors = [];
        
        for (let part of parts) {
            part = part.trim();
            if (!part) continue;
            
            if (part.includes('~')) {
                const randParts = part.split('~');
                if (randParts.length !== 2) {
                    errors.push(`Invalid random format: ${part}`);
                    continue;
                }
                const startStr = randParts[0];
                const endStr = randParts[1];
                
                if (startStr === '' && endStr === '') {
                    continue;
                }
                
                if (startStr === '') {
                    const end = parseInt(endStr);
                    if (isNaN(end) || end < min || end > max) {
                        errors.push(`End value ${endStr} out of bounds (${min}-${max})`);
                    }
                    continue;
                }
                
                if (endStr === '') {
                    const start = parseInt(startStr);
                    if (isNaN(start) || start < min || start > max) {
                        errors.push(`Start value ${startStr} out of bounds (${min}-${max})`);
                    }
                    continue;
                }
                
                const start = parseInt(startStr);
                const end = parseInt(endStr);
                if (isNaN(start) || isNaN(end)) {
                    errors.push(`Invalid random values: ${part}`);
                } else if (start < min || start > max) {
                    errors.push(`Start ${start} out of bounds (${min}-${max})`);
                } else if (end < min || end > max) {
                    errors.push(`End ${end} out of bounds (${min}-${max})`);
                } else if (start > end) {
                    errors.push(`Start ${start} > end ${end}`);
                }
                continue;
            }
            
            if (isStepWithRange(part)) {
                const parsed = parseStepWithRange(part, min, max);
                if (!parsed || !parsed.valid) {
                    errors.push(`Invalid range-step format: ${part}`);
                    continue;
                }
                if (parsed.start < min || parsed.start > max) {
                    errors.push(`Start ${parsed.start} out of bounds (${min}-${max})`);
                }
                if (parsed.end < min || parsed.end > max) {
                    errors.push(`End ${parsed.end} out of bounds (${min}-${max})`);
                }
                if (parsed.start > parsed.end) {
                    errors.push(`Start ${parsed.start} > end ${parsed.end}`);
                }
                if (parsed.step < 1) {
                    errors.push(`Step must be ≥ 1`);
                }
                continue;
            }
            
            if (part.includes('-')) {
                const range = part.split('-');
                if (range.length !== 2) {
                    errors.push(`Invalid range format: ${part}`);
                    continue;
                }
                const start = parseInt(range[0]);
                const end = parseInt(range[1]);
                if (isNaN(start) || isNaN(end)) {
                    errors.push(`Invalid range values: ${part}`);
                } else if (start < min || start > max) {
                    errors.push(`Start ${start} out of bounds (${min}-${max})`);
                } else if (end < min || end > max) {
                    errors.push(`End ${end} out of bounds (${min}-${max})`);
                } else if (start > end) {
                    errors.push(`Start ${start} > end ${end}`);
                }
                continue;
            }
            
            // Check para nombres (month/weekday)
            if (fieldType && isName(part, fieldType)) {
                continue; // Nombre válido
            }
            
            const num = parseInt(part);
            if (isNaN(num)) {
                errors.push(`Invalid value: ${part}`);
            } else if (num < min || num > max) {
                errors.push(`Value ${num} out of bounds (${min}-${max})`);
            }
        }
        
        return { valid: errors.length === 0, errors };
    }

    function validateAllFields() {
        const validations = [
            { input: minuteInput, min: 0, max: 59, name: 'Minute', fieldType: null },
            { input: hourInput, min: 0, max: 23, name: 'Hour', fieldType: null },
            { input: dayInput, min: 1, max: 31, name: 'Day', fieldType: null },
            { input: monthInput, min: 1, max: 12, name: 'Month', fieldType: 'month' },
            { input: weekdayInput, min: 0, max: 7, name: 'Weekday', fieldType: 'weekday' }
        ];
        
        const allErrors = [];
        
        validations.forEach(({ input, min, max, name, fieldType }) => {
            const value = input.value.trim() || '*';
            const result = validateCronField(value, min, max, fieldType);
            
            if (result.valid) {
                input.classList.remove('error');
            } else {
                input.classList.add('error');
                result.errors.forEach(err => {
                    allErrors.push(`${name}: ${err}`);
                });
            }
        });
        
        if (allErrors.length === 0) {
            validationEl.className = 'cron-validation valid';
            validationEl.innerHTML = '<span class="validation-icon">✓</span><span class="validation-message">Valid cron expression</span>';
        } else {
            validationEl.className = 'cron-validation invalid';
            validationEl.innerHTML = `<span class="validation-icon">✗</span><span class="validation-message">${allErrors.join('; ')}</span>`;
        }
        
        return allErrors.length === 0;
    }

    function getValueOrStar(input) {
        const val = input.value.trim();
        return val === '' ? '*' : val;
    }

    function buildCronString() {
        const minute = getValueOrStar(minuteInput);
        const hour = getValueOrStar(hourInput);
        const day = getValueOrStar(dayInput);
        const month = getValueOrStar(monthInput);
        const weekday = getValueOrStar(weekdayInput);
        return `${minute} ${hour} ${day} ${month} ${weekday}`;
    }

    function parseCronPart(value) {
        if (!value || value === '*') return '*';
        return value.trim();
    }

    function parseCronString(cron) {
        const parts = cron.trim().split(/\s+/);
        if (parts.length !== 5) return null;
        return {
            minute: parseCronPart(parts[0]),
            hour: parseCronPart(parts[1]),
            day: parseCronPart(parts[2]),
            month: parseCronPart(parts[3]),
            weekday: parseCronPart(parts[4])
        };
    }

    function isSimpleValue(value) {
        return /^\d+$/.test(value);
    }

    function isInterval(value) {
        return value.startsWith('*/');
    }

    function isRange(value) {
        // Match numeric ranges (1-5) OR name ranges (mon-fri, jan-mar)
        return /^\d+-\d+$/.test(value) || /^[a-zA-Z]+-[a-zA-Z]+$/.test(value);
    }

    function isList(value) {
        return value.includes(',') && !isRange(value);
    }
    
    function isRandom(value) {
        return value.includes('~');
    }
    
    function parseRandom(value) {
        if (value === '~') {
            return { type: 'full-random' };
        }
        if (!value.includes('~')) {
            return null;
        }
        const parts = value.split('~');
        if (parts.length !== 2) {
            return null;
        }
        const startStr = parts[0];
        const endStr = parts[1];
        if (startStr === '' && endStr === '') {
            return { type: 'full-random' };
        }
        if (startStr === '') {
            const end = parseInt(endStr);
            if (isNaN(end)) return null;
            return { type: 'random-to', end };
        }
        if (endStr === '') {
            const start = parseInt(startStr);
            if (isNaN(start)) return null;
            return { type: 'random-from', start };
        }
        const start = parseInt(startStr);
        const end = parseInt(endStr);
        if (isNaN(start) || isNaN(end)) return null;
        return { type: 'random-range', start, end };
    }

    function hasInvalidSlash(value) {
        if (value.startsWith('/')) return true;
        if (value.includes('//')) return true;
        if (value.endsWith('/')) return true;
        return false;
    }
    
    function isStepWithRange(value) {
        return value.includes('/') && 
               !value.startsWith('*/') && 
               value.split('/').length === 2 &&
               value.includes('-');
    }
    
    function parseStepWithRange(value, min, max) {
        const slashIdx = value.lastIndexOf('/');
        const range = value.substring(0, slashIdx);
        const stepStr = value.substring(slashIdx + 1);
        const step = parseInt(stepStr);
        
        if (!range.includes('-') || isNaN(step)) return null;
        
        const [startStr, endStr] = range.split('-');
        const start = parseInt(startStr);
        const end = parseInt(endStr);
        
        return { start, end, step, valid: !isNaN(start) && !isNaN(end) };
    }
    
    function parseComplexList(value, min, max, fieldType = null) {
        if (!value.includes(',')) return null;
        
        return value.split(',').map(part => {
            part = part.trim();
            if (!part) return { type: 'empty' };
            
            if (part.startsWith('*/')) {
                return { type: 'interval', step: parseInt(part.substring(2)) };
            }
            if (isStepWithRange(part)) {
                return { type: 'range-step', ...parseStepWithRange(part, min, max) };
            }
            if (part.includes('-')) {
                const [s, e] = part.split('-').map(Number);
                return { type: 'range', start: s, end: e };
            }
            if (part.includes('~')) {
                const randInfo = parseRandom(part);
                return { type: 'random', randInfo };
            }
            if (fieldType && isName(part, fieldType)) {
                return { type: 'name', name: part.toLowerCase(), value: nameToNumber(part.toLowerCase(), fieldType) };
            }
            return { type: 'value', value: parseInt(part) };
        });
    }

    function formatTimeValue(value, padLength) {
        if (isSimpleValue(value)) {
            return value.padStart(padLength, '0');
        }
        return value;
    }
    
    function expandCronField(value, min, max) {
        if (value === '*') {
            return Array.from({length: max - min + 1}, (_, i) => min + i);
        }
        if (value.startsWith('*/')) {
            const step = parseInt(value.substring(2));
            if (isNaN(step) || step < 1) return [];
            const result = [];
            for (let i = min; i <= max; i += step) result.push(i);
            return result;
        }
        if (value.includes(',')) {
            const result = [];
            for (let part of value.split(',')) {
                part = part.trim();
                if (!part) continue;
                if (part.includes('-')) {
                    const [sStr, eStr] = part.split('-');
                    const s = parseInt(sStr);
                    const e = parseInt(eStr);
                    if (!isNaN(s) && !isNaN(e)) {
                        for (let i = Math.max(s, min); i <= Math.min(e, max); i++) result.push(i);
                    }
                } else if (/^\d+$/.test(part)) {
                    const num = parseInt(part);
                    if (!isNaN(num) && num >= min && num <= max) result.push(num);
                }
            }
            return result;
        }
        if (value.includes('-')) {
            const [sStr, eStr] = value.split('-');
            const s = parseInt(sStr);
            const e = parseInt(eStr);
            if (!isNaN(s) && !isNaN(e)) {
                return Array.from({length: e - s + 1}, (_, i) => s + i);
            }
            return [];
        }
        if (/^\d+$/.test(value)) {
            const num = parseInt(value);
            if (!isNaN(num) && num >= min && num <= max) return [num];
        }
        return [];
    }
    
    function formatTimeCombinations(minutes, hours) {
        const minuteValues = expandCronField(minutes, 0, 59);
        const hourValues = expandCronField(hours, 0, 23);
        
        if (minuteValues.length === 0 || hourValues.length === 0) return [];
        
        // Limitar a 12 combinaciones para evitar descripciones muy largas
        if (minuteValues.length * hourValues.length > 12) return [];
        
        const combinations = [];
        for (let h of hourValues) {
            for (let m of minuteValues) {
                combinations.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            }
        }
        
        return combinations.sort();
    }
    
    function describeStepWithRange(value, unitName, namesArray, min, max) {
        const parsed = parseStepWithRange(value, min, max);
        if (!parsed || !parsed.valid) return `invalid ${value}`;
        
        let startVal, endVal;
        if (namesArray) {
            const offset = unitName.startsWith('month') ? 1 : 0;
            startVal = namesArray[parsed.start - offset] || parsed.start;
            endVal = namesArray[parsed.end - offset] || parsed.end;
        } else {
            startVal = parsed.start;
            endVal = parsed.end;
        }
        
        return `every ${parsed.step} ${unitName} from ${startVal} through ${endVal}`;
    }
    
    function describeComplexList(parts, unitName, namesArray, min, max, fieldType = null) {
        const descriptions = [];
        const allValues = parts.every(p => p.type === 'value' || p.type === 'empty');
        const allNames = parts.every(p => p.type === 'name' || p.type === 'empty');
        const singularUnit = unitName.endsWith('s') ? unitName.slice(0, -1) : unitName;
        
        if (allValues) {
            const values = parts.filter(p => p.type === 'value').map(p => p.value);
            if (values.length === 0) return null;
            
            // Convert names to full names if applicable
            const formattedValues = values.map(val => {
                if (fieldType && !/^\d+$/.test(val)) {
                    const num = nameToNumber(val.toLowerCase(), fieldType);
                    if (num !== null) {
                        return numberToName(num, fieldType);
                    }
                }
                return val;
            });
            
            if (formattedValues.length === 1) {
                return `at ${singularUnit} ${formattedValues[0]}`;
            }
            if (formattedValues.length === 2) {
                return `at ${singularUnit} ${formattedValues[0]} and ${formattedValues[1]}`;
            }
            
            // Oxford comma: "at hour 0, 12, and 18"
            const allButLast = formattedValues.slice(0, -1).join(', ');
            return `at ${singularUnit} ${allButLast}, and ${formattedValues[formattedValues.length - 1]}`;
        }
        
        if (allNames) {
            const names = parts.filter(p => p.type === 'name').map(p => numberToName(p.value, fieldType));
            if (names.length === 0) return null;
            if (names.length === 1) return `on ${names[0]}`;
            if (names.length === 2) return `on ${names[0]} and ${names[1]}`;
            const allButLast = names.slice(0, -1).join(', ');
            return `on ${allButLast}, and ${names[names.length - 1]}`;
        }
        
        for (const part of parts) {
            if (part.type === 'empty') continue;
            if (part.type === 'name') {
                const fullName = numberToName(part.value, fieldType);
                descriptions.push(`${fullName}`);
            }
            if (part.type === 'value') {
                let val = part.value;
                if (fieldType && !/^\d+$/.test(val)) {
                    const num = nameToNumber(val.toLowerCase(), fieldType);
                    if (num !== null) {
                        val = numberToName(num, fieldType);
                    }
                }
                descriptions.push(`${val}`);
            }
            if (part.type === 'interval') descriptions.push(`every ${part.step} ${unitName}`);
            if (part.type === 'range') {
                let s, e;
                if (namesArray) {
                    const offset = unitName.startsWith('month') ? 1 : 0;
                    s = namesArray[part.start - offset] || part.start;
                    e = namesArray[part.end - offset] || part.end;
                } else if (fieldType) {
                    s = numberToName(part.start, fieldType);
                    e = numberToName(part.end, fieldType);
                } else {
                    s = part.start;
                    e = part.end;
                }
                descriptions.push(`${s} through ${e}`);
            }
            if (part.type === 'range-step') {
                const rangeStepVal = `${part.start}-${part.end}/${part.step}`;
                descriptions.push(describeStepWithRange(rangeStepVal, unitName, namesArray, min, max));
            }
            if (part.type === 'random' && part.randInfo) {
                const randInfo = part.randInfo;
                if (randInfo.type === 'full-random') {
                    descriptions.push(`a random ${singularUnit}`);
                } else if (randInfo.start !== undefined && randInfo.end !== undefined) {
                    let s, e;
                    if (namesArray) {
                        const offset = unitName.startsWith('month') ? 1 : 0;
                        s = namesArray[randInfo.start - offset] || randInfo.start;
                        e = namesArray[randInfo.end - offset] || randInfo.end;
                    } else if (fieldType) {
                        s = numberToName(randInfo.start, fieldType);
                        e = numberToName(randInfo.end, fieldType);
                    } else {
                        s = randInfo.start;
                        e = randInfo.end;
                    }
                    descriptions.push(`random ${singularUnit} between ${s} and ${e}`);
                }
            }
        }
        
        if (descriptions.length === 0) return null;
        if (descriptions.length === 1) return descriptions[0];
        return descriptions.join(', ');
    }

    function describeCron(minute, hour, day, month, weekday, isFromShortcut = false) {
        // Check para @shortcuts - solo si viene de un @shortcut explícito
        if (isFromShortcut) {
            const shortcutMatch = tryMatchShortcut(minute, hour, day, month, weekday);
            if (shortcutMatch) {
                return shortcutMatch.desc;
            }
        }
        
        if (minute === '*' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
            return 'Every minute';
        }
        
        if (minute === '~' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
            return 'Random minute every hour';
        }

        if (isInterval(minute) && hour === '*' && day === '*' && month === '*' && weekday === '*') {
            const interval = minute.substring(2);
            return `Every ${interval} minutes`;
        }

        if (isInterval(hour) && day === '*' && month === '*' && weekday === '*') {
            const interval = hour.substring(2);
            if (minute === '0' || minute === '*') {
                return `Every ${interval} hours`;
            } else {
                return `Every ${interval} hours at minute ${minute}`;
            }
        }

        let desc = [];
        
        if (minute !== '*' && hour !== '*') {
            // Intentar generar combinaciones explícitas de tiempo
            const timeCombinations = formatTimeCombinations(minute, hour);
            
            if (timeCombinations.length > 0 && timeCombinations.length <= 24) {
                // Mostrar todas las combinaciones explícitamente
                if (timeCombinations.length === 1) {
                    desc.push(`at ${timeCombinations[0]}`);
                } else if (timeCombinations.length === 2) {
                    desc.push(`at ${timeCombinations[0]} and ${timeCombinations[1]}`);
                } else {
                    const allButLast = timeCombinations.slice(0, -1).join(', ');
                    desc.push(`at ${allButLast}, and ${timeCombinations[timeCombinations.length - 1]}`);
                }
            } else {
                // Muchas combinaciones - usar formato descriptivo
                if (isInterval(minute)) {
                    const interval = minute.substring(2);
                    desc.push(`every ${interval} minutes`);
                    if (isInterval(hour)) {
                        const hourInterval = hour.substring(2);
                        desc.push(`every ${hourInterval} hours`);
                    } else if (isStepWithRange(hour)) {
                        desc.push(describeStepWithRange(hour, 'hours', null, 0, 23));
                    } else if (isList(hour)) {
                        const parsed = parseComplexList(hour, 0, 23);
                        if (parsed && !parsed.some(p => p.type === 'empty')) {
                            desc.push(describeComplexList(parsed, 'hours', null, 0, 23));
                        } else {
                            desc.push(`at hour ${hour}`);
                        }
                    } else if (hour !== '*') {
                        desc.push(`at hour ${hour}`);
                    }
                } else if (isInterval(hour)) {
                    const hourInterval = hour.substring(2);
                    desc.push(`every ${hourInterval} hours`);
                    if (isStepWithRange(minute)) {
                        desc.push(describeStepWithRange(minute, 'minutes', null, 0, 59));
                    } else if (isList(minute)) {
                        const parsed = parseComplexList(minute, 0, 59);
                        if (parsed && !parsed.some(p => p.type === 'empty')) {
                            desc.push(describeComplexList(parsed, 'minutes', null, 0, 59));
                        } else {
                            desc.push(`at minute ${minute}`);
                        }
                    } else if (minute !== '*') {
                        desc.push(`at minute ${minute}`);
                    }
                } else if (isStepWithRange(minute)) {
                    desc.push(describeStepWithRange(minute, 'minutes', null, 0, 59));
                    if (isStepWithRange(hour)) {
                        desc.push(describeStepWithRange(hour, 'hours', null, 0, 23));
                    } else if (isList(hour)) {
                        const parsed = parseComplexList(hour, 0, 23);
                        if (parsed && !parsed.some(p => p.type === 'empty')) {
                            desc.push(describeComplexList(parsed, 'hours', null, 0, 23));
                        } else {
                            desc.push(`at hour ${hour}`);
                        }
                    } else if (hour !== '*') {
                        desc.push(`at hour ${hour}`);
                    }
                } else if (isStepWithRange(hour)) {
                    desc.push(describeStepWithRange(hour, 'hours', null, 0, 23));
                    if (isList(minute)) {
                        const parsed = parseComplexList(minute, 0, 59);
                        if (parsed && !parsed.some(p => p.type === 'empty')) {
                            desc.push(describeComplexList(parsed, 'minutes', null, 0, 59));
                        } else {
                            desc.push(`at minute ${minute}`);
                        }
                    } else if (minute !== '*') {
                        desc.push(`at minute ${minute}`);
                    }
                } else if (isList(minute) && isList(hour)) {
                    const minuteParsed = parseComplexList(minute, 0, 59);
                    const hourParsed = parseComplexList(hour, 0, 23);
                    if (minuteParsed && !minuteParsed.some(p => p.type === 'empty')) {
                        desc.push(describeComplexList(minuteParsed, 'minutes', null, 0, 59));
                    }
                    if (hourParsed && !hourParsed.some(p => p.type === 'empty')) {
                        desc.push(describeComplexList(hourParsed, 'hours', null, 0, 23));
                    }
                } else if (isList(minute)) {
                    const minuteParsed = parseComplexList(minute, 0, 59);
                    if (minuteParsed && !minuteParsed.some(p => p.type === 'empty')) {
                        desc.push(describeComplexList(minuteParsed, 'minutes', null, 0, 59));
                    }
                    desc.push(`at hour ${hour}`);
                } else if (isList(hour)) {
                    const hourParsed = parseComplexList(hour, 0, 23);
                    if (hourParsed && !hourParsed.some(p => p.type === 'empty')) {
                        desc.push(describeComplexList(hourParsed, 'hours', null, 0, 23));
                    }
                    desc.push(`at minute ${minute}`);
                } else if (isRandom(minute)) {
                    const randInfo = parseRandom(minute);
                    const hourStr = hour.padStart(2, '0');
                    if (randInfo && randInfo.type === 'full-random') {
                        desc.push(`at random minute at ${hourStr}:??`);
                    } else if (randInfo && randInfo.type === 'random-range') {
                        const minStrStart = randInfo.start.toString().padStart(2, '0');
                        const minStrEnd = randInfo.end.toString().padStart(2, '0');
                        desc.push(`at random minute (${minStrStart}-${minStrEnd}) at ${hourStr}:??`);
                    } else if (randInfo && randInfo.type === 'random-from') {
                        const minStrStart = randInfo.start.toString().padStart(2, '0');
                        desc.push(`at random minute from ${minStrStart} at ${hourStr}:??`);
                    } else if (randInfo && randInfo.type === 'random-to') {
                        const minStrEnd = randInfo.end.toString().padStart(2, '0');
                        desc.push(`at random minute up to ${minStrEnd} at ${hourStr}:??`);
                    } else {
                        desc.push(`at random minute at ${hourStr}:??`);
                    }
                } else {
                    // Fallback para casos no manejados
                    desc.push(`at minute ${minute}, at hour ${hour}`);
                }
            }
        } else if (minute !== '*') {
            if (isStepWithRange(minute)) {
                desc.push(describeStepWithRange(minute, 'minutes', null, 0, 59));
            } else if (isInterval(minute)) {
                const interval = minute.substring(2);
                desc.push(`every ${interval} minutes`);
            } else if (isRandom(minute)) {
                const randInfo = parseRandom(minute);
                if (randInfo && randInfo.type === 'full-random') {
                    desc.push(`at a random minute`);
                } else if (randInfo && randInfo.type === 'random-range') {
                    desc.push(`at a random minute between ${randInfo.start} and ${randInfo.end}`);
                } else if (randInfo && randInfo.type === 'random-from') {
                    desc.push(`at a random minute from ${randInfo.start}`);
                } else if (randInfo && randInfo.type === 'random-to') {
                    desc.push(`at a random minute up to ${randInfo.end}`);
                } else {
                    desc.push(`at a random minute`);
                }
            } else if (isList(minute)) {
                const parsed = parseComplexList(minute, 0, 59);
                if (parsed && !parsed.some(p => p.type === 'empty')) {
                    desc.push(describeComplexList(parsed, 'minutes', null, 0, 59));
                } else {
                    desc.push(`at minute ${minute}`);
                }
            } else {
                desc.push(`at minute ${minute}`);
            }
        } else if (hour !== '*') {
            if (isStepWithRange(hour)) {
                desc.push(describeStepWithRange(hour, 'hours', null, 0, 23));
            } else if (isInterval(hour)) {
                const interval = hour.substring(2);
                desc.push(`every ${interval} hours`);
            } else if (isRandom(hour)) {
                const randInfo = parseRandom(hour);
                if (randInfo && randInfo.type === 'full-random') {
                    desc.push(`at a random hour`);
                } else if (randInfo && randInfo.type === 'random-range') {
                    desc.push(`at a random hour between ${randInfo.start} and ${randInfo.end}`);
                } else if (randInfo && randInfo.type === 'random-from') {
                    desc.push(`at a random hour from ${randInfo.start}`);
                } else if (randInfo && randInfo.type === 'random-to') {
                    desc.push(`at a random hour up to ${randInfo.end}`);
                } else {
                    desc.push(`at a random hour`);
                }
            } else if (isList(hour)) {
                const parsed = parseComplexList(hour, 0, 23);
                if (parsed && !parsed.some(p => p.type === 'empty')) {
                    desc.push(describeComplexList(parsed, 'hours', null, 0, 23));
                } else {
                    desc.push(`at hour ${hour}`);
                }
            } else {
                desc.push(`at hour ${hour}`);
            }
        }

        if (day !== '*') {
            if (isInterval(day)) {
                const interval = day.substring(2);
                desc.push(`every ${interval} days`);
            } else if (isStepWithRange(day)) {
                desc.push(describeStepWithRange(day, 'days', null, 1, 31));
            } else if (isRandom(day)) {
                const randInfo = parseRandom(day);
                if (randInfo && randInfo.type === 'full-random') {
                    desc.push(`on a random day of the month`);
                } else if (randInfo && randInfo.type === 'random-range') {
                    desc.push(`on a random day between ${randInfo.start} and ${randInfo.end}`);
                } else if (randInfo && randInfo.type === 'random-from') {
                    desc.push(`on a random day from ${randInfo.start}`);
                } else if (randInfo && randInfo.type === 'random-to') {
                    desc.push(`on a random day up to ${randInfo.end}`);
                } else {
                    desc.push(`on a random day of the month`);
                }
            } else if (isList(day)) {
                const parsed = parseComplexList(day, 1, 31);
                if (parsed && !parsed.some(p => p.type === 'empty')) {
                    desc.push(describeComplexList(parsed, 'days', null, 1, 31));
                } else {
                    desc.push(`on day ${day} of the month`);
                }
            } else if (isRange(day)) {
                desc.push(`on day ${day} of the month`);
            } else {
                desc.push(`on day ${day} of the month`);
            }
        }

        if (month !== '*') {
            if (isInterval(month)) {
                const interval = month.substring(2);
                desc.push(`every ${interval} months`);
            } else if (isStepWithRange(month)) {
                desc.push(describeStepWithRange(month, 'months', monthNames, 1, 12));
            } else if (isRandom(month)) {
                const randInfo = parseRandom(month);
                if (randInfo && randInfo.type === 'full-random') {
                    desc.push(`in a random month`);
                } else if (randInfo && randInfo.type === 'random-range') {
                    const startMonth = monthNames[randInfo.start - 1] || randInfo.start;
                    const endMonth = monthNames[randInfo.end - 1] || randInfo.end;
                    desc.push(`in a random month between ${startMonth} and ${endMonth}`);
                } else if (randInfo && randInfo.type === 'random-from') {
                    const startMonth = monthNames[randInfo.start - 1] || randInfo.start;
                    desc.push(`in a random month from ${startMonth}`);
                } else if (randInfo && randInfo.type === 'random-to') {
                    const endMonth = monthNames[randInfo.end - 1] || randInfo.end;
                    desc.push(`in a random month up to ${endMonth}`);
                } else {
                    desc.push(`in a random month`);
                }
            } else if (isSimpleValue(month)) {
                const monthNum = parseInt(month);
                if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
                    desc.push(`in ${monthNames[monthNum - 1]}`);
                } else {
                    desc.push(`in month ${month}`);
                }
            } else if (isName(month, 'month')) {
                const monthNum = nameToNumber(month.toLowerCase(), 'month');
                if (monthNum !== null) {
                    desc.push(`in ${monthNames[monthNum - 1]}`);
                } else {
                    desc.push(`in month ${month}`);
                }
            } else if (isRange(month)) {
                const rangeParts = month.split('-');
                const startNum = parseInt(rangeParts[0]);
                const endNum = parseInt(rangeParts[1]);
                if (!isNaN(startNum) && !isNaN(endNum) && startNum >= 1 && startNum <= 12 && endNum >= 1 && endNum <= 12) {
                    desc.push(`in ${monthNames[startNum - 1]} through ${monthNames[endNum - 1]}`);
                } else if (isName(rangeParts[0], 'month') && isName(rangeParts[1], 'month')) {
                    const startNum = nameToNumber(rangeParts[0].toLowerCase(), 'month');
                    const endNum = nameToNumber(rangeParts[1].toLowerCase(), 'month');
                    if (startNum !== null && endNum !== null) {
                        desc.push(`in ${monthNames[startNum - 1]} through ${monthNames[endNum - 1]}`);
                    } else {
                        desc.push(`in month ${month}`);
                    }
                } else {
                    desc.push(`in month ${month}`);
                }
            } else if (isList(month)) {
                const parsed = parseComplexList(month, 1, 12, 'month');
                if (parsed && !parsed.some(p => p.type === 'empty')) {
                    desc.push(describeComplexList(parsed, 'months', monthNames, 1, 12, 'month'));
                } else {
                    desc.push(`in month ${month}`);
                }
            } else {
                desc.push(`in month ${month}`);
            }
        }

        if (weekday !== '*') {
            if (isInterval(weekday)) {
                const interval = weekday.substring(2);
                desc.push(`every ${interval} weekdays`);
            } else if (isStepWithRange(weekday)) {
                desc.push(describeStepWithRange(weekday, 'weekdays', weekdayNames, 0, 7));
            } else if (isRandom(weekday)) {
                const randInfo = parseRandom(weekday);
                if (randInfo && randInfo.type === 'full-random') {
                    desc.push(`on a random weekday`);
                } else if (randInfo && randInfo.type === 'random-range') {
                    const startDay = weekdayNames[randInfo.start] || randInfo.start;
                    const endDay = weekdayNames[randInfo.end] || randInfo.end;
                    desc.push(`on a random weekday between ${startDay} and ${endDay}`);
                } else if (randInfo && randInfo.type === 'random-from') {
                    const startDay = weekdayNames[randInfo.start] || randInfo.start;
                    desc.push(`on a random weekday from ${startDay}`);
                } else if (randInfo && randInfo.type === 'random-to') {
                    const endDay = weekdayNames[randInfo.end] || randInfo.end;
                    desc.push(`on a random weekday up to ${endDay}`);
                } else {
                    desc.push(`on a random weekday`);
                }
            } else if (isSimpleValue(weekday)) {
                const weekdayNum = parseInt(weekday);
                if (!isNaN(weekdayNum) && weekdayNum >= 0 && weekdayNum <= 7) {
                    const dayName = weekdayNum === 0 || weekdayNum === 7 ? weekdayNames[0] : weekdayNames[weekdayNum];
                    desc.push(`on ${dayName}`);
                } else {
                    desc.push(`on weekday ${weekday}`);
                }
            } else if (isName(weekday, 'weekday')) {
                const weekdayNum = nameToNumber(weekday.toLowerCase(), 'weekday');
                if (weekdayNum !== null) {
                    desc.push(`on ${weekdayNames[weekdayNum]}`);
                } else {
                    desc.push(`on weekday ${weekday}`);
                }
            } else if (isRange(weekday)) {
                const rangeParts = weekday.split('-');
                const startNum = parseInt(rangeParts[0]);
                const endNum = parseInt(rangeParts[1]);
                if (!isNaN(startNum) && !isNaN(endNum) && startNum >= 0 && startNum <= 6 && endNum >= 0 && endNum <= 6) {
                    const startDay = weekdayNames[startNum];
                    const endDay = weekdayNames[endNum];
                    desc.push(`on ${startDay} through ${endDay}`);
                } else if (isName(rangeParts[0], 'weekday') && isName(rangeParts[1], 'weekday')) {
                    const startNum = nameToNumber(rangeParts[0].toLowerCase(), 'weekday');
                    const endNum = nameToNumber(rangeParts[1].toLowerCase(), 'weekday');
                    if (startNum !== null && endNum !== null) {
                        desc.push(`on ${weekdayNames[startNum]} through ${weekdayNames[endNum]}`);
                    } else {
                        desc.push(`on weekday ${weekday}`);
                    }
                } else {
                    desc.push(`on weekday ${weekday}`);
                }
            } else if (isList(weekday)) {
                const parsed = parseComplexList(weekday, 0, 7, 'weekday');
                if (parsed && !parsed.some(p => p.type === 'empty')) {
                    desc.push(describeComplexList(parsed, 'weekdays', weekdayNames, 0, 7, 'weekday'));
                } else {
                    desc.push(`on weekday ${weekday}`);
                }
            } else {
                desc.push(`on weekday ${weekday}`);
            }
        }

        if (desc.length === 0) {
            return 'Custom schedule';
        }

        let result = desc.join(', ');
        return result.charAt(0).toUpperCase() + result.slice(1);
    }

    function updateFromInputs() {
        const cron = buildCronString();
        cronStringInput.value = cron;
        const parts = parseCronString(cron);
        if (parts) {
            cronResult.textContent = describeCron(parts.minute, parts.hour, parts.day, parts.month, parts.weekday);
            
            // Mostrar badge si coincide con shortcut
            const shortcutMatch = tryMatchShortcut(parts.minute, parts.hour, parts.day, parts.month, parts.weekday);
            if (shortcutMatch) {
                showShortcutBadge(shortcutMatch.shortcut);
            } else {
                hideShortcutBadge();
            }
        }
        validateAllFields();
    }

    function showShortcutBadge(shortcut) {
        let badge = document.querySelector('.shortcut-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'shortcut-badge';
            badge.textContent = `💡 Did you mean ${shortcut}?`;
            cronStringInput.parentNode.appendChild(badge);
        } else {
            badge.textContent = `💡 Did you mean ${shortcut}?`;
            badge.style.display = 'inline';
        }
    }

    function hideShortcutBadge() {
        const badge = document.querySelector('.shortcut-badge');
        if (badge) {
            badge.style.display = 'none';
        }
    }

    function updateFromCronString() {
        const cron = cronStringInput.value.trim();
        
        // Check para @shortcut
        const shortcut = parseShortcut(cron);
        if (shortcut) {
            if (shortcut.fields) {
                const { minute, hour, day, month, weekday } = shortcut.fields;
                minuteInput.value = minute === '*' ? '' : minute;
                hourInput.value = hour === '*' ? '' : hour;
                dayInput.value = day === '*' ? '' : day;
                monthInput.value = month === '*' ? '' : month;
                weekdayInput.value = weekday === '*' ? '' : weekday;
            } else {
                // @reboot - no tiene equivalencia en fields
                minuteInput.value = 'N/A';
                hourInput.value = 'N/A';
                dayInput.value = 'N/A';
                monthInput.value = 'N/A';
                weekdayInput.value = 'N/A';
            }
            
            cronResult.textContent = shortcut.desc;
            hideShortcutBadge();
            validateAllFields();
            return;
        }
        
        const parts = parseCronString(cron);
        
        if (!parts) {
            [minuteInput, hourInput, dayInput, monthInput, weekdayInput].forEach(input => {
                input.classList.add('error');
            });
            validationEl.className = 'cron-validation invalid';
            validationEl.innerHTML = '<span class="validation-icon">✗</span><span class="validation-message">Invalid cron format: must have exactly 5 fields separated by spaces</span>';
            cronResult.textContent = 'Invalid expression';
            return;
        }
        
        minuteInput.value = parts.minute === '*' ? '' : parts.minute;
        hourInput.value = parts.hour === '*' ? '' : parts.hour;
        dayInput.value = parts.day === '*' ? '' : parts.day;
        monthInput.value = parts.month === '*' ? '' : parts.month;
        weekdayInput.value = parts.weekday === '*' ? '' : parts.weekday;
        
        // Pasar true solo si el cron-string original comienza con @
        const isFromShortcut = cron.startsWith('@');
        cronResult.textContent = describeCron(parts.minute, parts.hour, parts.day, parts.month, parts.weekday, isFromShortcut);
        validateAllFields();
    }

    [minuteInput, hourInput, dayInput, monthInput, weekdayInput].forEach(input => {
        input.addEventListener('input', updateFromInputs);
    });

    cronStringInput.addEventListener('input', updateFromCronString);

    clearBtn.addEventListener('click', function() {
        minuteInput.value = '';
        hourInput.value = '';
        dayInput.value = '';
        monthInput.value = '';
        weekdayInput.value = '';
        cronStringInput.value = '* * * * *';
        cronResult.textContent = 'Every minute';
        validateAllFields();
    });
});