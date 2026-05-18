/**
 * AA-X81 commitlint config — enforces Conventional Commits.
 * Allowed types match CONTRIBUTING.md (feat / fix / docs / chore /
 * refactor / test / perf / ci / build / style / revert).
 *
 * Override locally per-commit via: git commit --no-verify
 * Override globally via: HUSKY=0 git commit ...
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'chore',
        'refactor',
        'test',
        'perf',
        'ci',
        'build',
        'style',
        'revert',
      ],
    ],
    'subject-case': [0],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
