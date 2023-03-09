const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlReplaceWebpackPlugin = require('html-replace-webpack-plugin')

const dirApp = path.join(__dirname, 'app');

const addressNoAliasJson = require('./tools/convert/area-test-no-alias.json');
const singleAliasJson = require('./tools/convert/area-test-single-alias-olsp.json');
const multipleAliasJson = require('./tools/convert/area-test-multiple-alias.json');

/**
 * Webpack Configuration
 */
module.exports = {
    entry : path.join(dirApp, 'lib/address-parse.js'),
    output: {
        filename     : 'zh-address-parse.min.js', //打包之后生成的文件名，可以随意写。
        library      : 'ZhAddressParse', // 指定类库名,主要用于直接引用的方式(比如使用script 标签)
        libraryExport: "default", // 对外暴露default属性，就可以直接调用default里的属性
        globalObject : 'this', // 定义全局变量,兼容node和浏览器运行，避免出现"window is not defined"的情况
        libraryTarget: 'umd' // 定义打包方式Universal Module Definition,同时支持在CommonJS、AMD和全局变量使用
    },
    mode  : "production",
    // optimization: {
    //     minimize: false
    // },
    module : {
        rules: [
            // BABEL
            {
                test   : /\.js$/,
                loader : 'babel-loader',
                exclude: /(node_modules)/,
                options: {
                    compact: true
                }
            },
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.join(__dirname, 'dist-lib-test.html'),
            title   : 'zh-address-parse'
        }),
        new CopyWebpackPlugin({
            patterns: [
                {from: 'assets/styles/index.css'},
            ],
        }),
        new HtmlReplaceWebpackPlugin([{
            pattern    : 'const addressNoAliasJson = {};',
            replacement: 'const addressNoAliasJson = ' + JSON.stringify(addressNoAliasJson)
        }, {
            pattern    : 'const singleAliasJson = {};',
            replacement: 'const singleAliasJson = ' + JSON.stringify(singleAliasJson)
        }, {
            pattern    : 'const multipleAliasJson = {};',
            replacement: 'const multipleAliasJson = ' + JSON.stringify(multipleAliasJson)
        }])
    ],
};
