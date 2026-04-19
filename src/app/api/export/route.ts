import {NextRequest, NextResponse} from 'next/server';
import jsPDF from 'jspdf';
import {createCanvas} from 'canvas';

export async function POST(req: NextRequest) {
  try {
    const {mindmapData, itemId} = await req.json();

    if (!mindmapData) {
      return NextResponse.json(
        {error: 'Missing mindmap data'},
        {status: 400}
      );
    }

    // Log the mindmap data to see its structure
    console.log('\n=== API RECEIVED MINDMAP DATA ===');
    console.log('Data keys:', Object.keys(mindmapData));
    console.log('Full data:', JSON.stringify(mindmapData, null, 2));

    // Get format from request (default to CSV)
    const format = new URL(req.url).searchParams.get('format') || 'csv';
    
    let output: string | Buffer;
    let contentType: string;
    let fileExtension: string;
    
    if (format === 'opml') {
      output = convertMindmapToOPML(mindmapData);
      contentType = 'text/x-opml+xml';
      fileExtension = 'opml';
      console.log('\n=== GENERATED OPML ===');
      console.log(output);
    } else if (format === 'json') {
      const jsonData = convertMindmapToJSON(mindmapData);
      output = JSON.stringify(jsonData, null, 2);
      contentType = 'application/json';
      fileExtension = 'json';
      console.log('\n=== GENERATED JSON ===');
      console.log(output);
    } else if (format === 'pdf') {
      output = convertMindmapToPDF(mindmapData);
      contentType = 'application/pdf';
      fileExtension = 'pdf';
      console.log('\n=== GENERATED PDF ===');
    } else if (format === 'png') {
      output = convertMindmapToPNG(mindmapData);
      contentType = 'image/png';
      fileExtension = 'png';
      console.log('\n=== GENERATED PNG ===');
    } else if (format === 'svg') {
      output = convertMindmapToSVG(mindmapData);
      contentType = 'image/svg+xml';
      fileExtension = 'svg';
      console.log('\n=== GENERATED SVG ===');
    } else {
      output = convertMindmapToCSV(mindmapData);
      contentType = 'text/csv';
      fileExtension = 'csv';
      console.log('\n=== GENERATED CSV ===');
      console.log(output);
    }

    // Handle Buffer types (PDF, PNG) differently from strings
    if (Buffer.isBuffer(output)) {
      const arrayBuffer = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer;
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="mindmap-${itemId}.${fileExtension}"`,
        },
      });
    } else {
      return new NextResponse(output, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="mindmap-${itemId}.${fileExtension}"`,
        },
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      {error: 'Failed to export mindmap'},
      {status: 500}
    );
  }
}

function convertMindmapToCSV(mindmap: any): string {
  // First, determine the maximum depth of the tree
  function getMaxDepth(node: any, currentDepth: number = 1): number {
    if (!node.children || node.children.length === 0) {
      return currentDepth;
    }
    const childDepths = node.children.map((child: any) => getMaxDepth(child, currentDepth + 1));
    return Math.max(...childDepths);
  }
  
  const maxDepth = getMaxDepth(mindmap);
  
  const rows: string[] = [];
  
  // Recursive function to extract all paths from root to leaves
  function extractPaths(node: any, currentPath: string[] = []): void {
    // Clean content - strip HTML tags
    let content = node.content || '';
    content = content.replace(/<[^>]*>/g, '').trim();
    
    // Add current node to path
    const newPath = [...currentPath, content];
    
    // If this is a leaf node (no children), add the complete path as a row
    if (!node.children || node.children.length === 0) {
      // Pad the path with empty strings to match maxDepth
      while (newPath.length < maxDepth) {
        newPath.push('');
      }
      // Escape quotes and wrap each cell in quotes
      const escapedPath = newPath.map(cell => `"${cell.replace(/"/g, '""')}"`);
      rows.push(escapedPath.join(','));
    } else {
      // Recursively process children in reverse order
      const reversedChildren = [...node.children].reverse();
      for (const child of reversedChildren) {
        extractPaths(child, newPath);
      }
    }
  }
  
  // Start extraction from root
  extractPaths(mindmap);
  
  return rows.join('\n');
}

function convertMindmapToOPML(mindmap: any): string {
  const lines: string[] = [];
  
  // OPML header
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<opml version="2.0">');
  lines.push('  <head>');
  lines.push('    <title>Miro Mindmap Export</title>');
  lines.push('    <dateCreated>' + new Date().toUTCString() + '</dateCreated>');
  lines.push('  </head>');
  lines.push('  <body>');
  
  // Recursive function to convert nodes to OPML outline elements
  function nodeToOPML(node: any, indent: number = 2): void {
    const indentation = '    '.repeat(indent);
    
    // Clean content - strip HTML tags and escape XML special characters
    let content = node.content || '';
    content = content.replace(/<[^>]*>/g, '').trim();
    content = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    
    if (!content) {
      content = 'Untitled';
    }
    
    // Check if node has children
    const hasChildren = node.children && node.children.length > 0;
    
    if (hasChildren) {
      lines.push(`${indentation}<outline text="${content}">`);
      // Process children in reverse order
      const reversedChildren = [...node.children].reverse();
      for (const child of reversedChildren) {
        nodeToOPML(child, indent + 1);
      }
      lines.push(`${indentation}</outline>`);
    } else {
      lines.push(`${indentation}<outline text="${content}" />`);
    }
  }
  
  // Convert the mindmap tree
  nodeToOPML(mindmap);
  
  lines.push('  </body>');
  lines.push('</opml>');
  
  return lines.join('\n');
}

