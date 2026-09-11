import { z } from "zod";

export function canonicalPostUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    !["x.com", "twitter.com"].includes(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    !/^\/[A-Za-z0-9_]{1,15}\/status\/\d{1,25}$/.test(url.pathname)
  ) {
    throw new Error("Only HTTPS X post URLs are allowed");
  }
  return `https://x.com${url.pathname}`;
}

export function isReadablePage(value: string): boolean {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !["x.com", "twitter.com"].includes(url.hostname) ||
      url.port ||
      url.username ||
      url.password
    )
      return false;
    if (["/home", "/i/bookmarks", "/i/history"].includes(url.pathname)) return true;
    return !!canonicalPostUrl(value);
  } catch {
    return false;
  }
}

export const toolSchemas = {
  get_status: z.object({}).strict(),
  open_bookmarks: z.object({}).strict(),
  read_visible_posts: z.object({}).strict(),
  scroll_feed: z.object({ direction: z.enum(["up", "down"]).default("down") }).strict(),
  open_thread: z.object({ url: z.string().max(512).transform(canonicalPostUrl) }).strict(),
  collect_bookmarks: z.object({ pages: z.number().int().min(1).max(5).default(2) }).strict(),
  search_collected_posts: z
    .object({
      query: z.string().trim().min(1).max(200),
      limit: z.number().int().min(1).max(50).default(20),
    })
    .strict(),
};

export type CommandName = keyof typeof toolSchemas;
export type Command = {
  [K in CommandName]: { name: K; args: z.output<(typeof toolSchemas)[K]> };
}[CommandName];

export function parseCommand(input: unknown): Command {
  const envelope = z
    .object({
      name: z.enum(Object.keys(toolSchemas) as [CommandName, ...CommandName[]]),
      args: z.unknown().default({}),
    })
    .strict()
    .parse(input);
  return { name: envelope.name, args: toolSchemas[envelope.name].parse(envelope.args) } as Command;
}

export interface Post {
  id: string;
  author: string;
  url: string;
  text: string;
  publishedAt: string | null;
  truncated: boolean;
  links: string[];
  mediaDescriptions: string[];
}

export interface Snapshot {
  view: "bookmarks" | "home" | "thread" | "pending" | "unsupported";
  account: string | null;
  page: string;
  capturedAt: string;
  state: "ready" | "loading" | "login_required" | "unknown";
  posts: Post[];
  complete: false;
  source: "rendered_dom";
}

export const MAX_REQUEST_BYTES = 4096;
export const MAX_RESPONSE_BYTES = 2_000_000;
