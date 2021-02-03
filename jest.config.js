module.exports = {
    clearMocks: true,
    collectCoverageFrom: [
        'src/**/*.js'
    ],
    transform: {
        '^.+\\.js?$': 'babel-jest'
    },
    transformIgnorePatterns: [
        '<rootDir>/node_modules/(?!lodash-es)'
    ],
    silent: true
};
