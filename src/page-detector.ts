import { PageType } from "./types.js";

export class PageDetector {
  private url: string;
  private doc: Document | null;

  constructor(url: string, doc?: Document) {
    this.url = url;
    this.doc = doc || (typeof document !== "undefined" ? document : null);
  }

  detect(): PageType {
    if (this.url.includes("/search/")) {
      return "search_result";
    }

    // Check DOM for search result
    if (this.doc && this.doc.querySelector('[role="document"]')) {
      return "search_result";
    }
    
    // Slack channel URLs usually look like .../client/T.../C...
    // or .../archives/C...
    const channelRegex = /\/(?:client\/[A-Z0-9]+\/|archives\/)([A-Z0-9]{9,})/;
    if (channelRegex.test(this.url)) {
      // Exclude special views like search, help, etc if they were caught by regex
      if (!this.url.includes("/help") && !this.url.includes("/browse/")) {
         return "channel";
      }
    }

    // Check DOM for channel
    if (this.doc && this.doc.querySelector('.c-message_list')) {
        return "channel";
    }

    return "unknown";
  }
}
