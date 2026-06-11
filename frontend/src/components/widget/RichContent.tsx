"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { RichContentBlock } from "@/lib/chat-types";

/** Markdown answer body (GFM: tables, links, lists). Styled via .widget-prose. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="widget-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

/** Render the structured richContent blocks below the markdown answer. */
export function RichContent({ blocks }: { blocks?: RichContentBlock[] }) {
  if (!blocks || blocks.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: RichContentBlock }) {
  switch (block.type) {
    case "text":
      return <Markdown>{block.markdown}</Markdown>;

    case "bullets":
      return (
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );

    case "table":
      return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-gray-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "card":
      return (
        <a
          href={block.url || undefined}
          target={block.url ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-xl border border-gray-200 transition hover:border-indigo-300 hover:shadow-sm"
        >
          {block.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.imageUrl}
              alt={block.title}
              className="h-28 w-full object-cover"
            />
          )}
          <div className="p-3">
            <p className="text-sm font-semibold text-gray-900">{block.title}</p>
            {block.subtitle && (
              <p className="text-xs font-medium text-indigo-600">
                {block.subtitle}
              </p>
            )}
            {block.description && (
              <p className="mt-1 text-xs text-gray-600">{block.description}</p>
            )}
          </div>
        </a>
      );

    case "links":
      return (
        <div className="flex flex-wrap gap-2">
          {block.links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
            >
              {link.label}
              <span aria-hidden>↗</span>
            </a>
          ))}
        </div>
      );

    default:
      return null;
  }
}
