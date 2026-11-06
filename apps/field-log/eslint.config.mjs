import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// Minimal config: only the hooks rules, so a hook after an early return cannot ship again.
export default [
  { files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'], languageOptions: { parser: tseslint.parser } },
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
