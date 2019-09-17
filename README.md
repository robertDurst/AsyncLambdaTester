# AsyncLambdaTester
AsyncLambdaTester is a novel test generator for asynchronous, higher-order functions written in JavaScript. 

This is a fork of [LambdaTester](https://github.com/sola-da/LambdaTester). See their [OOPSLA 2018 paper](http://software-lab.org/publications/oopsla2018_LambdaTester.pdf) for a detailed description.

## Requirements

- [Node.js](https://nodejs.org/en/) (>v6)
- Install required npm modules with `npm install`

## Overview

Directories in this repository:
1. **setupCode** - two files: *setupArray.js* the setup code to generate tests for array polyfills and *setupPromise.js*, the setup code to generate tests for promises.
2. **utilities** - utility files for test generation 

## Test Generation
To generate tests use the following command:

`node testGeneration.js <function names> <setup code>`


Explanation of required inputs:

    - function names: names of methods under test (e.g., reduce)
    - setup code: file containing setup code. To test array methods use setupCode/setupArray.js and to test promise methods use setupCode/setupPromise.js 

Examples:

- Disover callbacks of the reduce method using the array setup code

`node testGeneration.js 'reduce' ./setupCode/setupArray.js
