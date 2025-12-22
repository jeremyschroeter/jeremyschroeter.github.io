import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import postcss from 'rollup-plugin-postcss';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/blog-components.js',
    format: 'iife',
    name: 'BlogComponents',
    sourcemap: !production
  },
  plugins: [
    resolve(),
    commonjs(),
    postcss({
      inject: true,
      minimize: production
    })
  ]
};
