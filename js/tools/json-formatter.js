document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('json-input');
    const output = document.getElementById('json-output');
    const formatBtn = document.getElementById('format-btn');
    const minifyBtn = document.getElementById('minify-btn');
    const validateBtn = document.getElementById('validate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const statusMessage = document.getElementById('status-message');

    function setStatus(message, isError) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message' + (isError ? ' error' : ' success');
    }

    function clearStatus() {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
    }

    formatBtn.addEventListener('click', function() {
        clearStatus();
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
            setStatus('Error: ' + e.message, true);
            output.value = '';
        }
    });

    minifyBtn.addEventListener('click', function() {
        clearStatus();
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
            setStatus('Error: ' + e.message, true);
            output.value = '';
        }
    });

    validateBtn.addEventListener('click', function() {
        clearStatus();
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
            setStatus('Error: Invalid JSON - ' + e.message, true);
            output.value = '';
        }
    });

    clearBtn.addEventListener('click', function() {
        input.value = '';
        output.value = '';
        clearStatus();
    });
});