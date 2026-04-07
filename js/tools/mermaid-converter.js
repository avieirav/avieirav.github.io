import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

mermaid.initialize({ startOnLoad: false });

document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('mermaid-input');
    const output = document.getElementById('canvas-output');
    const preview = document.getElementById('mermaid-preview');
    const convertBtn = document.getElementById('convert-btn');
    const copyBtn = document.getElementById('copy-btn');
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
        statusMessage.textContent = message;
        statusMessage.className = 'status-message' + (isError ? ' error' : ' success');
    }

    function clearStatus() {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
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
                        label: labelText.trim(),
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

        try {
            await mermaid.parse(mermaidCode);
            
            await renderPreview(mermaidCode);
            
            const graphData = extractGraphData(mermaidCode);
            
            const direction = graphData.direction || 'TD';
            const positionedNodes = calculateLayout(graphData, direction);
            
            const canvasJson = generateCanvasJson(positionedNodes, graphData.edges);
            
            output.value = JSON.stringify(canvasJson, null, 2);
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

    function clearAll() {
        input.value = '';
        output.value = '';
        preview.innerHTML = '';
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

    convertBtn.addEventListener('click', convertMermaidToCanvas);
    copyBtn.addEventListener('click', copyToClipboard);
    clearBtn.addEventListener('click', clearAll);
    
    input.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            convertMermaidToCanvas();
        }
    });
});