function convertMindmapToJSON(mindmap: any): any {
  function nodeToJSON(node: any): any {
    // Clean content - strip HTML tags
    let content = node.content || '';
    content = content.replace(/<[^>]*>/g, '').trim();
    
    if (!content) {
      content = 'Untitled';
    }
    
    // Convert children recursively in reverse order
    const children = node.children && node.children.length > 0
      ? [...node.children].reverse().map((child: any) => nodeToJSON(child))
      : [];
    
    return {
      text: content,
      links: [],
      children: children
    };
  }
  
  return nodeToJSON(mindmap);
}

function convertMindmapToPDF(mindmap: any): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = 20;
  const lineHeight = 7;
  const maxWidth = pageWidth - (margin * 2);
  
  // Title
  doc.setFontSize(16);
  doc.text('Mind Map Export', margin, yPosition);
  yPosition += lineHeight * 2;
  
  // Recursive function to add nodes to PDF
  function addNodeToPDF(node: any, level: number = 0): void {
    doc.setFontSize(12 - Math.min(level, 3));
    const indent = margin + (level * 10);
    
    // Clean content
    let content = node.content || '';
    content = content.replace(/<[^>]*>/g, '').trim();
    if (!content) content = 'Untitled';
    
    // Add bullet point for non-root nodes
    const bullet = level > 0 ? '• ' : '';
    const text = bullet + content;
    
    // Handle text wrapping
    const lines = doc.splitTextToSize(text, maxWidth - (level * 10));
    
    // Check if we need a new page
    if (yPosition + (lines.length * lineHeight) > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      yPosition = margin;
    }
    
    // Add text
    doc.text(lines, indent, yPosition);
    yPosition += lines.length * lineHeight;
    
    // Process children in reverse order
    if (node.children && node.children.length > 0) {
      const reversedChildren = [...node.children].reverse();
      for (const child of reversedChildren) {
        addNodeToPDF(child, level + 1);
      }
    }
  }
  
  addNodeToPDF(mindmap);
  
  return Buffer.from(doc.output('arraybuffer'));
}

function convertMindmapToPNG(mindmap: any): Buffer {
  const nodeWidth = 180;
  const nodeHeight = 60;
  const horizontalSpacing = 120;
  const verticalSpacing = 20;
  const marginX = 50;
  const marginY = 50;
  
  // First pass: calculate layout positions for all nodes
  interface NodeLayout {
    node: any;
    x: number;
    y: number;
    width: number;
    height: number;
    level: number;
  }
  
  const layouts: NodeLayout[] = [];
  
  function calculateLayout(node: any, level: number, startY: number): number {
    const x = marginX + (level * (nodeWidth + horizontalSpacing));
    const y = startY;
    
    layouts.push({
      node,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      level
    });
    
    let currentY = startY;
    
    // Process children in reverse order
    if (node.children && node.children.length > 0) {
      const reversedChildren = [...node.children].reverse();
      for (const child of reversedChildren) {
        currentY = calculateLayout(child, level + 1, currentY);
        currentY += verticalSpacing;
      }
      currentY -= verticalSpacing; // Remove extra spacing after last child
    }
    
    // Center parent node vertically relative to its children
    if (node.children && node.children.length > 0) {
      const firstChildY = layouts.find(l => 
        node.children.some((c: any) => c === l.node)
      )?.y || startY;
      const lastChildLayout = layouts[layouts.length - 1];
      const childrenCenterY = (firstChildY + lastChildLayout.y) / 2;
      
      // Update parent Y position to center
      const parentLayout = layouts.find(l => l.node === node);
      if (parentLayout) {
        parentLayout.y = childrenCenterY;
      }
    }
    
    return Math.max(currentY, startY + nodeHeight);
  }
  
  calculateLayout(mindmap, 0, marginY);
  
  // Calculate canvas dimensions
  const maxX = Math.max(...layouts.map(l => l.x + l.width)) + marginX;
  const maxY = Math.max(...layouts.map(l => l.y + l.height)) + marginY;
  
  const canvasWidth = Math.max(800, maxX);
  const canvasHeight = Math.max(600, maxY);
  
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Draw connections first (so they appear behind boxes)
  for (const layout of layouts) {
    if (layout.node.children && layout.node.children.length > 0) {
      const reversedChildren = [...layout.node.children].reverse();
      for (const child of reversedChildren) {
        const childLayout = layouts.find(l => l.node === child);
        if (childLayout) {
          ctx.strokeStyle = '#cccccc';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(layout.x + layout.width, layout.y + layout.height / 2);
          ctx.lineTo(childLayout.x, childLayout.y + childLayout.height / 2);
          ctx.stroke();
        }
      }
    }
  }
  
  // Draw nodes
  for (const layout of layouts) {
    const { node, x, y, width, height, level } = layout;
    
    // Clean content
    let content = node.content || '';
    content = content.replace(/<[^>]*>/g, '').trim();
    if (!content) content = 'Untitled';
    
    // Draw box with rounded corners
    const radius = 8;
    ctx.fillStyle = level === 0 ? '#4A90E2' : '#E8F4F8';
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 2;
    
    // Rounded rectangle
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw text
    ctx.fillStyle = level === 0 ? '#ffffff' : '#333333';
    ctx.font = level === 0 ? 'bold 14px Arial' : '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Truncate text if too long
    const maxTextWidth = width - 20;
    let displayText = content;
    if (ctx.measureText(content).width > maxTextWidth) {
      while (ctx.measureText(displayText + '...').width > maxTextWidth && displayText.length > 0) {
        displayText = displayText.slice(0, -1);
      }
      displayText += '...';
    }
    
    ctx.fillText(displayText, x + width / 2, y + height / 2);
  }
  
  return canvas.toBuffer('image/png');
}

