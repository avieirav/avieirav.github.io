document.addEventListener('DOMContentLoaded', function() {
    const mermaid = window.mermaid;
    const dagre = window.dagre;

    if (!mermaid) {
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) statusMessage.textContent = 'Error: Mermaid library not loaded';
        return;
    }
    if (!dagre) {
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) statusMessage.textContent = 'Error: Dagre library not loaded';
        return;
    }

    mermaid.initialize({ startOnLoad: false });

    const input = document.getElementById('mermaid-input');
    const output = document.getElementById('canvas-output');
    const preview = document.getElementById('mermaid-preview');
    const jsonCanvasPreview = document.getElementById('json-canvas-preview');
    const convertBtn = document.getElementById('convert-btn');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const clearBtn = document.getElementById('clear-btn');
    const statusMessage = document.getElementById('status-message');

    let scale = 1, panOffsetX = 0, panOffsetY = 0;
    let isDragging = false, isPanning = false, isSpacePressed = false;
    let selectedElement = null, startX = 0, startY = 0;
    let canvasJsonData = { nodes: [], edges: [] };
    let currentDirection = 'TD';
    const ZOOM_SPEED = 0.1;
    const minScale = 0.35;
    const maxScale = 1.25;
    const NODE_WIDTH = 200;
    const NODE_HEIGHT = 100;
    const SPACING_X = 250;
    const SPACING_Y = 180;

    const COLOR_MAP = {
        '#f96': '2',
        '#9f6': '4',
        '#69f': '6',
        '#f66': '1',
        '#ff6': '3',
        '#6f6': '4',
        '#6ff': '5',
        '#f6f': '6',
        '#ff9966': '2',
        '#99ff66': '4',
        '#6699ff': '6',
        '#ff6666': '1',
        '#ffff66': '3',
        '#66ff66': '4',
        '#66ffff': '5',
        '#ff66ff': '6',
    };

    function setStatus(message, isError) {
        if (isError) {
            statusMessage.textContent = message;
            statusMessage.className = 'status-message error';
        } else if (message) {
            statusMessage.textContent = '';
            statusMessage.className = 'status-message';
            showPopup(message);
        }
    }

    function showPopup(message) {
        const popup = document.createElement('div');
        popup.className = 'status-popup';
        popup.textContent = message;
        popup.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--accent-color, #4f46e5);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: var(--font-sans, sans-serif);
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: popup-fade 2s ease-in-out forwards;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes popup-fade {
                0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                10% { opacity: 1; transform: translateX(-50%) translateY(0); }
                80% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(popup);

        setTimeout(() => {
            popup.remove();
            style.remove();
        }, 2000);
    }

    function clearStatus() {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
    }

    function cleanIconLabel(text) {
        return text.replace(/^(fa:fa-[a-z0-9-]+\s*|fa-[a-z0-9-]+\s*|icon:[a-z0-9-]+\s*)+/i, '').trim();
    }

function extractGraphData(mermaidCode) {
        const nodes = new Map();
        const edges = [];
        const nodeStyles = new Map();
        
        const lines = mermaidCode.split('\n');
        
        let graphDirection = 'TD';
        const graphLine = lines.find(line => line.trim().match(/^(graph|flowchart)\s+(TD|LR|BT|RL)/i));
        if (graphLine) {
            const match = graphLine.match(/^(graph|flowchart)\s+(TD|LR|BT|RL)/i);
            if (match) {
                graphDirection = match[2].toUpperCase();
            }
        }

        lines.forEach(line => {
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('classDef')) {
                const classMatch = trimmedLine.match(/classDef\s+(\w+)\s+([^:]+)(?::(.+))?/i);
                if (classMatch) {
                    const className = classMatch[1];
                    const styles = classMatch[3] || classMatch[2];
                    const styleMap = {};
                    styles.split(',').forEach(s => {
                        const [key, val] = s.split(':').map(x => x.trim());
                        if (key && val) styleMap[key] = val;
                    });
                    if (styleMap.fill) {
                        const colorMap = { '#e1f5fe': '5', '#f3f4f6': '2', '#fdf4ff': '6', '#fee2e2': '1', '#fffbeb': '3' };
                        nodeStyles.set(className, { color: colorMap[styleMap.fill] || null });
                    }
                }
                return;
            }
            
            if (trimmedLine.startsWith('style')) {
                const styleMatch = trimmedLine.match(/style\s+([a-zA-Z0-9_]+)\s+([^,]+)/i);
                if (styleMatch) {
                    const nodeId = styleMatch[1];
                    const styleStr = styleMatch[2];
                    const styleMap = {};
                    styleStr.split(',').forEach(s => {
                        const [key, val] = s.split(':').map(x => x.trim());
                        if (key && val) styleMap[key] = val;
                    });
                    if (styleMap.fill) {
                        const colorMap = { '#e1f5fe': '5', '#f3f4f6': '2', '#fdf4ff': '6', '#fee2e2': '1', '#fffbeb': '3' };
                        if (nodes.has(nodeId)) {
                            nodes.get(nodeId).color = colorMap[styleMap.fill] || null;
                        }
                    }
                }
                return;
            }
        });

        const nodePatterns = [
            /\[([^\]]*)\]/,
            /\{([^}]*)\}/,
            /\(([^)]*)\)/,
            /\[([^\]]*)\]/,
            /\(\(([^)]*)\)\)/,
            /\{([^{}]*)\}/,
            />([^<]*)</
        ];

        const nodeShapeReplacements = {
            '[': '', ']': '',
            '{': '', '}': '',
            '(': '', ')': '',
            '>': '', '<': '',
            '/': '',
            '"': ''
        };

        function extractNodeIdAndLabel(line) {
            const idMatch = line.match(/^([a-zA-Z0-9_]+)\s*(.*)$/);
            if (!idMatch) return null;
            
            const nodeId = idMatch[1];
            let rest = idMatch[2];
            
            let label = nodeId;
            
            if (rest) {
                for (const [chars, replacement] of Object.entries(nodeShapeReplacements)) {
                    rest = rest.replace(new RegExp('\\' + chars, 'g'), '');
                }
                rest = rest.replace(/:::\w+$/, '').trim();
                const labelMatch = rest.match(/^(?:\s*(\S.*?))?\s*$/);
                if (labelMatch && labelMatch[1]) {
                    label = labelMatch[1].trim();
                }
            }
            
            return { id: nodeId, label: label || nodeId };
        }

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine === 'end' || 
                trimmedLine.startsWith('graph') || 
                trimmedLine.startsWith('flowchart') || 
                trimmedLine.startsWith('subgraph') ||
                trimmedLine.startsWith('%%') ||
                trimmedLine.startsWith('classDef') ||
                trimmedLine.startsWith('style') ||
                trimmedLine.startsWith('click') ||
                trimmedLine === '') {
                return;
            }

            const parts = trimmedLine.split(/\s*(-->|==>|~>|-+>|--?\.+>?)\s*/);
            
            if (parts.length >= 3) {
                const fromPart = parts[0].trim();
                const toPart = parts[parts.length - 1].trim();
                
                const fromNode = extractNodeIdAndLabel(fromPart);
                const toNode = extractNodeIdAndLabel(toPart);
                
                let edgeLabel = null;
                if (parts.length > 2) {
                    const middle = trimmedLine.substring(fromPart.length, trimmedLine.length - toPart.length);
                    const labelMatch = middle.match(/\|([^|]+)\|/);
                    if (labelMatch) {
                        edgeLabel = labelMatch[1].trim();
                    }
                }
                
                if (fromNode && toNode) {
                    if (!nodes.has(fromNode.id)) {
                        nodes.set(fromNode.id, {
                            id: fromNode.id,
                            label: cleanIconLabel(fromNode.label),
                            color: null
                        });
                    }
                    if (!nodes.has(toNode.id)) {
                        nodes.set(toNode.id, {
                            id: toNode.id,
                            label: cleanIconLabel(toNode.label),
                            color: null
                        });
                    }
                    
                    edges.push({
                        from: fromNode.id,
                        to: toNode.id,
                        label: edgeLabel
                    });
                }
            } else {
                const nodeInfo = extractNodeIdAndLabel(trimmedLine);
                if (nodeInfo && !nodes.has(nodeInfo.id)) {
                    nodes.set(nodeInfo.id, {
                        id: nodeInfo.id,
                        label: cleanIconLabel(nodeInfo.label),
                        color: null
                    });
                }
            }
        });

        return {
            nodes: Array.from(nodes.values()),
            edges: edges,
            direction: graphDirection
        };
    }

    function calculateLayout(graphData, direction) {
        const graph = new dagre.graphlib.Graph();
        graph.setGraph({
            rankdir: direction,
            nodesep: SPACING_X,
            ranksep: SPACING_Y,
            edgesep: 50
        });

        graph.setDefaultEdgeLabel(function() { return {}; });

        graphData.nodes.forEach(node => {
            const textLength = node.label.length;
            const estimatedWidth = Math.max(NODE_WIDTH, 120 + (textLength * 8));
            
            graph.setNode(node.id, {
                width: estimatedWidth,
                height: NODE_HEIGHT,
                label: node.label
            });
        });

        graphData.edges.forEach(edge => {
            graph.setEdge(edge.from, edge.to);
        });

        dagre.layout(graph);

        const positionedNodes = graphData.nodes.map(node => {
            const nodeData = graph.node(node.id);
            return {
                ...node,
                x: nodeData.x - (graph.node(node.id).width / 2),
                y: nodeData.y - (NODE_HEIGHT / 2),
                width: graph.node(node.id).width,
                height: NODE_HEIGHT
            };
        });

        return positionedNodes;
    }

    function generateCanvasJson(positionedNodes, edges) {
        return {
            nodes: positionedNodes.map(node => {
                const nodeData = {
                    id: node.id,
                    type: 'text',
                    text: node.label,
                    x: Math.round(node.x),
                    y: Math.round(node.y),
                    width: Math.round(node.width),
                    height: NODE_HEIGHT
                };
                
                if (node.color) {
                    nodeData.color = node.color;
                }
                
                return nodeData;
            }),
            edges: edges.map((edge, i) => {
                const edgeData = {
                    id: `edge-${i}`,
                    fromNode: edge.from,
                    toNode: edge.to
                };
                
                if (edge.label) {
                    edgeData.label = edge.label;
                }
                
                return edgeData;
            })
        };
    }

    async function convertMermaidToCanvas() {
        const mermaidCode = input.value.trim();
        if (!mermaidCode) {
            setStatus('Error: No input provided', true);
            return;
        }

        const flowchartPattern = /^\s*(graph|flowchart)\s+(TD|LR|BT|RL)/i;
        if (!flowchartPattern.test(mermaidCode)) {
            setStatus('Error: Only flowcharts (graph/flowchart) are supported', true);
            return;
        }

        try {
            await mermaid.parse(mermaidCode);
            
            await renderPreview(mermaidCode);
            
            const graphData = extractGraphData(mermaidCode);
            
            const direction = graphData.direction || 'TD';
            currentDirection = direction;
            const positionedNodes = calculateLayout(graphData, direction);
            
            const canvasJson = generateCanvasJson(positionedNodes, graphData.edges);
            
            output.value = JSON.stringify(canvasJson, null, 2);
            jsonCanvasPreview.textContent = JSON.stringify(canvasJson, null, 2);
            await renderJsonCanvasPreview(canvasJson);
            setStatus('Success: Converted to JSON Canvas', false);
            
        } catch (error) {
            setStatus('Error: ' + error.message, true);
            output.value = '';
            preview.innerHTML = '<em class="error">Preview not available - check syntax</em>';
            preview.closest('.preview-container').classList.remove('has-content');
        }
    }

    function copyToClipboard() {
        const json = output.value.trim();
        if (!json) {
            setStatus('Error: No canvas data to copy', true);
            return;
        }
        
        navigator.clipboard.writeText(json)
            .then(() => setStatus('Success: Copied to clipboard', false))
            .catch(err => setStatus('Error: Could not copy to clipboard', true));
    }

    function downloadJson() {
        const json = output.value.trim();
        if (!json) {
            setStatus('Error: No canvas data to download', true);
            return;
        }

        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'canvas.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus('Success: JSON downloaded', false);
    }

    function clearAll() {
        input.value = '';
        output.value = '';
        preview.innerHTML = '';
        jsonCanvasPreview.innerHTML = '';
        clearStatus();
        input.focus();
        document.querySelectorAll('.preview-container').forEach(c => c.classList.remove('has-content'));
    }

    async function renderPreview(mermaidCode) {
        try {
            preview.innerHTML = '';
            const { svg } = await mermaid.render('mermaid-preview-' + Date.now(), mermaidCode);
            preview.innerHTML = svg;
            preview.closest('.preview-container').classList.add('has-content');
        } catch (e) {
            preview.innerHTML = '<em>Preview not available</em>';
            preview.closest('.preview-container').classList.remove('has-content');
        }
    }

    function getAnchorPoint(node, side) {
        const x = parseInt(node.style.left, 10) || 0;
        const y = parseInt(node.style.top, 10) || 0;
        const width = node.offsetWidth;
        const height = node.offsetHeight;

        switch (side) {
            case 'top': return { x: x + width / 2, y: y };
            case 'right': return { x: x + width, y: y + height / 2 };
            case 'bottom': return { x: x + width / 2, y: y + height };
            case 'left': return { x: x, y: y + height / 2 };
            default: return { x: x + width / 2, y: y + height / 2 };
        }
    }

