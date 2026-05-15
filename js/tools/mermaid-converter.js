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
        
        const lines = mermaidCode.split('\n');
        
        let graphDirection = 'TD';
        const graphLine = lines.find(line => line.trim().match(/^(graph|flowchart)\s+(TD|LR|BT|RL)/i));
        if (graphLine) {
            const match = graphLine.match(/^(graph|flowchart)\s+(TD|LR|BT|RL)/i);
            if (match) {
                graphDirection = match[2].toUpperCase();
            }
        }

        const nodePattern = /([a-zA-Z0-9_]+)\s*(?:\[([^\]]*)\]|\{([^\}]*)\}|\(([^\)]*)\)|>\s*([^>]*)\>)?/g;
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('graph') || 
                trimmedLine.startsWith('flowchart') || 
                trimmedLine.startsWith('subgraph') || 
                trimmedLine.startsWith('style') ||
                trimmedLine.startsWith('classDef') ||
                trimmedLine.startsWith('click') ||
                trimmedLine === '' ||
                trimmedLine.startsWith('%%')) {
                
                if (trimmedLine.startsWith('style')) {
                    const styleMatch = trimmedLine.match(/style\s+([a-zA-Z0-9_]+)\s+fill:([^,\s]+)/i);
                    if (styleMatch) {
                        const nodeId = styleMatch[1];
                        const color = styleMatch[2].toLowerCase();
                        if (nodes.has(nodeId)) {
                            const existingNode = nodes.get(nodeId);
                            existingNode.color = COLOR_MAP[color] || COLOR_MAP[color.replace('#', '')] || null;
                        }
                    }
                }
                return;
            }

            let match;
            const localNodePattern = /([a-zA-Z0-9_]+)\s*(?:\[([^\]]*)\]|\{([^\}]*)\}|\(([^\)]*)\)|>([^>]*)>)/g;
            while ((match = localNodePattern.exec(trimmedLine)) !== null) {
                const nodeId = match[1];
                const labelText = match[2] || match[3] || match[4] || match[5] || nodeId;
                if (!nodes.has(nodeId)) {
                    nodes.set(nodeId, {
                        id: nodeId,
                        label: cleanIconLabel(labelText),
                        color: null
                    });
                }
            }
        });

        const edgePattern = /([a-zA-Z0-9_]+)\s*(?:\[([^\]]*)\]|\{([^\}]*)\}|\(([^\)]*)\)|>([^>]*)>)?\s*(-->|==>|-\.-|-[.]->|==>|~>|-+)>?\s*(?:\|([^\|]*)\|)?\s*([a-zA-Z0-9_]+)\s*(?:\[([^\]]*)\]|\{([^\}]*)\}|\(([^\)]*)\)|>([^>]*)>)?/g;
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('graph') || 
                trimmedLine.startsWith('flowchart') || 
                trimmedLine.startsWith('subgraph') || 
                trimmedLine.startsWith('style') ||
                trimmedLine.startsWith('classDef') ||
                trimmedLine.startsWith('click') ||
                trimmedLine === '' ||
                trimmedLine.startsWith('%%')) {
                return;
            }

            const simpleEdgePattern = /([a-zA-Z0-9_]+)(?:\[([^\]]*)\]|\{([^\}]*)\}|\(([^\)]*)\))?\s*(-->|==>|-\.-|-\.\.->|~>)(?:\|([^|]+)\|)?\s*([a-zA-Z0-9_]+)(?:\[([^\]]*)\]|\{([^\}]*)\}|\(([^\)]*)\))?/g;
            let edgeMatch;
            
            while ((edgeMatch = simpleEdgePattern.exec(trimmedLine)) !== null) {
                const fromNode = edgeMatch[1];
                const toNode = edgeMatch[7];
                const edgeLabel = edgeMatch[6] || null;
                
                if (!nodes.has(fromNode)) {
                    nodes.set(fromNode, {
                        id: fromNode,
                        label: fromNode,
                        color: null
                    });
                }
                if (!nodes.has(toNode)) {
                    nodes.set(toNode, {
                        id: toNode,
                        label: toNode,
                        color: null
                    });
                }
                
                edges.push({
                    from: fromNode,
                    to: toNode,
                    label: edgeLabel
                });
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
    }

    async function renderPreview(mermaidCode) {
        try {
            preview.innerHTML = '';
            const { svg } = await mermaid.render('mermaid-preview-' + Date.now(), mermaidCode);
            preview.innerHTML = svg;
        } catch (e) {
            preview.innerHTML = '<em>Preview not available</em>';
        }
    }

    function renderJsonCanvasPreview(canvasJson) {
        try {
            const nodes = canvasJson.nodes || [];
            const edges = canvasJson.edges || [];

            if (nodes.length === 0) {
                jsonCanvasPreview.innerHTML = '<em>No nodes to display</em>';
                return;
            }

            const padding = 40;
            const nodeWidth = 200;
            const nodeHeight = 60;

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            nodes.forEach(node => {
                minX = Math.min(minX, node.x);
                minY = Math.min(minY, node.y);
                maxX = Math.max(maxX, node.x + (node.width || nodeWidth));
                maxY = Math.max(maxY, node.y + (node.height || nodeHeight));
            });

            const width = maxX - minX + padding * 2;
            const height = maxY - minY + padding * 2;
            const offsetX = -minX + padding;
            const offsetY = -minY + padding;

            let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" style="background: transparent">
            <style>
                .node { fill: var(--card-bg, #ffffff); stroke: var(--accent-color, #4f46e5); stroke-width: 2; }
                .node-text { fill: var(--text-color, #374151); font-family: inherit; }
                .edge { stroke: var(--text-color, #6b7280); stroke-width: 2; fill: none; }
                .edge-label-bg { fill: var(--code-bg, #f3f4f6); stroke: var(--border-color, #d1d5db); stroke-width: 1; }
                .edge-label { fill: var(--text-color, #374151); font-family: inherit; }
            </style>`;
            svg += `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="var(--text-color, #6b7280)"/></marker></defs>`;

            edges.forEach(edge => {
                const fromNode = nodes.find(n => n.id === edge.fromNode);
                const toNode = nodes.find(n => n.id === edge.toNode);
                if (fromNode && toNode) {
                    const x1 = (fromNode.x + (fromNode.width || nodeWidth) / 2) + offsetX;
                    const y1 = (fromNode.y + (fromNode.height || nodeHeight) / 2) + offsetY;
                    const x2 = (toNode.x + (toNode.width || nodeWidth) / 2) + offsetX;
                    const y2 = (toNode.y + (toNode.height || nodeHeight) / 2) + offsetY;

                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;

                    svg += `<path class="edge" d="M${x1},${y1} L${x2},${y2}" marker-end="url(#arrowhead)"/>`;
                    if (edge.label) {
                        const labelWidth = edge.label.length * 8 + 16;
                        const labelHeight = 18;
                        svg += `<rect class="edge-label-bg" x="${midX - labelWidth/2}" y="${midY - labelHeight/2 - 4}" width="${labelWidth}" height="${labelHeight}" rx="3"/>`;
                        svg += `<text class="edge-label" x="${midX}" y="${midY - 4}" dominant-baseline="middle">${edge.label}</text>`;
                    }
                }
            });

            nodes.forEach(node => {
                const x = node.x + offsetX;
                const y = node.y + offsetY;
                const w = node.width || nodeWidth;
                const h = node.height || nodeHeight;
                const color = node.color ? `hsl(${node.color * 60}, 70%, 50%)` : '';

                if (color) {
                    svg += `<rect class="node" x="${x}" y="${y}" width="${w}" height="${h}" rx="8" style="fill: ${color}"/>`;
                } else {
                    svg += `<rect class="node" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>`;
                }
                svg += `<text class="node-text" x="${x + w/2}" y="${y + h/2}" dominant-baseline="middle">${node.text}</text>`;
            });

            svg += '</svg>';
            jsonCanvasPreview.innerHTML = svg;
        } catch (e) {
            jsonCanvasPreview.innerHTML = '<em>Preview render error</em>';
        }
    }

    convertBtn.addEventListener('click', convertMermaidToCanvas);
    copyBtn.addEventListener('click', copyToClipboard);
    downloadBtn.addEventListener('click', downloadJson);
    clearBtn.addEventListener('click', clearAll);

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
                container.classList.add('fullscreen');
            });
        }

        if (exitFullscreenBtn) {
            exitFullscreenBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                container.classList.remove('fullscreen');
            });
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.preview-container.fullscreen').forEach(container => {
                container.classList.remove('fullscreen');
            });
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('preview-container') && e.target.classList.contains('fullscreen')) {
            e.target.classList.remove('fullscreen');
        }
    });
});
