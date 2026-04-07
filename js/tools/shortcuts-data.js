const shortcuts = [
    { category: "General", key: "Ctrl+Shift+P", action: "Show Command Palette" },
    { category: "General", key: "Ctrl+P", action: "Quick Open (Go to File)" },
    { category: "General", key: "Ctrl+Shift+N", action: "New Window" },
    { category: "General", key: "Ctrl+W", action: "Close Window" },
    { category: "General", key: "Ctrl+Shift+W", action: "Close Editor" },
    { category: "General", key: "Ctrl+K Ctrl+S", action: "Open Keyboard Shortcuts" },
    { category: "General", key: "Ctrl+,", action: "Open Settings" },
    { category: "General", key: "Ctrl+Q", action: "Quit VS Code" },
    { category: "General", key: "F11", action: "Toggle Full Screen" },
    { category: "General", key: "Ctrl+B", action: "Toggle Sidebar" },
    
    { category: "Basic Editing", key: "Ctrl+X", action: "Cut line (empty selection)" },
    { category: "Basic Editing", key: "Ctrl+C", action: "Copy line (empty selection)" },
    { category: "Basic Editing", key: "Ctrl+V", action: "Paste" },
    { category: "Basic Editing", key: "Ctrl+Shift+K", action: "Delete Line" },
    { category: "Basic Editing", key: "Ctrl+Enter", action: "Insert Line Below" },
    { category: "Basic Editing", key: "Ctrl+Shift+Enter", action: "Insert Line Above" },
    { category: "Basic Editing", key: "Alt+Up", action: "Move Line Up" },
    { category: "Basic Editing", key: "Alt+Down", action: "Move Line Down" },
    { category: "Basic Editing", key: "Shift+Alt+Up", action: "Copy Line Up" },
    { category: "Basic Editing", key: "Shift+Alt+Down", action: "Copy Line Down" },
    { category: "Basic Editing", key: "Ctrl+Z", action: "Undo" },
    { category: "Basic Editing", key: "Ctrl+Y", action: "Redo" },
    { category: "Basic Editing", key: "Ctrl+/", action: "Toggle Line Comment" },
    { category: "Basic Editing", key: "Shift+Alt+A", action: "Toggle Block Comment" },
    { category: "Basic Editing", key: "Ctrl+Shift+[", action: "Fold Region" },
    { category: "Basic Editing", key: "Ctrl+Shift+]", action: "Unfold Region" },
    { category: "Basic Editing", key: "Ctrl+K Ctrl+[", action: "Fold All Regions" },
    { category: "Basic Editing", key: "Ctrl+K Ctrl+]", action: "Unfold All Regions" },
    
    { category: "Multi-Cursor", key: "Alt+Click", action: "Insert Cursor" },
    { category: "Multi-Cursor", key: "Ctrl+Alt+Up", action: "Add Cursor Above" },
    { category: "Multi-Cursor", key: "Ctrl+Alt+Down", action: "Add Cursor Below" },
    { category: "Multi-Cursor", key: "Ctrl+Shift+L", action: "Select All Occurrences" },
    { category: "Multi-Cursor", key: "Ctrl+D", action: "Add Selection to Next Find Match" },
    { category: "Multi-Cursor", key: "Ctrl+K Ctrl+D", action: "Move Last Selection to Next Find Match" },
    { category: "Multi-Cursor", key: "Shift+Alt+I", action: "Insert Cursor at End of Each Line Selected" },
    
    { category: "Find & Replace", key: "Ctrl+F", action: "Find" },
    { category: "Find & Replace", key: "Ctrl+H", action: "Replace" },
    { category: "Find & Replace", key: "F3", action: "Find Next" },
    { category: "Find & Replace", key: "Shift+F3", action: "Find Previous" },
    { category: "Find & Replace", key: "Alt+Enter", action: "Select All Matches" },
    { category: "Find & Replace", key: "Ctrl+Shift+F", action: "Find in Files" },
    { category: "Find & Replace", key: "Ctrl+Shift+H", action: "Replace in Files" },
    
    { category: "Navigation", key: "Ctrl+T", action: "Go to Symbol in Workspace" },
    { category: "Navigation", key: "Ctrl+G", action: "Go to Line" },
    { category: "Navigation", key: "F12", action: "Go to Definition" },
    { category: "Navigation", key: "Alt+F12", action: "Peek Definition" },
    { category: "Navigation", key: "Ctrl+Shift+F12", action: "Go to Implementation" },
    { category: "Navigation", key: "Shift+F12", action: "Go to References" },
    { category: "Navigation", key: "Ctrl+Shift+.", action: "Go to Bracket" },
    { category: "Navigation", key: "Ctrl+Home", action: "Go to Beginning of File" },
    { category: "Navigation", key: "Ctrl+End", action: "Go to End of File" },
    { category: "Navigation", key: "Ctrl+Up", action: "Scroll Line Up" },
    { category: "Navigation", key: "Ctrl+Down", action: "Scroll Line Down" },
    { category: "Navigation", key: "Alt+Left", action: "Go Back" },
    { category: "Navigation", key: "Alt+Right", action: "Go Forward" },
    
    { category: "View", key: "Ctrl+Shift+E", action: "Show Explorer" },
    { category: "View", key: "Ctrl+Shift+F", action: "Show Search" },
    { category: "View", key: "Ctrl+Shift+G", action: "Show Source Control" },
    { category: "View", key: "Ctrl+Shift+D", action: "Show Debug" },
    { category: "View", key: "Ctrl+Shift+X", action: "Show Extensions" },
    { category: "View", key: "Ctrl+`", action: "Toggle Terminal" },
    { category: "View", key: "Ctrl+Shift+U", action: "Show Output Panel" },
    { category: "View", key: "Ctrl+Shift+M", action: "Show Problems Panel" },
    
    { category: "Terminal", key: "Ctrl+Shift+`", action: "Create New Terminal" },
    { category: "Terminal", key: "Ctrl+Shift+5", action: "Split Terminal" },
    { category: "Terminal", key: "Ctrl+PageUp", action: "Scroll Terminal Up" },
    { category: "Terminal", key: "Ctrl+PageDown", action: "Scroll Terminal Down" },
    
    { category: "Debug", key: "F5", action: "Start Debugging" },
    { category: "Debug", key: "Ctrl+F5", action: "Start Without Debugging" },
    { category: "Debug", key: "Shift+F5", action: "Stop Debugging" },
    { category: "Debug", key: "F9", action: "Toggle Breakpoint" },
    { category: "Debug", key: "Shift+F9", action: "Toggle Conditional Breakpoint" },
    { category: "Debug", key: "Ctrl+Shift+F5", action: "Restart Debugging" },
    { category: "Debug", key: "F10", action: "Step Over" },
    { category: "Debug", key: "F11", action: "Step Into" },
    { category: "Debug", key: "Shift+F11", action: "Step Out" },
    
    { category: "Refactoring", key: "F2", action: "Rename Symbol" },
    { category: "Refactoring", key: "Ctrl+Shift+R", action: "Refactor" },
    { category: "Refactoring", key: "Ctrl+K Ctrl+I", action: "Show Hover" },
    { category: "Refactoring", key: "Ctrl+.", action: "Quick Fix" },
    { category: "Refactoring", key: "Ctrl+Shift+O", action: "Go to Symbol in Editor" },
    
    { category: "Git", key: "Ctrl+Shift+G", action: "Show Git View" },
    { category: "Git", key: "Ctrl+Enter", action: "Commit (in Git view)" },
    { category: "Git", key: "Ctrl+Shift+Enter", action: "Commit with Message" },
    
    { category: "File Management", key: "Ctrl+N", action: "New File" },
    { category: "File Management", key: "Ctrl+O", action: "Open File" },
    { category: "File Management", key: "Ctrl+S", action: "Save" },
    { category: "File Management", key: "Ctrl+Shift+S", action: "Save As" },
    { category: "File Management", key: "Ctrl+K S", action: "Save All" },
    { category: "File Management", key: "Ctrl+K Ctrl+W", action: "Close All Editors" },
    { category: "File Management", key: "Ctrl+Shift+T", action: "Reopen Closed Editor" },
    { category: "File Management", key: "Ctrl+K Enter", action: "Keep Editor Open" },
    
    { category: "Window Management", key: "Ctrl+1", action: "Focus First Editor Group" },
    { category: "Window Management", key: "Ctrl+2", action: "Focus Second Editor Group" },
    { category: "Window Management", key: "Ctrl+3", action: "Focus Third Editor Group" },
    { category: "Window Management", key: "Ctrl+Shift+1", action: "Move Editor to First Group" },
    { category: "Window Management", key: "Ctrl+Shift+2", action: "Move Editor to Second Group" },
    { category: "Window Management", key: "Ctrl+Shift+3", action: "Move Editor to Third Group" },
    { category: "Window Management", key: "Ctrl+\\", action: "Split Editor" },
    { category: "Window Management", key: "Ctrl+K Ctrl+Left", action: "Move Editor Left" },
    { category: "Window Management", key: "Ctrl+K Ctrl+Right", action: "Move Editor Right" },
];

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('shortcut-search');
    const categorySelect = document.getElementById('category-select');
    const shortcutsBody = document.getElementById('shortcuts-body');

    const categories = [...new Set(shortcuts.map(s => s.category))].sort();
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });

    function renderShortcuts(filter = '', category = 'all') {
        shortcutsBody.innerHTML = '';
        
        const filtered = shortcuts.filter(s => {
            const matchesSearch = filter === '' || 
                s.key.toLowerCase().includes(filter.toLowerCase()) ||
                s.action.toLowerCase().includes(filter.toLowerCase());
            const matchesCategory = category === 'all' || s.category === category;
            return matchesSearch && matchesCategory;
        });

        filtered.forEach(s => {
            const row = document.createElement('tr');
            row.className = 'shortcut-row';
            
            const keyCell = document.createElement('td');
            keyCell.className = 'shortcut-key';
            keyCell.textContent = s.key;
            
            const actionCell = document.createElement('td');
            actionCell.className = 'shortcut-action';
            actionCell.textContent = s.action;
            
            const categoryCell = document.createElement('td');
            categoryCell.className = 'shortcut-category';
            categoryCell.textContent = s.category;
            
            row.appendChild(keyCell);
            row.appendChild(actionCell);
            row.appendChild(categoryCell);
            
            shortcutsBody.appendChild(row);
        });

        if (filtered.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 3;
            cell.textContent = 'No shortcuts found';
            cell.className = 'no-results';
            row.appendChild(cell);
            shortcutsBody.appendChild(row);
        }
    }

    renderShortcuts();

    searchInput.addEventListener('input', function() {
        renderShortcuts(this.value, categorySelect.value);
    });

    categorySelect.addEventListener('change', function() {
        renderShortcuts(searchInput.value, this.value);
    });
});