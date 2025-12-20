"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MutationObserverMock = void 0;
class MutationObserverMock {
    constructor(callback) {
        this.callback = callback;
        MutationObserverMock.instances.push(this);
    }
    observe(_target, _options) { }
    disconnect() { }
    takeRecords() { return []; }
    // Helper to trigger callback
    trigger(records, observer) {
        this.callback(records, observer);
    }
}
exports.MutationObserverMock = MutationObserverMock;
MutationObserverMock.instances = [];
global.MutationObserver = MutationObserverMock;
global.MutationObserver.instances = MutationObserverMock.instances;
global.Node = {
    TEXT_NODE: 3,
    ELEMENT_NODE: 1
};
//# sourceMappingURL=dom_mock.js.map