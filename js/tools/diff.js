document.addEventListener('DOMContentLoaded', function() {
    const leftInput = document.getElementById('diff-left');
    const rightInput = document.getElementById('diff-right');
    const fileLeft = document.getElementById('file-left');
    const fileRight = document.getElementById('file-right');
    const diffOutput = document.getElementById('diff-output');
    const diffBtn = document.getElementById('diff-btn');
    const swapBtn = document.getElementById('swap-btn');
    const clearBtn = document.getElementById('clear-btn');
    const modeSelect = document.getElementById('diff-mode-select');
    const layoutSelect = document.getElementById('diff-layout-select');
    const statusMessage = document.getElementById('status-message');
    const toolContainer = document.querySelector('.tool-container');
    const toggleOriginal = document.getElementById('toggle-original');
    const toggleModified = document.getElementById('toggle-modified');
    const toggleDiff = document.getElementById('toggle-diff');

    let swapped = false;
    let isScrolling = false;

    function syncScroll(source, target) {
        if (isScrolling) return;
        isScrolling = true;
        const scrollRatio = source.scrollTop / (source.scrollHeight - source.clientHeight);
        target.scrollTop = scrollRatio * (target.scrollHeight - target.clientHeight);
        setTimeout(() => { isScrolling = false; }, 10);
    }

    function setStatus(message, isError) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message' + (isError ? ' error' : ' success');
    }

    function clearStatus() {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
    }

    function loadFile(file, targetInput) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            targetInput.value = e.target.result;
        };
        reader.onerror = () => {
            setStatus('Error: Could not read file', true);
        };
        reader.readAsText(file);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function computeDiff() {
        const leftText = leftInput.value;
        const rightText = rightInput.value;

        if (!leftText.trim() || !rightText.trim()) {
            setStatus('Error: Both inputs are required', true);
            return;
        }

        const mode = modeSelect.value;
        let diff;

        try {
            if (mode === 'line') {
                diff = Diff.diffLines(leftText, rightText);
            } else if (mode === 'word') {
                diff = Diff.diffWords(leftText, rightText);
            } else {
                diff = Diff.diffChars(leftText, rightText);
            }

            renderDiff(diff);
            setStatus('Success: Diff computed', false);
        } catch (error) {
            setStatus('Error: ' + error.message, true);
        }
    }

    function renderDiff(diff) {
        let html = '<div class="diff-container">';

        diff.forEach((part) => {
            const escapedText = escapeHtml(part.value);
            if (part.added) {
                html += `<span class="diff-added">${escapedText}</span>`;
            } else if (part.removed) {
                html += `<span class="diff-removed">${escapedText}</span>`;
            } else {
                html += `<span class="diff-unchanged">${escapedText}</span>`;
            }
        });

        html += '</div>';
        diffOutput.innerHTML = html;
    }

    function swapInputs() {
        const temp = leftInput.value;
        leftInput.value = rightInput.value;
        rightInput.value = temp;
        swapped = !swapped;
        setStatus(swapped ? 'Swapped: Right is now Left' : 'Swapped: Left is now Right', false);
        computeDiff();
    }

    function clearAll() {
        leftInput.value = '';
        rightInput.value = '';
        diffOutput.innerHTML = '';
        clearStatus();
        leftInput.focus();
    }

    fileLeft.addEventListener('change', (e) => loadFile(e.target.files[0], leftInput));
    fileRight.addEventListener('change', (e) => loadFile(e.target.files[0], rightInput));

    diffBtn.addEventListener('click', computeDiff);
    swapBtn.addEventListener('click', swapInputs);
    clearBtn.addEventListener('click', clearAll);

    modeSelect.addEventListener('change', () => {
        if (leftInput.value && rightInput.value) {
            computeDiff();
        }
    });

    layoutSelect.addEventListener('change', () => {
        toolContainer.className = 'tool-container diff-layout-' + layoutSelect.value;
        toolContainer.classList.toggle('diff-hidden', !toggleOriginal.checked);
        toolContainer.classList.toggle('diff-hidden-modified', !toggleModified.checked);
        toolContainer.classList.toggle('diff-hidden-diff', !toggleDiff.checked);
    });

    toolContainer.className = 'tool-container diff-layout-horizontal';
    layoutSelect.value = 'horizontal';

    toggleOriginal.addEventListener('change', () => {
        toolContainer.classList.toggle('diff-hidden', !toggleOriginal.checked);
    });

    toggleModified.addEventListener('change', () => {
        toolContainer.classList.toggle('diff-hidden-modified', !toggleModified.checked);
    });

    toggleDiff.addEventListener('change', () => {
        toolContainer.classList.toggle('diff-hidden-diff', !toggleDiff.checked);
    });

    leftInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            computeDiff();
        }
    });

    leftInput.addEventListener('scroll', () => syncScroll(leftInput, rightInput));
    rightInput.addEventListener('scroll', () => syncScroll(rightInput, leftInput));
});