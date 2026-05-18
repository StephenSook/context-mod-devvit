/**
 * Z3-X26 dependency-cruiser — enforce layer boundaries.
 *
 * Rules:
 *   - src/client/** can ONLY import from src/client/**, src/shared/**, and node_modules
 *   - src/state/**, src/core/**, src/routes/** can import from each other but NOT from src/client/**
 *   - src/lib/** is shared infra — can import from anywhere except src/client/**
 *
 * Run: npx depcruise src --config .dependency-cruiser.cjs
 */
module.exports = {
  forbidden: [
    {
      name: 'server-no-client',
      severity: 'error',
      comment: 'Server-side code MUST NOT import from src/client/** (would bundle React into the server runtime).',
      from: { path: '^src/(routes|core|state|lib|rules|actions|shared|config|schema)' },
      to: { path: '^src/client/' },
    },
    {
      name: 'client-no-server-secrets',
      severity: 'error',
      comment: 'Client code MUST NOT import server-only modules that touch Redis/Devvit server APIs.',
      from: { path: '^src/client/' },
      to: { path: '^src/(routes|state|lib/idem|lib/ratelimit|lib/circuitBreaker|lib/requireModerator|lib/log|lib/retry|core/configSource|core/explainEvent|core/explainRule)' },
    },
    {
      name: 'no-circular',
      severity: 'warn',
      comment: 'Circular imports break code-splitting + create initialization ordering bugs. KNOWN allowed cycle: runRule ↔ ruleset (composite rule pattern — ruleset.ts calls runRule on its children).',
      from: {},
      to: { circular: true, pathNot: '^src/(core/runRule|rules/ruleset)\\.ts$' },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Orphan modules (no imports + no importers) are likely dead code. Allow type-only files and module-internal types.',
      from: { orphan: true, pathNot: '(^src/index\\.ts$|^src/client/main\\.tsx$|^src/client/styles\\.d\\.ts$|\\.d\\.ts$|/types\\.ts$|^src/shared/types\\.ts$|^src/lib/retry\\.ts$)' },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