function convertMindmapToSVG(mindmap: any): string {
  const nodeWidth = 180;
  const nodeHeight = 60;
  const horizontalSpacing = 120;
  const verticalSpacing = 20;
  const marginX = 50;
  const marginY = 50;
  
  // Calculate layout positions for all nodes
  interface NodeLayout {
    node: any;
    x: number;
    y: number;
    width: number;
    height: number;
    level: number;
  }
  
  const layouts: NodeLayout[] = [];
  
  function calculateLayout(node: any, level: number, startY: number): number {
    const x = marginX + (level * (nodeWidth + horizontalSpacing));
    const y = startY;
    
    layouts.push({
      node,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      level
    });
    
    let currentY = startY;
    
    // Process children in reverse order
    if (node.children && node.children.length > 0) {
      const reversedChildren = [...node.children].reverse();
      for (const child of reversedChildren) {
        currentY = calculateLayout(child, level + 1, currentY);
        currentY += verticalSpacing;
      }
      currentY -= verticalSpacing;
    }
    
    // Center parent node vertically relative to its children
    if (node.children && node.children.length > 0) {
      const firstChildY = layouts.find(l => 
        node.children.some((c: any) => c === l.node)
      )?.y || startY;
      const lastChildLayout = layouts[layouts.length - 1];
      const childrenCenterY = (firstChildY + lastChildLayout.y) / 2;
      
      // Update parent Y position to center
      const parentLayout = layouts.find(l => l.node === node);
      if (parentLayout) {
        parentLayout.y = childrenCenterY;
      }
    }
    
    return Math.max(currentY, startY + nodeHeight);
  }
  
  calculateLayout(mindmap, 0, marginY);
  
  // Calculate canvas dimensions
  const maxX = Math.max(...layouts.map(l => l.x + l.width)) + marginX;
  const maxY = Math.max(...layouts.map(l => l.y + l.height)) + marginY;
  
  const canvasWidth = Math.max(800, maxX);
  const canvasHeight = Math.max(600, maxY);
  
  // Build SVG string
  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">\n`;
  svg += `  <rect width="${canvasWidth}" height="${canvasHeight}" fill="#ffffff"/>\n`;
  
  // Draw connections first
  svg += `  <g id="connections">\n`;
  for (const layout of layouts) {
    if (layout.node.children && layout.node.children.length > 0) {
      const reversedChildren = [...layout.node.children].reverse();
      for (const child of reversedChildren) {
        const childLayout = layouts.find(l => l.node === child);
        if (childLayout) {
          const x1 = layout.x + layout.width;
          const y1 = layout.y + layout.height / 2;
          const x2 = childLayout.x;
          const y2 = childLayout.y + childLayout.height / 2;
          svg += `    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#cccccc" stroke-width="2"/>\n`;
        }
      }
    }
  }
  svg += `  </g>\n`;
  
  // Draw nodes
  svg += `  <g id="nodes">\n`;
  for (const layout of layouts) {
    const { node, x, y, width, height, level } = layout;
    
    // Clean content
    let content = node.content || '';
    content = content.replace(/<[^>]*>/g, '').trim();
    if (!content) content = 'Untitled';
    
    // Escape XML special characters
    content = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    
    const fillColor = level === 0 ? '#4A90E2' : '#E8F4F8';
    const textColor = level === 0 ? '#ffffff' : '#333333';
    const fontSize = level === 0 ? 14 : 12;
    const fontWeight = level === 0 ? 'bold' : 'normal';
    
    // Draw rounded rectangle
    const radius = 8;
    svg += `    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="${fillColor}" stroke="#4A90E2" stroke-width="2"/>\n`;
    
    // Draw text (centered)
    svg += `    <text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-family="Arial" font-size="${fontSize}" font-weight="${fontWeight}">${content}</text>\n`;
  }
  svg += `  </g>\n`;
  
  svg += `</svg>`;
  
  return svg;
}
