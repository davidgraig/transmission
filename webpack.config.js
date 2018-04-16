module.exports = {
    devtool: 'inline-source-map',
    entry: './src/client/Discovery.ts',
    output: {
        filename: './bin/static/bundle.js'
    },
    resolve: {
        // Add `.ts` and `.tsx` as a resolvable extension.
        extensions: ['.js', '.ts', '.tsx']
    },
    module: {
        rules: [
            { test: /\.tsx?$/, loader: 'ts-loader' } // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
        ]
    },
    node: {
        fs: 'empty'
    }
}