import type { Post, Snapshot } from "./protocol.js";

export class SessionIndex {
  private account: string | null = null;
  private posts = new Map<string, Post & { capturedAt: string; observedOn: string }>();

  clear() {
    this.account = null;
    this.posts.clear();
  }

  observe(snapshot: Snapshot) {
    if (snapshot.account !== this.account || !snapshot.account) this.clear();
    this.account = snapshot.account;
    if (!this.account) return;
    for (const post of snapshot.posts) {
      this.posts.set(post.id, {
        ...post,
        capturedAt: snapshot.capturedAt,
        observedOn: snapshot.page,
      });
      const oldest = this.posts.keys().next().value;
      if (this.posts.size > 1000 && oldest !== undefined) this.posts.delete(oldest);
    }
  }

  search(query: string, limit: number) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = [...this.posts.values()].filter((post) =>
      terms.every((term) => `${post.author} ${post.text}`.toLowerCase().includes(term))
    );
    return {
      account: this.account,
      posts: matches.slice(0, limit),
      matches: matches.length,
      indexedPosts: this.posts.size,
      scope: "current_enabled_session_only",
      complete: false,
    };
  }
}
