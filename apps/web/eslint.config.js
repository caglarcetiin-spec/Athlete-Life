import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(js.configs.recommended,...tseslint.configs.recommended,{files:['src/**/*.{ts,tsx}'],rules:{'@typescript-eslint/no-explicit-any':'error'},languageOptions:{globals:{window:'readonly',document:'readonly',navigator:'readonly',fetch:'readonly',setTimeout:'readonly',clearTimeout:'readonly',setInterval:'readonly',clearInterval:'readonly',console:'readonly',crypto:'readonly',URL:'readonly',Blob:'readonly',indexedDB:'readonly',CustomEvent:'readonly',Event:'readonly'}}});
