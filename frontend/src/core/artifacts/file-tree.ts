/**
 * File tree utilities — converts flat artifact paths into a navigable tree.
 */

export interface FileTreeNode {
  /** Display name (file or directory name). */
  name: string;
  /** Full virtual path (e.g. "mnt/user-data/outputs/foo.txt"). */
  path: string;
  /** True if this is a directory. */
  isDirectory: boolean;
  /** Children (only for directories). */
  children: FileTreeNode[];
  /** Depth level (root = 0). */
  depth: number;
}

/**
 * Build a tree from a flat list of file paths.
 * Paths are expected to use `/` as separator.
 * Directories are inferred from path segments.
 */
export function buildFileTree(
  paths: string[],
  options?: { sort?: "alpha" | "type" },
): FileTreeNode[] {
  if (!paths || paths.length === 0) return [];

  const sortMode = options?.sort ?? "type";
  const root: FileTreeNode[] = [];

  // Collect all segments
  const dirMap = new Map<string, FileTreeNode[]>();

  for (const filePath of paths) {
    const segments = filePath.split("/");
    const parts: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      const isLast = i === segments.length - 1;
      const parentPath = parts.join("/");
      parts.push(segments[i]);
      const fullPath = parts.join("/");

      if (!dirMap.has(parentPath)) {
        dirMap.set(parentPath, []);
      }

      const existing = dirMap.get(parentPath)!.find(
        (n) => n.path === fullPath,
      );
      if (!existing) {
        dirMap.get(parentPath)!.push({
          name: segments[i],
          path: fullPath,
          isDirectory: !isLast,
          children: [],
          depth: i,
        });
      }
    }
  }

  // Assemble children
  const result: FileTreeNode[] = [];
  for (const [parentPath, nodes] of dirMap) {
    if (parentPath === "") {
      result.push(...nodes);
    } else {
      const parent = findNode(result, parentPath);
      if (parent) {
        parent.children.push(...nodes);
      }
    }
  }

  // Sort
  const sortFn = createSorter(sortMode);
  sortTree(result, sortFn);

  return result;
}

function findNode(tree: FileTreeNode[], path: string): FileTreeNode | null {
  for (const node of tree) {
    if (node.path === path) return node;
    if (node.children.length > 0) {
      const found = findNode(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

function createSorter(mode: "alpha" | "type") {
  return (a: FileTreeNode, b: FileTreeNode) => {
    if (mode === "type") {
      // Directories first, then sort by name
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
    }
    return a.name.localeCompare(b.name);
  };
}

function sortTree(tree: FileTreeNode[], sortFn: (a: FileTreeNode, b: FileTreeNode) => number) {
  tree.sort(sortFn);
  for (const node of tree) {
    if (node.children.length > 0) {
      sortTree(node.children, sortFn);
    }
  }
}

/**
 * Flatten a tree into a list of (name, depth, isDirectory) for rendering.
 * Each directory has an `expanded` state that controls whether children are shown.
 */
export interface FlatTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  depth: number;
  hasChildren: boolean;
}

export function flattenTree(
  tree: FileTreeNode[],
  expandedPaths: Set<string>,
): FlatTreeNode[] {
  const result: FlatTreeNode[] = [];

  function walk(nodes: FileTreeNode[]) {
    for (const node of nodes) {
      result.push({
        name: node.name,
        path: node.path,
        isDirectory: node.isDirectory,
        depth: node.depth,
        hasChildren: node.children.length > 0,
      });
      if (node.isDirectory && expandedPaths.has(node.path)) {
        walk(node.children);
      }
    }
  }

  walk(tree);
  return result;
}
