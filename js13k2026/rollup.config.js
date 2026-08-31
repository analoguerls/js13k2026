import kontra from 'rollup-plugin-kontra';

export default {
    input: 'src/js/script.js',
    output: {
        file: 'src/js/script.bundle.js',
        format: 'iife',
        name: 'bundle'
    },
    plugins: [
        kontra({
            gameObject: {
                anchor: true
            },

            text: {
                align: true
            }
        })
    ]
};

// RUN: npx rollup -c
