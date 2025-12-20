export class MutationObserverMock {
  private callback: MutationCallback;
  static instances: MutationObserverMock[] = [];

  constructor(callback: MutationCallback) {
    this.callback = callback;
    MutationObserverMock.instances.push(this);
  }
  observe(_target: Node, _options?: MutationObserverInit) {}
  disconnect() {}
  takeRecords(): MutationRecord[] { return []; }

  // Helper to trigger callback
  trigger(records: MutationRecord[], observer: MutationObserver) {
    this.callback(records, observer);
  }
}

(global as any).MutationObserver = MutationObserverMock;
(global as any).MutationObserver.instances = MutationObserverMock.instances;
(global as any).Node = {
    TEXT_NODE: 3,
    ELEMENT_NODE: 1
};
