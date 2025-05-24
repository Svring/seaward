import React, { Suspense } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui/copy-button";

interface MarkdownRendererProps {
  children: string;
}

export function SplitMarkdownRenderer({ children }: { children: string }) {
  // Split by double newlines for paragraphs, then by single newlines for lines
  const segments = children
    .split(/\n{2,}/g) // Split by two or more newlines (paragraphs)
    .flatMap(paragraph =>
      paragraph.split('\n').map(line => line.trim()).filter(Boolean)
    );
  console.log("segments", segments);
  return (
    <div>
      {segments.map((segment, idx) => (
        <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} components={COMPONENTS} key={idx}>{segment}</Markdown>
      ))}
    </div>
  );
}

export function MarkdownRenderer({ children }: MarkdownRendererProps) {
  const trimmedChildren = children
    .split('\n\n')
    .map(line => line.trim())
    .join('\n');

  // const markdown = `The number of stars visible in the sky depends on several factors, but here's a breakdown:\n**Visible to the naked eye:**\n- From a dark location with no light pollution: approximately 2,000-3,000 stars\n- From a typical suburban area: around 200-500 stars\n- From a city with significant light pollution: only 20-100 stars\n\n**In our galaxy (the Milky Way):**\n- Estimated 100-400 billion stars\n\n**In the observable universe:**\n- Astronomers estimate there are roughly 10^22 to 10^24 stars (that's 10 followed by 22-24 zeros!)\n- This is often described as more stars than grains of sand on all the beaches on Earth\n\nThe exact number we can see depends on:\n- Light pollution in your area\n- Weather conditions\n- Time of year (different constellations are visible in different seasons)\n- Your eyesight\n- Altitude and atmospheric clarity\n\nSo while the universe contains an almost incomprehensibly vast number of stars, we can only see a tiny fraction of them with our naked eyes from Earth!`

  return (
    <div className="markdown-renderer space-y-0">
      {/* <SplitMarkdownRenderer>
        {trimmedChildren}
      </SplitMarkdownRenderer> */}
      {/* <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {trimmedChildren}
      </Markdown> */}
      {trimmedChildren}
      {/* <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown> */}
    </div>
  );
}

interface HighlightedPre extends React.HTMLAttributes<HTMLPreElement> {
  children: string;
  language: string;
}

const HighlightedPre = React.memo(
  async ({ children, language, ...props }: HighlightedPre) => {
    const { codeToTokens, bundledLanguages } = await import("shiki");

    if (!(language in bundledLanguages)) {
      return <pre {...props}>{children}</pre>;
    }

    const { tokens } = await codeToTokens(children, {
      lang: language as keyof typeof bundledLanguages,
      defaultColor: false,
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    });

    return (
      <pre {...props}>
        <code>
          {tokens.map((line, lineIndex) => (
            <span key={lineIndex} className="block">
              {line.map((token, tokenIndex) => {
                const style =
                  typeof token.htmlStyle === "string"
                    ? undefined
                    : token.htmlStyle;

                return (
                  <span
                    key={tokenIndex}
                    className="text-shiki-light bg-shiki-light-bg dark:text-shiki-dark dark:bg-shiki-dark-bg"
                    style={style}
                  >
                    {token.content}
                  </span>
                );
              })}
            </span>
          ))}
        </code>
      </pre>
    );
  }
);
HighlightedPre.displayName = "HighlightedCode";

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode;
  className?: string;
  language: string;
}

const CodeBlock = ({
  children,
  className,
  language,
  ...restProps
}: CodeBlockProps) => {
  const code =
    typeof children === "string"
      ? children
      : childrenTakeAllStringContents(children);

  const preClass = cn(
    "overflow-x-scroll rounded-md border bg-background/50 p-4 font-mono text-sm [scrollbar-width:none] m-0",
    className
  );

  return (
    <div className="group/code relative">
      <Suspense
        fallback={
          <pre className={preClass} {...restProps}>
            {children}
          </pre>
        }
      >
        <HighlightedPre language={language} className={preClass}>
          {code}
        </HighlightedPre>
      </Suspense>
      <div className="invisible absolute right-2 top-2 flex space-x-1 rounded-lg p-1 opacity-0 transition-all duration-200 group-hover/code:visible group-hover/code:opacity-100">
        <CopyButton content={code} copyMessage="Copied code to clipboard" />
      </div>
    </div>
  );
};

function childrenTakeAllStringContents(element: any): string {
  if (typeof element === "string") {
    return element;
  }

  if (element?.props?.children) {
    let children = element.props.children;

    if (Array.isArray(children)) {
      return children
        .map((child) => childrenTakeAllStringContents(child))
        .join("");
    } else {
      return childrenTakeAllStringContents(children);
    }
  }

  return "";
}

const COMPONENTS = {
  h1: withClass("h1", "text-2xl font-semibold m-0 mb-2"),
  h2: withClass("h2", "font-semibold text-xl m-0 mb-2"),
  h3: withClass("h3", "font-semibold text-lg m-0 mb-2"),
  h4: withClass("h4", "font-semibold text-base m-0 mb-2"),
  h5: withClass("h5", "font-medium m-0 mb-2"),
  strong: withClass("strong", "font-semibold"),
  a: withClass("a", "text-primary underline underline-offset-2"),
  blockquote: withClass("blockquote", "border-l-2 border-primary pl-4 m-0 mb-2"),
  code: ({ children, className, node, ...rest }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    return match ? (
      <CodeBlock className={className} language={match[1]} {...rest}>
        {children}
      </CodeBlock>
    ) : (
      <code
        className={cn(
          "font-mono [:not(pre)>&]:rounded-md [:not(pre)>&]:bg-background/50 [:not(pre)>&]:px-1 [:not(pre)>&]:py-0.5"
        )}
        {...rest}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }: any) => children,
  ol: withClass("ol", "list-decimal pl-6 m-0"),
  ul: withClass("ul", "list-disc pl-6 m-0 p-0 border-0"),
  li: withClass("li", "my-0"),
  table: withClass(
    "table",
    "w-full border-collapse overflow-y-auto rounded-md border border-foreground/20 m-0"
  ),
  th: withClass(
    "th",
    "border border-foreground/20 px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right"
  ),
  td: withClass(
    "td",
    "border border-foreground/20 px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right"
  ),
  tr: withClass("tr", "m-0 border-t p-0 even:bg-muted"),
  p: withClass("p", "m-0"),
  hr: withClass("hr", "border-foreground/20 m-0"),
};

function withClass(Tag: keyof React.JSX.IntrinsicElements, classes: string) {
  const Component = ({ node, ...props }: any) => (
    <Tag className={classes} {...props} />
  );
  Component.displayName = String(Tag);
  return Component;
}