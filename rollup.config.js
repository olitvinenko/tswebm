import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import del from 'rollup-plugin-delete';

export default [
    {
        input: 'src/index.ts',
        output: {
            format: 'cjs',
            file: 'dist/tswebm.js'
        },
        plugins: [
            del({ targets: './dist/*', verbose: true }),
            typescript({
                tsconfig: './tsconfig.json',
                compilerOptions: {
                    declaration: true,
                    declarationDir: './dist/types'
                }
            })
        ]
    },
    {
        input: './dist/types/index.d.ts',
        output: [{ file: 'dist/tswebm.d.ts', format: 'es' }],
        plugins: [dts.default(), del({ targets: './dist/types', hook: 'buildEnd' })]
    }
];
