(function init() {
    const editor = document.getElementById('json-input');
    const output = document.getElementById('json-output');
    const formatBtn = document.getElementById('format-btn');
    const minifyBtn = document.getElementById('minify-btn');
    const validateBtn = document.getElementById('validate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const statusMessage = document.getElementById('status-message');
    const cursorPosition = document.getElementById('cursor-position');

    function getEditorText() {
        return editor.innerText || '';
    }

    function setEditorContent(text) {
        editor.textContent = text;
    }

    function updateCursorPosition() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const node = selection.anchorNode;
        if (!node || node === editor) {
            cursorPosition.textContent = `Ln 1, Col 1`;
            return;
        }

        const text = editor.innerText || '';
        const offset = getTextOffset(editor, node, selection.anchorOffset);

        let line = 1;
        let column = 1;
        for (let i = 0; i < offset; i++) {
            if (text[i] === '\n') {
                line++;
                column = 1;
            } else {
                column++;
            }
        }

        cursorPosition.textContent = `Ln ${line}, Col ${column}`;
    }

    function getTextOffset(root, targetNode, targetOffset) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        let offset = 0;
        let node;

        while (node = walker.nextNode()) {
            if (node === targetNode) {
                return offset + targetOffset;
            }
            offset += node.textContent.length;
        }
        return offset;
    }

    function setStatus(message, isError) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message' + (isError ? ' error' : ' success');
    }

    function clearStatus() {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
    }

    function processJson(action) {
        clearStatus();
        const text = getEditorText().trim();
        if (!text) {
            setStatus('Error: No input provided', true);
            return;
        }
        try {
            const parsed = JSON.parse(text);
            if (action === 'format') {
                output.value = JSON.stringify(parsed, null, 2);
                setStatus('Success: JSON formatted', false);
            } else if (action === 'minify') {
                output.value = JSON.stringify(parsed);
                setStatus('Success: JSON minified', false);
            } else if (action === 'validate') {
                output.value = text;
                setStatus('Success: Valid JSON', false);
            }
        } catch (e) {
            setStatus(`Error: ${e.message}`, true);
            output.value = '';
        }
    }

    setEditorContent('');

    editor.addEventListener('input', updateCursorPosition);
    editor.addEventListener('keyup', updateCursorPosition);
    editor.addEventListener('click', updateCursorPosition);

    formatBtn.addEventListener('click', () => processJson('format'));
    minifyBtn.addEventListener('click', () => processJson('minify'));
    validateBtn.addEventListener('click', () => processJson('validate'));

    clearBtn.addEventListener('click', function() {
        setEditorContent('');
        output.value = '';
        clearStatus();
    });
})();