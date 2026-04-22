import { DSVRowArray } from 'd3-dsv';
import { MindmapNode } from './csvUtils';

interface Node {
  nodeView: { content: string };
  children: Node[];
}

/**
 * Create graph from CSV rows
 *
 * @param contents CSV rows
 * @returns Schema that can be directly passed to createMindmapNode
 */
const createGraph = (contents: DSVRowArray<string>) => {
  let root: Node | undefined;

  const visited: Record<string, Node> = {};

  for (const row of contents) {
    let parent = undefined;
    for (const col of contents.columns) {
      const value = row[col]!;

      const key = `${col}-${value}`;

      if (!visited[key]) {
        const node = { nodeView: { content: value }, children: [] };
        visited[key] = node;

        if (parent) {
          parent.children.push(visited[key]);
        } else {
          root = node;
        }
      }

      parent = visited[key];
    }
  }

  return root;
};

/**
 * Create mindmap from CSV rows
 *
 * @param contents CSV rows
 */
export const createMindmap = async (contents: DSVRowArray<string>) => {
  const root = createGraph(contents);
  if (root) {
    await miro.board.experimental.createMindmapNode(root);
  } else {
    throw new Error('Failed to create mind map: No root node created');
  }
};

/**
 * Create mindmap directly from a pre-built node tree (used for OPML/JSON imports)
 *
 * @param root The root MindmapNode
 */
export const createMindmapFromNode = async (root: MindmapNode) => {
  await miro.board.experimental.createMindmapNode(root);
};
