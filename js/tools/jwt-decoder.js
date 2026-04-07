document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('jwt-input');
    const decodeBtn = document.getElementById('decode-btn');
    const clearBtn = document.getElementById('clear-btn');
    const headerOutput = document.getElementById('jwt-header');
    const payloadOutput = document.getElementById('jwt-payload');
    const signatureOutput = document.getElementById('jwt-signature');
    const statusMessage = document.getElementById('status-message');

    function setStatus(message, isError) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message' + (isError ? ' error' : ' success');
    }

    function clearStatus() {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
    }

    function base64UrlDecode(str) {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        try {
            return atob(base64);
        } catch (e) {
            throw new Error('Invalid base64 encoding');
        }
    }

    decodeBtn.addEventListener('click', function() {
        clearStatus();
        headerOutput.textContent = '';
        payloadOutput.textContent = '';
        signatureOutput.textContent = '';

        const token = input.value.trim();
        if (!token) {
            setStatus('Error: No token provided', true);
            return;
        }

        const parts = token.split('.');
        if (parts.length !== 3) {
            setStatus('Error: Invalid JWT format (expected 3 parts)', true);
            return;
        }

        try {
            const header = JSON.parse(base64UrlDecode(parts[0]));
            headerOutput.textContent = JSON.stringify(header, null, 2);

            const payload = JSON.parse(base64UrlDecode(parts[1]));
            payloadOutput.textContent = JSON.stringify(payload, null, 2);

            signatureOutput.textContent = parts[2];

            setStatus('Success: JWT decoded', false);
        } catch (e) {
            setStatus('Error: ' + e.message, true);
        }
    });

    clearBtn.addEventListener('click', function() {
        input.value = '';
        headerOutput.textContent = '';
        payloadOutput.textContent = '';
        signatureOutput.textContent = '';
        clearStatus();
    });
});