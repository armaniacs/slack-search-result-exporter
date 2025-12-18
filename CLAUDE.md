# AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in Japanese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional: for existing codebase)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional: design review)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional: after implementation)
- Progress check: `/kiro:spec-status {feature}` (use anytime)

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro:spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro:steering-custom`)

## Implementation Reference Documentation

Comprehensive technical documentation for this project is available in the `/ref` directory:

### Core Documentation
- **[Core Implementation Reference](ref/01-core-implementation.md)** - Complete technical reference for the bookmarklet implementation
  - Architecture and design patterns
  - Function-by-function implementation details
  - DOM selectors and data extraction logic
  - Link extraction and Markdown conversion algorithms
  - Security features (XSS protection, protocol filtering)
  - Performance characteristics and browser compatibility

- **[Testing Framework Reference](ref/02-testing-framework.md)** - Automated testing framework documentation
  - Playwright test configuration and setup
  - Browser compatibility test suite (Task 9.1)
  - Security validation test suite (Task 10.1)
  - Mock fixture structure and test data
  - Debugging and maintenance procedures
  - CI/CD integration guidelines

### When to Consult Reference Documentation

**Use `/ref` documentation when**:
- Understanding implementation architecture
- Debugging bookmarklet behavior
- Adding new features or tests
- Reviewing security implementation
- Investigating DOM selector issues
- Optimizing performance
- Troubleshooting test failures
- Onboarding new contributors

**Quick Reference**:
- Bookmarklet source: `slack-search-result-exporter.js` (421 lines)
- Test suites: `tests/e2e/*.spec.js`
- Mock fixture: `tests/fixtures/slack-search-mock.html`