function generatePathD(fromPoint, toPoint) {
        return `M ${fromPoint.x} ${fromPoint.y} L ${toPoint.x} ${toPoint.y}`;
    }

function drawEdges(container) {
        const svgContainer = container.querySelector('.canvas-edges');
        if (!svgContainer) return;
        svgContainer.innerHTML = '';

        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-color, #6b7280)" />
            </marker>
        `;
        svgContainer.appendChild(defs);

        canvasJsonData.edges.forEach(edge => {
            const fromNode = container.querySelector(`[data-node-id="${edge.fromNode}"]`);
            const toNode = container.querySelector(`[data-node-id="${edge.toNode}"]`);

            if (fromNode && toNode) {
                let fromSide, toSide;
                if (currentDirection === 'LR') {
                    fromSide = 'right';
                    toSide = 'left';
                } else {
                    fromSide = 'bottom';
                    toSide = 'top';
                }
                const fromPoint = getAnchorPoint(fromNode, fromSide);
                const toPoint = getAnchorPoint(toNode, toSide);

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', generatePathD(fromPoint, toPoint));
                path.setAttribute('stroke', 'var(--text-color, #6b7280)');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('fill', 'none');
                path.setAttribute('marker-end', 'url(#arrow)');
                svgContainer.appendChild(path);

                if (edge.label) {
                    const midX = (fromPoint.x + toPoint.x) / 2;
                    const midY = (fromPoint.y + toPoint.y) / 2;
                    const labelWidth = edge.label.length * 8 + 16;
                    const labelHeight = 20;

                    const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    labelBg.setAttribute('x', midX - labelWidth / 2);
                    labelBg.setAttribute('y', midY - labelHeight / 2);
                    labelBg.setAttribute('width', labelWidth);
                    labelBg.setAttribute('height', labelHeight);
                    labelBg.setAttribute('rx', '4');
                    labelBg.setAttribute('fill', 'var(--code-bg, #f3f4f6)');
                    labelBg.setAttribute('stroke', 'var(--border-color, #d1d5db)');
                    svgContainer.appendChild(labelBg);

                    const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    labelText.setAttribute('x', midX);
                    labelText.setAttribute('y', midY + 1);
                    labelText.setAttribute('text-anchor', 'middle');
                    labelText.setAttribute('dominant-baseline', 'middle');
                    labelText.setAttribute('fill', 'var(--text-color, #374151)');
                    labelText.setAttribute('font-size', '12');
                    labelText.textContent = edge.label;
                    svgContainer.appendChild(labelText);
                }
            }
        });
    }

    function updateCanvasJson() {
        const previewContainer = jsonCanvasPreview.closest('.preview-container');
        const nodes = previewContainer.querySelectorAll('.canvas-node');

        canvasJsonData.nodes = Array.from(nodes).map(node => {
            const nodeId = node.getAttribute('data-node-id');
            const originalNode = canvasJsonData.nodes.find(n => n.id === nodeId);
            return {
                id: nodeId,
                type: 'text',
                text: node.querySelector('.node-text-content')?.textContent || '',
                x: parseInt(node.style.left, 10) || 0,
                y: parseInt(node.style.top, 10) || 0,
                width: node.offsetWidth,
                height: node.offsetHeight,
                color: originalNode?.color || null
            };
        });

        output.value = JSON.stringify(canvasJsonData, null, 2);
    }

    function applyPanAndZoom() {
        const previewContainer = jsonCanvasPreview.closest('.preview-container');
        const canvasNodes = previewContainer.querySelector('.canvas-nodes');
        if (canvasNodes) {
            canvasNodes.style.transform = `translate(${panOffsetX}px, ${panOffsetY}px) scale(${scale})`;
        }
    }

    function adjustCanvasToViewport() {
        const previewContainer = jsonCanvasPreview.closest('.preview-container');
        const canvasNodes = previewContainer?.querySelector('.canvas-nodes');
        if (!canvasNodes) return;

        const nodes = canvasNodes.querySelectorAll('.canvas-node');
        if (nodes.length === 0) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        nodes.forEach(node => {
            const x = parseInt(node.style.left, 10) || 0;
            const y = parseInt(node.style.top, 10) || 0;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x + node.offsetWidth);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y + node.offsetHeight);
        });

        const boundingBoxWidth = maxX - minX;
        const boundingBoxHeight = maxY - minY;
        const viewportWidth = previewContainer?.clientWidth || window.innerWidth;
        const viewportHeight = previewContainer?.clientHeight || window.innerHeight;

        const scaleX = viewportWidth / (boundingBoxWidth + 100);
        const scaleY = viewportHeight / (boundingBoxHeight + 100);
        scale = Math.min(scaleX, scaleY, 1);

        panOffsetX = (viewportWidth - boundingBoxWidth * scale) / 2 - minX * scale;
        panOffsetY = (viewportHeight - boundingBoxHeight * scale) / 2 - minY * scale;

        applyPanAndZoom();
    }

    function renderJsonCanvasPreview(jsonCanvas) {
        try {
            canvasJsonData = JSON.parse(JSON.stringify(jsonCanvas));
            const nodes = canvasJsonData.nodes || [];
            const edges = canvasJsonData.edges || [];

            if (nodes.length === 0) {
                jsonCanvasPreview.innerHTML = '<em>No nodes to display</em>';
                jsonCanvasPreview.closest('.preview-container').classList.remove('has-content');
                return;
            }

            jsonCanvasPreview.innerHTML = `
                <div class="canvas-container">
                    <div class="canvas-nodes">
                        <svg class="canvas-edges"></svg>
                    </div>
                    <div class="canvas-controls">
                        <button class="canvas-btn" id="canvas-dir-toggle" title="Toggle direction (TD/LR)">↔</button>
                        <button class="canvas-btn" id="canvas-zoom-in" title="Zoom in">+</button>
                        <button class="canvas-btn" id="canvas-zoom-out" title="Zoom out">-</button>
                        <button class="canvas-btn" id="canvas-zoom-reset" title="Reset">⟲</button>
                    </div>
                </div>
            `;

            const container = jsonCanvasPreview;
            const canvasNodes = container.querySelector('.canvas-nodes');
            const svgContainer = container.querySelector('.canvas-edges');

            svgContainer.style.position = 'absolute';
            svgContainer.style.top = '0';
            svgContainer.style.left = '0';
            svgContainer.style.width = '10000px';
            svgContainer.style.height = '10000px';
            svgContainer.style.pointerEvents = 'none';
            svgContainer.style.zIndex = '1';
            svgContainer.style.overflow = 'visible';

            nodes.forEach(node => {
                const nodeEl = document.createElement('div');
                nodeEl.className = 'canvas-node';
                nodeEl.setAttribute('data-node-id', node.id);
                nodeEl.style.left = `${node.x}px`;
                nodeEl.style.top = `${node.y}px`;
                nodeEl.style.width = `${node.width}px`;
                nodeEl.style.height = `${node.height}px`;

                if (node.color) {
                    nodeEl.style.background = `hsl(${node.color * 60}, 70%, 50%)`;
                }

                nodeEl.innerHTML = `<div class="node-text-content">${node.text}</div>`;
                canvasNodes.appendChild(nodeEl);
            });

            adjustCanvasToViewport();
            drawEdges(container);
            jsonCanvasPreview.closest('.preview-container').classList.add('has-content');

            container.querySelector('#canvas-zoom-in')?.addEventListener('click', () => {
                scale = Math.min(scale + ZOOM_SPEED, maxScale);
                applyPanAndZoom();
            });

            container.querySelector('#canvas-zoom-out')?.addEventListener('click', () => {
                scale = Math.max(scale - ZOOM_SPEED, minScale);
                applyPanAndZoom();
            });

            container.querySelector('#canvas-zoom-reset')?.addEventListener('click', adjustCanvasToViewport);

            container.querySelector('#canvas-dir-toggle')?.addEventListener('click', () => {
                currentDirection = currentDirection === 'TD' ? 'LR' : 'TD';
                const graphData = {
                    nodes: canvasJsonData.nodes.map(n => ({ id: n.id, label: n.text, color: n.color })),
                    edges: canvasJsonData.edges.map(e => ({ from: e.fromNode, to: e.toNode, label: e.label })),
                    direction: currentDirection
                };
                const positionedNodes = calculateLayout(graphData, currentDirection);
                canvasJsonData.nodes = positionedNodes.map((node, i) => ({
                    id: node.id,
                    type: 'text',
                    text: node.label,
                    x: node.x,
                    y: node.y,
                    width: node.width,
                    height: NODE_HEIGHT,
                    color: node.color
                }));
                const nodeElements = container.querySelectorAll('.canvas-node');
                canvasJsonData.nodes.forEach((node, i) => {
                    if (nodeElements[i]) {
                        nodeElements[i].style.left = `${node.x}px`;
                        nodeElements[i].style.top = `${node.y}px`;
                    }
                });
                drawEdges(container);
                adjustCanvasToViewport();
                output.value = JSON.stringify(canvasJsonData, null, 2);
            });

            const nodeElements = container.querySelectorAll('.canvas-node');
            nodeElements.forEach(nodeEl => {
                nodeEl.addEventListener('mousedown', function(e) {
                    if (isSpacePressed) return;
                    e.stopPropagation();
                    isDragging = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    selectedElement = this;
                    this.classList.add('is-dragging');
                });
            });

            window.addEventListener('mousemove', (e) => {
                if (isDragging && selectedElement) {
                    const dx = (e.clientX - startX) / scale;
                    const dy = (e.clientY - startY) / scale;
                    const currentLeft = parseInt(selectedElement.style.left, 10) || 0;
                    const currentTop = parseInt(selectedElement.style.top, 10) || 0;
                    selectedElement.style.left = `${currentLeft + dx}px`;
                    selectedElement.style.top = `${currentTop + dy}px`;
                    startX = e.clientX;
                    startY = e.clientY;
                    drawEdges(container);
                }

                if (isPanning) {
                    panOffsetX = e.clientX;
                    panOffsetY = e.clientY;
                    applyPanAndZoom();
                }
            });

            window.addEventListener('mouseup', () => {
                if (isDragging && selectedElement) {
                    selectedElement.classList.remove('is-dragging');
                    isDragging = false;
                    selectedElement = null;
                    updateCanvasJson();
                }
                if (isPanning) {
                    isPanning = false;
                }
            });

            container.addEventListener('wheel', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (e.deltaY > 0) {
                        scale = Math.max(scale - ZOOM_SPEED, minScale);
                    } else {
                        scale = Math.min(scale + ZOOM_SPEED, maxScale);
                    }
                    applyPanAndZoom();
                }
            }, { passive: false });

        } catch (e) {
            jsonCanvasPreview.innerHTML = '<em>Preview render error</em>';
            jsonCanvasPreview.closest('.preview-container').classList.remove('has-content');
        }
    }

    convertBtn.addEventListener('click', convertMermaidToCanvas);
    copyBtn.addEventListener('click', copyToClipboard);
    downloadBtn.addEventListener('click', downloadJson);
    clearBtn.addEventListener('click', clearAll);

    document.querySelectorAll('.preview-container').forEach(c => c.classList.remove('has-content'));

    const toggleMermaid = document.getElementById('toggle-mermaid');
    const toggleCanvas = document.getElementById('toggle-canvas');

    if (toggleMermaid) {
        toggleMermaid.addEventListener('change', (e) => {
            const row = document.querySelector('.mermaid-row');
            if (e.target.checked) {
                row.style.display = 'flex';
                row.style.flex = '1';
            } else {
                row.style.display = 'none';
            }
        });
    }

    if (toggleCanvas) {
        toggleCanvas.addEventListener('change', (e) => {
            const row = document.querySelector('.canvas-row');
            if (e.target.checked) {
                row.style.display = 'flex';
                row.style.flex = '1';
            } else {
                row.style.display = 'none';
            }
        });
    }

    input.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            convertMermaidToCanvas();
        }
    });

    document.querySelectorAll('.preview-container').forEach(container => {
        const fullscreenBtn = container.querySelector('.fullscreen-btn');
        const exitFullscreenBtn = container.querySelector('.exit-fullscreen-btn');

        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (container.offsetParent !== null && container.offsetWidth > 0 && container.offsetHeight > 0) {
                    // Store original parent for restoration later
                    container.dataset.originalParent = container.parentElement ? container.parentElement.id || '' : '';

                    // Move to body for true fullscreen
                    document.body.appendChild(container);
                    document.body.classList.add('fullscreen-active');

                    container.classList.add('fullscreen');
                    setTimeout(() => {
                        scale = 1;
                        panOffsetX = 0;
                        panOffsetY = 0;
                        applyPanAndZoom();
                        adjustCanvasToViewport();
                    }, 10);
                }
            });
        }

        if (exitFullscreenBtn) {
            exitFullscreenBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                exitFullscreen(container);
            });
        }
    });

    function exitFullscreen(container) {
        const originalParentId = container.dataset.originalParent;
        let originalParent = null;

        if (originalParentId) {
            originalParent = document.getElementById(originalParentId);
        }

        // Fallback: find the original location based on content type
        if (!originalParent) {
            if (container.querySelector('.mermaid-preview')) {
                const mermaidRow = document.querySelector('.mermaid-row');
                originalParent = mermaidRow ? mermaidRow.querySelector('.panel-preview') : null;
            } else if (container.querySelector('.json-canvas-preview')) {
                const canvasRow = document.querySelector('.canvas-row');
                originalParent = canvasRow ? canvasRow.querySelector('.panel-preview') : null;
            }
        }

        if (originalParent) {
            originalParent.appendChild(container);
        }

        container.classList.remove('fullscreen');
        document.body.classList.remove('fullscreen-active');
        delete container.dataset.originalParent;

        setTimeout(() => {
            scale = 1;
            panOffsetX = 0;
            panOffsetY = 0;
            applyPanAndZoom();
            adjustCanvasToViewport();
        }, 10);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.preview-container.fullscreen').forEach(container => {
                exitFullscreen(container);
            });
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('preview-container') && e.target.classList.contains('fullscreen')) {
            exitFullscreen(e.target);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !isSpacePressed) {
            isSpacePressed = true;
            document.body.classList.add('will-pan');
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            isSpacePressed = false;
            document.body.classList.remove('will-pan');
        }
    });

    const previewContainer = jsonCanvasPreview?.closest('.preview-container');
    if (previewContainer) {
        previewContainer.addEventListener('mousedown', (e) => {
            if (isSpacePressed && !e.target.closest('.canvas-node')) {
                isPanning = true;
                startX = e.clientX - panOffsetX;
                startY = e.clientY - panOffsetY;
                document.body.style.cursor = 'grabbing';
            }
        });
    }
});
