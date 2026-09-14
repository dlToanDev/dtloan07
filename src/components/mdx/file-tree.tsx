import { cn } from '@/lib/utils';
import { File, Folder } from 'lucide-react';

interface Node {
  name: string;
  note?: string;
  children: Node[];
}

/**
 * Cây thư mục viết bằng đường dẫn đầy đủ, mỗi dòng một mục:
 *
 *   <FileTree tree="
 *     prisma/schema.prisma
 *     prisma/migrations/   # commit vào git
 *     docker-compose.yml
 *   " />
 *
 * Hai ràng buộc bắt buộc phải chiều, đều đã kiểm chứng bằng build thật:
 *  1. Prop phải là chuỗi thường, KHÔNG dùng biểu thức `{...}` — next-mdx-remote
 *     (RSC) làm mọi prop dạng biểu thức thành `undefined`.
 *  2. Không dựa vào thụt lề, vì MDX chuẩn hoá khoảng trắng đầu dòng trong
 *     attribute — dùng đường dẫn đầy đủ để suy ra cấp.
 */
function parseTree(input: string): Node[] {
  const roots: Node[] = [];

  for (const rawLine of input.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0) continue;

    const [rawPath = '', ...noteParts] = line.split('#');
    const note = noteParts.join('#').trim();
    const segments = rawPath.trim().split('/').filter(Boolean);
    if (segments.length === 0) continue;

    const isDir = rawPath.trim().endsWith('/');
    let siblings = roots;

    segments.forEach((segment, index) => {
      const isLast = index === segments.length - 1;
      const name = isLast && !isDir ? segment : `${segment}/`;

      let node = siblings.find((item) => item.name === name);
      if (!node) {
        node = { name, children: [] };
        siblings.push(node);
      }
      if (isLast && note) node.note = note;

      siblings = node.children;
    });
  }

  return roots;
}

function Nodes({ nodes, depth = 0 }: { nodes: Node[]; depth?: number }) {
  return (
    <ul className={cn('m-0 list-none p-0', depth > 0 && 'border-border ml-3 border-l pl-4')}>
      {nodes.map((node) => {
        const isFolder = node.name.endsWith('/');
        const Icon = isFolder ? Folder : File;

        return (
          <li key={`${depth}-${node.name}`} className="my-1">
            <span className="flex flex-wrap items-center gap-2">
              <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
              <span className={cn('font-mono text-sm', isFolder && 'font-medium')}>
                {node.name}
              </span>
              {node.note ? (
                <span className="text-muted-foreground text-xs">— {node.note}</span>
              ) : null}
            </span>
            {node.children.length > 0 ? <Nodes nodes={node.children} depth={depth + 1} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function FileTree({ tree }: { tree: string }) {
  return (
    <div className="border-border bg-muted/40 not-prose my-6 rounded-lg border p-4">
      <Nodes nodes={parseTree(tree)} />
    </div>
  );
}
