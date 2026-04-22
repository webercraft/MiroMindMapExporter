import { csvParse } from 'd3-dsv';

export interface MindmapNode {
  nodeView: { content: string };
  children: MindmapNode[];
}

const readFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target) {
        reject('Failed to load file');
        return;
      }

      resolve(e.target.result as string);
    };
    reader.onerror = (e) => {
      reject('Failed to load file');
    };

    reader.onabort = (e) => {
      reject('Failed to load file');
    };
    reader.readAsText(file, 'utf-8');
  });

export const parseCsv = async (file: File) => {
  const str = await readFile(file);
  return csvParse(str);
};

const opmlOutlineToNode = (outline: Element): MindmapNode => {
  const text = outline.getAttribute('text') || outline.getAttribute('label') || 'Untitled';
  const children: MindmapNode[] = [];
  for (const child of Array.from(outline.children)) {
    if (child.tagName === 'outline') {
      children.push(opmlOutlineToNode(child));
    }
  }
  return { nodeView: { content: text }, children };
};

export const parseOpml = async (file: File): Promise<MindmapNode> => {
  const str = await readFile(file);
  const parser = new DOMParser();
  const doc = parser.parseFromString(str, 'text/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid OPML file: ' + parseError.textContent);
  }
  const body = doc.querySelector('body');
  if (!body) throw new Error('Invalid OPML file: missing <body>');
  const topOutlines = Array.from(body.children).filter((el) => el.tagName === 'outline');
  if (topOutlines.length === 0) throw new Error('OPML file has no outline nodes');
  if (topOutlines.length === 1) {
    return opmlOutlineToNode(topOutlines[0]);
  }
  // Multiple top-level outlines — wrap in a virtual root
  const title = doc.querySelector('head > title')?.textContent || 'Mind Map';
  return {
    nodeView: { content: title },
    children: topOutlines.map(opmlOutlineToNode),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsonToNode = (obj: any): MindmapNode => {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('Invalid JSON mind map structure');
  }
  const text: string =
    obj.text ?? obj.label ?? obj.name ?? obj.title ?? obj.content ?? 'Untitled';
  const rawChildren: unknown[] = Array.isArray(obj.children)
    ? obj.children
    : Array.isArray(obj.nodes)
    ? obj.nodes
    : Array.isArray(obj.items)
    ? obj.items
    : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { nodeView: { content: String(text) }, children: rawChildren.map((c: any) => jsonToNode(c)) };
};

export const parseJsonMindmap = async (file: File): Promise<MindmapNode> => {
  const str = await readFile(file);
  let parsed: unknown;
  try {
    parsed = JSON.parse(str);
  } catch {
    throw new Error('Invalid JSON file');
  }
  // Support both a single root object and an array (take first element)
  const root = Array.isArray(parsed) ? parsed[0] : parsed;
  return jsonToNode(root);
};
