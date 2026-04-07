document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('base64-input');
    const output = document.getElementById('base64-output');
    const encodeBtn = document.getElementById('encode-btn');
    const decodeBtn = document.getElementById('decode-btn');
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

    encodeBtn.addEventListener('click', function() {
        clearStatus();
        const text = input.value;
        if (!text) {
            setStatus('Error: No input provided', true);
            return;
        }
        try {
            const encoded = btoa(text);
            output.value = encoded;
            setStatus('Success: Text encoded to Base64', false);
        } catch (e) {
            setStatus('Error: Cannot encode - ' + e.message, true);
            output.value = '';
        }
    });

    decodeBtn.addEventListener('click', function() {
        clearStatus();
        const text = input.value.trim();
        if (!text) {
            setStatus('Error: No input provided', true);
            return;
        }
        try {
            const decoded = atob(text);
            output.value = decoded;
            setStatus('Success: Base64 decoded to text', false);
        } catch (e) {
            setStatus('Error: Invalid Base64 string', true);
            output.value = '';
        }
    });

    clearBtn.addEventListener('click', function() {
        input.value = '';
        output.value = '';
        clearStatus();
    });
});