'use client';
import {FC, useState, useEffect} from 'react';

async function exportMindmap(itemId: string, format: string) {
  try {
    console.log('=== EXPORT MINDMAP ===');
    console.log('Item ID:', itemId);
    
    // Get all mindmap nodes using experimental API
    const allNodes = await miro.board.experimental.get({ type: 'mindmap_node' });
    console.log('Total mindmap nodes on board:', allNodes.length);
    
    if (allNodes.length === 0) {
      throw new Error('No mindmap nodes found on the board');
    }

    // Find root nodes (nodes with isRoot: true)
    const roots = allNodes.filter((node: any) => node.isRoot);
    console.log('Found', roots.length, 'root node(s)');
    
    if (roots.length === 0) {
      throw new Error('No root mindmap node found');
    }

    // Get the selected item to determine which mindmap to export
    const selection = await miro.board.getSelection();
    let targetRoot: any = null;
    
    if (selection.length > 0) {
      const selectedItem = selection[0] as any;
      console.log('Selected item:', selectedItem.id, selectedItem.type);
      
      // Find the selected node in allNodes
      const selectedNode = allNodes.find((n: any) => n.id === selectedItem.id);
      
      if (selectedNode) {
        console.log('Found selected node in mindmap nodes');
        // Check if selected item is a root
        if ((selectedNode as any).isRoot) {
          targetRoot = selectedNode;
          console.log('Selected node is a root');
        } else {
          // Find the root by checking parentId chain
          console.log('Traversing up to find root, starting parentId:', (selectedNode as any).parentId);
          let currentId = (selectedNode as any).parentId;
          while (currentId && currentId !== 'null') {
            const parent = allNodes.find((n: any) => n.id === currentId);
            console.log('Checking parent:', currentId, 'isRoot:', parent ? (parent as any).isRoot : 'not found');
            if (parent && (parent as any).isRoot) {
              targetRoot = parent;
              console.log('Found root via parent chain:', parent.id);
              break;
            }
            currentId = parent ? (parent as any).parentId : null;
          }
        }
      } else {
        console.log('Selected item is not a mindmap node');
      }
    }
    
    // If no root found from selection, use first root
    if (!targetRoot) {
      targetRoot = roots[0];
      console.log('Using first available root:', targetRoot.id);
    }
    
    console.log('Exporting from root:', targetRoot.id);

    // Recursive function to build mindmap tree with full data
    async function getMindmapTree(node: any): Promise<any> {
      console.log('\n--- Processing node ---');
      console.log('Node ID:', node.id);
      console.log('nodeView:', node.nodeView);
      
      // Get content from nodeView.content and strip HTML tags
      let rawContent = node.nodeView?.content || '';
      let content = rawContent.replace(/<[^>]+>/g, '');
      console.log('Raw content:', rawContent);
      console.log('Stripped content:', content);
      
      // Get children
      const children = await node.getChildren();
      console.log('Found', children.length, 'children');
      
      return {
        id: node.id,
        isRoot: node.isRoot,
        content: content,
        nodeView: node.nodeView,
        layout: node.layout,
        direction: node.direction,
        children: await Promise.all(children.map(getMindmapTree))
      };
    }

    const mindmapData = await getMindmapTree(targetRoot);
    console.log('\n=== EXTRACTED MINDMAP DATA ===');
    console.log(JSON.stringify(mindmapData, null, 2));

    const exportResponse = await fetch(`/api/export?format=${format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mindmapData,
        itemId,
      }),
    });

    if (!exportResponse.ok) {
      const error = await exportResponse.json();
      throw new Error(error.error || 'Export failed');
    }

    // Download the file
    const blob = await exportResponse.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindmap-${itemId}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return true;
  } catch (error) {
    console.error('Export error:', error);
    alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

export const Export: FC = () => {
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [selectedItem, setSelectedItem] = useState<string>('No item selected');
  const [itemType, setItemType] = useState<'table' | 'mindmap' | 'other' | 'none'>('none');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const updateSelection = async () => {
      const selection = await miro.board.getSelection();
      if (selection.length > 0) {
        const item = selection[0];
        setSelectedItem(`${item.type} (ID: ${item.id})`);
        setSelectedItemId(item.id);
        
        // Check if it's a table or mindmap
        if (item.type === 'table') {
          setItemType('table');
        } else if (item.type === 'mindmap') {
          setItemType('mindmap');
        } else {
          setItemType('other');
        }
      } else {
        setSelectedItem('No item selected');
        setSelectedItemId('');
        setItemType('none');
      }
    };

    // Initial check
    updateSelection();

    // Listen for selection changes
    miro.board.ui.on('selection:update', updateSelection);

    return () => {
      miro.board.ui.off('selection:update', updateSelection);
    };
  }, []);

  const handleExport = async () => {
    if (!selectedItemId) {
      alert('Please select an item to export');
      return;
    }

    if (itemType !== 'mindmap' && itemType !== 'table') {
      alert('Only mindmap and table items can be exported');
      return;
    }

    setIsExporting(true);
    await exportMindmap(selectedItemId, selectedFormat);
    setIsExporting(false);
  };

  return (
    <div style={{padding: '20px'}}>
      <div className="banner" style={{ padding: '10px', backgroundColor: '#f0f0f0', marginBottom: '20px', borderRadius: '4px' }}>
        <p style={{ margin: 0 }}>Select item in board to export</p>
      </div>
      
      <h2 style={{ marginBottom: '10px', fontSize: '18px', fontWeight: 'bold' }}>
        Selected: {selectedItem}
      </h2>
      
      {itemType === 'table' && (
        <div style={{ padding: '8px', backgroundColor: '#d4edda', color: '#155724', marginBottom: '10px', borderRadius: '4px' }}>
          ✓ Table detected - Ready to export
        </div>
      )}
      
      {itemType === 'mindmap' && (
        <div style={{ padding: '8px', backgroundColor: '#d4edda', color: '#155724', marginBottom: '10px', borderRadius: '4px' }}>
          ✓ Mind Map detected - Ready to export
        </div>
      )}
      
      {itemType === 'other' && (
        <div style={{ padding: '8px', backgroundColor: '#fff3cd', color: '#856404', marginBottom: '10px', borderRadius: '4px' }}>
          ⚠ This item type is not supported for export
        </div>
      )}
      
      <h3>Export Mind Map</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="format-select" style={{ display: 'block', marginBottom: '8px' }}>
          Select Export Format:
        </label>
        <select
          id="format-select"
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value)}
          className="select"
          style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
        >
          <option value="json">JSON</option>
          <option value="pdf">PDF</option>
          <option value="png">PNG</option>
          <option value="svg">SVG</option>
          <option value="csv">CSV</option>
          <option value="markdown">Markdown</option>
          <option value="opml">OPML</option>
        </select>
      </div>

      <button
        type="button"
        onClick={handleExport}
        className="button button-primary"
        disabled={isExporting || itemType === 'none' || itemType === 'other'}
      >
        {isExporting ? 'Exporting...' : 'Export'}
      </button>
    </div>
  );
};
