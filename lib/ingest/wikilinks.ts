import { unified } from "unified";
import remarkParse from "remark-parse";
import wikiLinkPlugin from "remark-wiki-link";
import { visit } from "unist-util-visit";

export interface WikiLink {
  targetType: string; // e.g. "Characters", "Locations", "Events" — raw text before '#'
  targetName: string; // e.g. "Sero", "Bard (Original)" — raw text after '#'
  alias: string; // display label, e.g. "Sero"
}

const processor = unified().use(remarkParse).use(wikiLinkPlugin, { aliasDivider: "|" });

// Source docs use [[Type#Name|Label]] — remark-wiki-link parses node.value as
// "Type#Name" and data.alias as "Label". Split on the first '#' to recover the two parts.
export function extractWikiLinks(text: string): WikiLink[] {
  const tree = processor.parse(text);
  const links: WikiLink[] = [];

  visit(tree, "wikiLink", (node: { value: string; data?: { alias?: string } }) => {
    const hashIndex = node.value.indexOf("#");
    if (hashIndex === -1) {
      // Not our [[Type#Name]] convention — skip rather than guess.
      return;
    }
    links.push({
      targetType: node.value.slice(0, hashIndex).trim(),
      targetName: node.value.slice(hashIndex + 1).trim(),
      alias: node.data?.alias ?? node.value,
    });
  });

  return links;
}
