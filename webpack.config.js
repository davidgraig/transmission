module.exports = {
    devtool: 'inline-source-map',
    entry: './client/Discovery.ts',
    output: {
        filename: './bin/client/bundle.js'
    },
    resolve: {
        // Add `.ts` and `.tsx` as a resolvable extension.
        extensions: ['.js', '.ts', '.tsx']
    },
    module: {
        rules: [
            // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
            { test: /\.tsx?$/, loader: 'ts-loader' }
        ]
    },
    node: {
        fs: 'empty'
    }
}