import React, { useState, useMemo } from 'react';
import { File as FileIcon, Folder, ChevronRight, ChevronDown, Search } from 'lucide-react';

interface FileExplorerProps {
  files: Record<string, string>;
  activeFile: string | null;
  onFileSelect: (path: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: Record<string, TreeNode>;
}

export default function FileExplorer({ files, activeFile, onFileSelect, searchQuery, onSearchChange }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'src/components', 'src/pages']));

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const tree = useMemo(() => {
    const root: Record<string, TreeNode> = {};

    if (!files) return root;

    Object.keys(files).forEach(path => {
      if (searchQuery && !path.toLowerCase().includes(searchQuery.toLowerCase())) return;

      const parts = path.split('/');
      let current = root;
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!current[part]) {
          current[part] = {
            name: part,
            path: currentPath,
            type: index === parts.length - 1 ? 'file' : 'folder',
            children: index === parts.length - 1 ? undefined : {}
          };
        }
        
        if (index < parts.length - 1) {
          current = current[part].children!;
        }
      });
    });

    return root;
  }, [files, searchQuery]);

  const renderTree = (nodes: Record<string, TreeNode>, depth = 0) => {
    return Object.values(nodes)
      .sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
      })
      .map(node => (
        <div key={node.path}>
          <div 
            className={`flex items-center gap-1 py-1 px-2 cursor-pointer text-sm transition-colors select-none ${
              node.type === 'file' && activeFile === node.path 
                ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500' 
                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border-l-2 border-transparent'
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => {
              if (node.type === 'folder') {
                toggleFolder(node.path);
              } else {
                onFileSelect(node.path);
              }
            }}
          >
            {node.type === 'folder' && (
              <span className="shrink-0 text-zinc-600">
                {expandedFolders.has(node.path) || searchQuery ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </span>
            )}
            {node.type === 'folder' ? (
              <Folder className={`w-3.5 h-3.5 shrink-0 ${expandedFolders.has(node.path) ? 'text-zinc-300' : 'text-zinc-500'}`} />
            ) : (
              <FileIcon className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </div>
          
          {node.type === 'folder' && (expandedFolders.has(node.path) || searchQuery) && node.children && (
            <div>
              {renderTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      ));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search files..." 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-emerald-500/50 text-zinc-300 transition-colors"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {Object.keys(tree).length > 0 ? renderTree(tree) : (
          <div className="px-4 py-8 text-center text-xs text-zinc-500">
            No files found
          </div>
        )}
      </div>
    </div>
  );
}
