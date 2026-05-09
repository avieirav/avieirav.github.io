document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('json-input');
    const lineNumbers = document.getElementById('line-numbers');
    const output = document.getElementById('json-output');
    const formatBtn = document.getElementById('format-btn');
    const minifyBtn = document.getElementById('minify-btn');
    const validateBtn = document.getElementById('validate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const statusMessage = document.getElementById('status-message');

    let lineMapping = [];

    // Update line numbers display
    function updateLineNumbers() {
        const lines = input.value.split('\n');

        // Clear existing line numbers
        lineNumbers.innerHTML = '';
        lineMapping = [];

        // Create hidden div for measuring text width
        const measureDiv = document.createElement('div');
        measureDiv.style.visibility = 'hidden';
        measureDiv.style.position = 'absolute';
        measureDiv.style.whiteSpace = 'pre-wrap';
        measureDiv.style.wordWrap = 'break-word';
        measureDiv.style.width = (input.clientWidth - 24) + 'px'; // minus padding
        measureDiv.style.font = getComputedStyle(input).font;
        document.body.appendChild(measureDiv);

        let globalLineIndex = 1;
        for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i];

            if (!lineText && lineText !== '') {
                globalLineIndex++;
                continue;
            }

            measureDiv.textContent = lineText || ' ';
            const lineHeight = 17; // matches CSS
            const visualLines = Math.ceil(measureDiv.scrollHeight / lineHeight);

            for (let j = 0; j < visualLines; j++) {
                const lineNum = document.createElement('div');
                lineNum.className = 'line-number';
                if (j === 0) {
                    lineNum.textContent = globalLineIndex;
                } else {
                    lineNum.textContent = '';
                    lineNum.style.visibility = 'hidden';
                }
                lineNumbers.appendChild(lineNum);
                lineMapping.push(globalLineIndex);
            }
            globalLineIndex++;
        }

        document.body.removeChild(measureDiv);

        // Update error highlighting
        clearErrorHighlight();

        // Auto-resize textarea
        resizeTextarea();
    }

    // Auto-resize textarea to fit content
    function resizeTextarea() {
        const lineHeight = 17;
        const paddingTop = 12;
        const paddingBottom = 12;
        const lineCount = lineNumbers.querySelectorAll('.line-number').length;
        const newHeight = (lineCount * lineHeight) + paddingTop + paddingBottom + 10;
        input.style.height = Math.max(120, newHeight) + 'px';
    }

    // Clear error highlighting
    function clearErrorHighlight() {
        const lineNumberElements = lineNumbers.querySelectorAll('.line-number');
        lineNumberElements.forEach(el => el.classList.remove('error'));
    }

    // Extract line number from JSON parse error
    function getErrorLineNumber(errorMessage, text) {
        let position = -1;

        // Chrome/Edge format: "Unexpected token } in JSON at position 42"
        let match = errorMessage.match(/at position (\d+)/i);
        if (match) {
            position = parseInt(match[1], 10);
        }

        // Firefox format: "at line 5 column 10 of the JSON data"
        match = errorMessage.match(/line (\d+)/i);
        if (match) {
            return parseInt(match[1], 10);
        }

        // If we have a byte position (Chrome/Edge), convert to line number
        if (position >= 0) {
            const encoder = new TextEncoder();
            let byteIndex = 0;
            let line = 1;

            for (let charIndex = 0; charIndex < text.length; charIndex++) {
                if (byteIndex >= position) {
                    return line;
                }
                byteIndex += encoder.encode(text[charIndex]).length;
                if (text[charIndex] === '\n') {
                    line++;
                }
            }
            return line;
        }

        return 1;
    }

    // Highlight error line
    function highlightErrorLine(lineNumber) {
        const lineNumberElements = lineNumbers.querySelectorAll('.line-number');
        const displayIndex = lineMapping.indexOf(lineNumber);
        if (displayIndex >= 0 && displayIndex < lineNumberElements.length) {
            lineNumberElements[displayIndex].classList.add('error');
        }
    }

    // Format JSON error message into readable structure
    function formatJsonError(errorMessage, text) {
        let line = 1;
        let column = 1;
        let errorDescription = errorMessage;

        // Chrome/Edge format: "Expected ',' or '}' after property value in JSON at position 12369 (line 300 column 21)"
        let match = errorMessage.match(/at position (\d+)/i);
        if (match) {
            const position = parseInt(match[1], 10);
            const encoder = new TextEncoder();
            let byteIndex = 0;
            let lineStart = 0;

            for (let i = 0; i < text.length; i++) {
                if (byteIndex >= position) {
                    lineStart = text.lastIndexOf('\n', i) + 1;
                    column = i - lineStart + 1;
                    break;
                }
                const charBytes = encoder.encode(text[i]).length;
                byteIndex += charBytes;
                if (text[i] === '\n') {
                    line++;
                    lineStart = i + 1;
                }
            }
            // Add line info to description
            errorDescription = errorMessage.replace(/at position \d+/, `at line ${line}, column ${column}`);
        }

        // Firefox format: "... at line 5 column 10 of the JSON data"
        match = errorMessage.match(/line (\d+) column (\d+)/i);
        if (match) {
            line = parseInt(match[1], 10);
            column = parseInt(match[2], 10);
        }

        // Try to extract the error type
        const errorTypes = [
            /Unexpected (token|character)/i,
            /Expected (.*?) after/i,
            /Expected (.*?) (at|before|instead)/i,
            /Unquoted identifier/i,
            /Missing (.*?) after/i,
            /Invalid (.*?)/i,
            /Unexpected end of (string|input)/i
        ];

        let errorType = 'Syntax Error';
        for (const pattern of errorTypes) {
            const typeMatch = errorMessage.match(pattern);
            if (typeMatch) {
                errorType = typeMatch[0];
                break;
            }
        }

        return {
            type: errorType,
            line: line,
            column: column,
            message: `Line ${line}, Column ${column}: ${errorType}`
        };
    }

    function setStatus(message, isError, errorInfo = null) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message' + (isError ? ' error' : ' success');
    }

    function setFormattedError(errorMessage, text) {
        const errorInfo = formatJsonError(errorMessage, text);
        const displayMessage = `Error at line ${errorInfo.line}, column ${errorInfo.column}: ${errorInfo.type}`;
        setStatus(displayMessage, true, errorInfo);
    }

    function clearStatus() {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
    }

    // Sync scroll between textarea and line numbers
    function syncScroll() {
        lineNumbers.scrollTop = input.scrollTop;
    }

    // Initialize line numbers on load
    updateLineNumbers();

    // Event listeners for input changes
    input.addEventListener('input', function() {
        updateLineNumbers();
    });

    input.addEventListener('scroll', function() {
        syncScroll();
    });

    formatBtn.addEventListener('click', function() {
        clearStatus();
        clearErrorHighlight();
        const text = input.value.trim();
        if (!text) {
            setStatus('Error: No input provided', true);
            return;
        }
        try {
            const parsed = JSON.parse(text);
            output.value = JSON.stringify(parsed, null, 2);
            setStatus('Success: JSON formatted', false);
        } catch (e) {
            const errorLine = getErrorLineNumber(e.message, input.value);
            highlightErrorLine(errorLine);
            setFormattedError(e.message, input.value);
            output.value = '';
        }
    });

    minifyBtn.addEventListener('click', function() {
        clearStatus();
        clearErrorHighlight();
        const text = input.value.trim();
        if (!text) {
            setStatus('Error: No input provided', true);
            return;
        }
        try {
            const parsed = JSON.parse(text);
            output.value = JSON.stringify(parsed);
            setStatus('Success: JSON minified', false);
        } catch (e) {
            const errorLine = getErrorLineNumber(e.message, input.value);
            highlightErrorLine(errorLine);
            setFormattedError(e.message, input.value);
            output.value = '';
        }
    });

    validateBtn.addEventListener('click', function() {
        clearStatus();
        clearErrorHighlight();
        const text = input.value.trim();
        if (!text) {
            setStatus('Error: No input provided', true);
            return;
        }
        try {
            JSON.parse(text);
            setStatus('Success: Valid JSON', false);
            output.value = text;
        } catch (e) {
            const errorLine = getErrorLineNumber(e.message, input.value);
            highlightErrorLine(errorLine);
            setFormattedError(e.message, input.value);
            output.value = '';
        }
    });

    clearBtn.addEventListener('click', function() {
        input.value = '';
        output.value = '';
        clearStatus();
        updateLineNumbers();
        resizeTextarea();
    });
});