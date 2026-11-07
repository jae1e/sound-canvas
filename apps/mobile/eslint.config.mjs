import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
export default [
  { files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'], languageOptions: { parser: tseslint.parser } },
  { files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'], plugins: { 'react-hooks': reactHooks, '@typescript-eslint': tseslint.plugin }, rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' } },
];
