(function init() {
    const editorElement = document.getElementById('json-editor');
    const output = document.getElementById('json-output');
    const formatBtn = document.getElementById('format-btn');
    const minifyBtn = document.getElementById('minify-btn');
    const validateBtn = document.getElementById('validate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const statusMessage = document.getElementById('status-message');
    const cursorPosition = document.getElementById('cursor-position');

    let editorView = null;

    async function loadCodeMirror() {
        try {
            const { EditorView, basicSetup } = await import('codemirror');
            const { json } = await import('@codemirror/lang-json');

            editorView = new EditorView({
                doc: '',
                extensions: [
                    basicSetup,
                    json(),
                    ...(EditorView.lineWrapping ? [EditorView.lineWrapping] : [])
                ],
                parent: editorElement
            });

        } catch (error) {
            console.error('CodeMirror failed to load:', error);
            statusMessage.textContent = 'Error: Editor failed to load';
            statusMessage.className = 'status-message error';
        }
    }

    function setStatus(message, isError) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message' + (isError ? ' error' : ' success');
    }

    function clearStatus() {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
    }

    function getEditorContent() {
        return editorView ? editorView.state.doc.toString() : '';
    }

    function setEditorContent(text) {
        if (!editorView) return;
        editorView.dispatch({ changes: { from: 0, to: editorView.state.doc.length, insert: text } });
    }

    function processJson(action) {
        clearStatus();
        const text = getEditorContent().trim();
        if (!text) { setStatus('Error: No input provided', true); return; }
        try {
            const parsed = JSON.parse(text);
            if (action === 'format') { output.value = JSON.stringify(parsed, null, 2); setStatus('Success: JSON formatted', false); }
            else if (action === 'minify') { output.value = JSON.stringify(parsed); setStatus('Success: JSON minified', false); }
            else if (action === 'validate') { output.value = text; setStatus('Success: Valid JSON', false); }
        } catch (e) { setStatus(`Error: ${e.message}`, true); output.value = ''; }
    }

    function clearAll() {
        setEditorContent('');
        output.value = '';
        clearStatus();
        if (editorView) editorView.focus();
    }

    loadCodeMirror();

    formatBtn.addEventListener('click', () => processJson('format'));
    minifyBtn.addEventListener('click', () => processJson('minify'));
    validateBtn.addEventListener('click', () => processJson('validate'));
    clearBtn.addEventListener('click', clearAll);

    setTimeout(() => { if (editorView) editorView.focus(); }, 100);
})();
