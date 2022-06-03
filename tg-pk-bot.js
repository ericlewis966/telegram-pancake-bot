#!/usr/bin/ nodejs
process.env.NTBA_FIX_319 = 1;

const fs = require('fs');
const Cronr = require('cronr');
const Web3 = require('web3');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
require("dotenv").config();
// ========================TG bot setting =========================
const token = process.env.TOKEN;
const bot = new TelegramBot(token, {polling:true});
var botUsers = {};
var currentUser = null;
    // reading params
var args = {};
console.log('Welcome to Telegram-PancakeSwap Sniper bot!');

// ======================== DEFAULT CONFIG ========================
var bscNetwork = 'mainnet';
var allowedNetworks = ['testnet', 'mainnet'];
var gasLimit = 500000;
var gasPrice = 10; // in gwei
var transactionIterations = 1;
var executed = 0;
var transactionSlippage = 15; // in percents
var transactionDeadline = 1200; // in seconds
var createLogs = false;
var cronTime = '*/100 * * * * * *'; // every 10 milliseconds
var botInitialDelay = 10000;
var targetProfit = 0;
// ======================== /DEFAULT CONFIG =======================

var logsDir = __dirname + '/logs/';
var logsPath = logsDir + new Date().toISOString().slice(0,10) + '.txt';

const projectData = {
    utils: {
        createLog: function(content) {
            if (createLogs) {
                console.log(content);
                if (fs.existsSync(logsPath)) {
                    content = '\r\n' + new Date().toUTCString() + ': ' + content;
                }
                fs.appendFile(logsPath, content, function (err) {
                    if (err) throw err;
                });
            }
        },
        propertyExists: function(object, key) {
            return object ? hasOwnProperty.call(object, key) : false;
        }
    }
};

function initPancakeswapSniperBot() {
    bscNetwork = (projectData.utils.propertyExists(args, 'bscNetwork') && allowedNetworks.includes(args.bscNetwork)) ? args.bscNetwork : bscNetwork;
    if (bscNetwork == 'mainnet') {
        var web3 = new Web3(new Web3.providers.HttpProvider('https://bsc-dataseed.binance.org/'));
        var pancakeContractAddress = '0x10ed43c718714eb63d5aa57b78b54704e256024e';
        var wbnbAddress = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
        var chainId = 56;
    } else if (bscNetwork == 'testnet') {
        var web3 = new Web3(new Web3.providers.HttpProvider('https://data-seed-prebsc-1-s1.binance.org:8545'));
        var pancakeContractAddress = '0x9ac64cc6e4415144c455bd8e4837fea55603e5c3';
        var wbnbAddress = '0xae13d989dac2f0debff460ac112a837c89baa7cd';
        // var web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545/'));
        // var pancakeContractAddress = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
        // var wbnbAddress = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
        var chainId = 97;
    }

// ======================== REQUIRED PARAMETERS ========================
    if (!projectData.utils.propertyExists(args, 'tokenAddress') || args.tokenAddress == '' || args.tokenAddress == null || args.tokenAddress == undefined || args.tokenAddress.length != 42) {
        sendLog('Missing or wrong tokenAddress parameter.', true);
        return console.error('Missing or wrong tokenAddress parameter.');
    } else if (!projectData.utils.propertyExists(args, 'buyingBnbAmount') || args.buyingBnbAmount == '' || args.buyingBnbAmount == null || args.buyingBnbAmount == undefined) {
        sendLog('Missing or wrong buyingBnbAmount parameter.', true);
        return console.error('Missing or wrong buyingBnbAmount parameter.');
    } else if (!projectData.utils.propertyExists(args, 'senderPrivateKey') || args.senderPrivateKey == '' || args.senderPrivateKey == null || args.senderPrivateKey == undefined || args.senderPrivateKey.length != 66) {
        sendLog('Missing or wrong senderPrivateKey parameter.', true);
        return console.error('Missing or wrong senderPrivateKey parameter.');
    } else if (projectData.utils.propertyExists(args, 'targetProfit') && targetProfit > 100) {
        sendLog('Target profit must less than 100.', true);
        return console.error('Target profit must less than 100.');
    }

    const accountsData = fs.readFileSync('./accounts.json', {encoding: 'utf-8'});
    const accounts = JSON.parse(accountsData);
    if(!accounts[args.senderPrivateKey]) {
        sendLog('Sorry, you are not allowed user.', true);
        return console.error('Not allowed user.');
    }

    var buyingBnbAmount = args.buyingBnbAmount;
    var tokenAddress = args.tokenAddress;
    var senderPrivateKey = args.senderPrivateKey;
    var senderAddress = web3.eth.accounts.privateKeyToAccount(senderPrivateKey).address;
    // ======================== /REQUIRED PARAMETERS ========================

    // ======================== CHANGING DEFAULT PARAMETERS IF THEY ARE PASSED ========================
    sendLog('Check your parameters.', false);
    console.log('Address used to send the transactions: ' + senderAddress);
    sendLog('Address used to send the transactions: ' + senderAddress, false);
    console.log('BSC network: ' + bscNetwork);
    sendLog('BSC network: ' + bscNetwork, false);
    gasLimit = (projectData.utils.propertyExists(args, 'gasLimit') && args.gasLimit != '' && args.gasLimit != null && args.gasLimit != undefined) ? args.gasLimit : gasLimit;
    console.log('Gas limit: ' + gasLimit);
    sendLog('Gas limit: ' + gasLimit, false);
    gasPrice = (projectData.utils.propertyExists(args, 'gasPrice') && args.gasPrice != '' && args.gasPrice != null && args.gasPrice != undefined) ? args.gasPrice * 1000000000 : gasPrice * 1000000000;
    console.log('Gas price: ' + (gasPrice / 1000000000) + ' Gwei');
    sendLog('Gas price: ' + (gasPrice / 1000000000) + ' Gwei', false);
    transactionIterations = (projectData.utils.propertyExists(args, 'transactionIterations') && args.transactionIterations != '' && args.transactionIterations != null && args.transactionIterations != undefined) ? args.transactionIterations : transactionIterations;
    console.log('Transaction iterations: ' + transactionIterations);
    sendLog('Transaction iterations: ' + transactionIterations, false);
    transactionSlippage = (projectData.utils.propertyExists(args, 'transactionSlippage') && args.transactionSlippage != '' && args.transactionSlippage != null && args.transactionSlippage != undefined) ? args.transactionSlippage : transactionSlippage;
    console.log('Transaction slippage: ' + transactionSlippage);
    sendLog('Transaction slippage: ' + transactionSlippage, false);
    transactionDeadline = (projectData.utils.propertyExists(args, 'transactionDeadline') && args.transactionDeadline != '' && args.transactionDeadline != null && args.transactionDeadline != undefined) ? args.transactionDeadline : transactionDeadline;
    console.log('Transaction deadline: ' + transactionDeadline);
    sendLog('Transaction deadline: ' + transactionDeadline, false);
    createLogs = (projectData.utils.propertyExists(args, 'createLogs') && args.createLogs === 'true') ? true : createLogs;
    console.log('Creating logs: ' + createLogs);
    sendLog('Creating logs: ' + createLogs, false);
    cronTime = (projectData.utils.propertyExists(args, 'cronTime') && args.cronTime != '' && args.cronTime != null && args.cronTime != undefined) ? args.cronTime : cronTime;
    console.log('Cron time: ' + cronTime);
    sendLog('Cron time: ' + cronTime, false);
    botInitialDelay = (projectData.utils.propertyExists(args, 'botInitialDelay') && args.botInitialDelay != '' && args.botInitialDelay != null && args.botInitialDelay != undefined) ? args.botInitialDelay : botInitialDelay;
    console.log('Bot initial delay: ' + botInitialDelay);
    sendLog('Bot initial delay: ' + botInitialDelay, false);
    targetProfit = (projectData.utils.propertyExists(args, 'targetProfit') && args.targetProfit != '' && args.targetProfit != null && args.targetProfit != undefined) ? args.targetProfit : targetProfit;
    console.log('Target Profit: ' + targetProfit);
    sendLog('Target Profit: ' + targetProfit, false);
    // ======================== /CHANGING DEFAULT PARAMETERS IF THEY ARE PASSED ========================

// if logs dir missing then create it
    if (createLogs && !fs.existsSync(logsDir)){
        fs.mkdirSync(logsDir);
    }

    var pancakeContractABI = [{"inputs":[{"internalType":"address","name":"_factory","type":"address"},{"internalType":"address","name":"_WETH","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"WETH","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint256","name":"amountADesired","type":"uint256"},{"internalType":"uint256","name":"amountBDesired","type":"uint256"},{"internalType":"uint256","name":"amountAMin","type":"uint256"},{"internalType":"uint256","name":"amountBMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"addLiquidity","outputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"amountB","type":"uint256"},{"internalType":"uint256","name":"liquidity","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountTokenDesired","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"addLiquidityETH","outputs":[{"internalType":"uint256","name":"amountToken","type":"uint256"},{"internalType":"uint256","name":"amountETH","type":"uint256"},{"internalType":"uint256","name":"liquidity","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"reserveIn","type":"uint256"},{"internalType":"uint256","name":"reserveOut","type":"uint256"}],"name":"getAmountIn","outputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"reserveIn","type":"uint256"},{"internalType":"uint256","name":"reserveOut","type":"uint256"}],"name":"getAmountOut","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"}],"name":"getAmountsIn","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"}],"name":"getAmountsOut","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"reserveA","type":"uint256"},{"internalType":"uint256","name":"reserveB","type":"uint256"}],"name":"quote","outputs":[{"internalType":"uint256","name":"amountB","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountAMin","type":"uint256"},{"internalType":"uint256","name":"amountBMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidity","outputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"amountB","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidityETH","outputs":[{"internalType":"uint256","name":"amountToken","type":"uint256"},{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidityETHSupportingFeeOnTransferTokens","outputs":[{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"approveMax","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"removeLiquidityETHWithPermit","outputs":[{"internalType":"uint256","name":"amountToken","type":"uint256"},{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"approveMax","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"removeLiquidityETHWithPermitSupportingFeeOnTransferTokens","outputs":[{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountAMin","type":"uint256"},{"internalType":"uint256","name":"amountBMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"approveMax","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"removeLiquidityWithPermit","outputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"amountB","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapETHForExactTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactETHForTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactETHForTokensSupportingFeeOnTransferTokens","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForETH","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForETHSupportingFeeOnTransferTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExeactTokensForTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForTokensSupportingFeeOnTransferTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMax","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapTokensForExactETH","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMax","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapTokensForExactTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}];
    var pancakeContract = new web3.eth.Contract(pancakeContractABI, pancakeContractAddress);

    var preAmountOut = 0;
    var currentProfit = 0;
    var currentLoss = 0;
    var currentProfitByPercent = 0;
    var currentProfitByPercent = 0;

    if (botInitialDelay > 0) {
        console.log('Starting the PancakeSwap Sniper bot in ' + (botInitialDelay / 1000) + ' seconds... ¯\\_(*o*)_/¯');
    } else {
        console.log('Starting the PancakeSwap Sniper bot now... ¯\\_(*o*)_/¯');
    }

    setTimeout(function () {
        var executeBuy = true;
        // check if sender has enough balance
        web3.eth.getBalance(senderAddress, function (getBalanceErr, getBalanceResponse) {
            if (!getBalanceErr) {
                if (BigInt(web3.utils.toWei(buyingBnbAmount, 'ether')) < BigInt(getBalanceResponse)) {
                    // check if token address is a contract address
                    web3.eth.getCode(tokenAddress, function (getCodeErr, getCodeResponse) {
                        if (!getCodeErr) {
                            if (getCodeResponse != '0x') {
                                // take the current nonce of the sender
                                web3.eth.getTransactionCount(senderAddress, 'pending', function (nonceErr, nonceResponse) {
                                    var nonce = nonceResponse;
                                    var txParams = {
                                        gas: web3.utils.toHex(gasLimit),
                                        gasPrice: web3.utils.toHex(gasPrice),
                                        nonce: web3.utils.toHex(nonce),
                                        chainId: chainId,
                                        value: web3.utils.toHex(web3.utils.toWei(buyingBnbAmount, 'ether')),
                                        to: pancakeContractAddress
                                    };
                                    sendLog('I started detecting.', false);
                                    const job = new Cronr(cronTime, function() {
                                        projectData.utils.createLog('Cronjob iteration.');
                                        if (executeBuy) {
                                            executeBuy = false;

                                            return executeTransaction(executed);
                                            function executeTransaction(executed) {
                                                pancakeContract.methods.getAmountsOut(web3.utils.toWei(buyingBnbAmount, 'ether'), [wbnbAddress, tokenAddress]).call({}, function(amountsOutError, amountsOutResult)   {
                                                    if (!amountsOutError) {
                                                        var amountOut = amountsOutResult[1];
                                                        console.log(amountOut);
                                                        if (amountOut > 0) {
                                                            amountOut = amountOut - (amountOut * transactionSlippage / 100);
                                                            projectData.utils.createLog('Trading pair is active.');

                                                            amountOut = BigInt(Math.round(amountOut));
                                                            amountOut = amountOut.toString();

                                                            // check if swap transaction is going to succeed or fail
                                                            pancakeContract.methods.swapExactETHForTokens(amountOut, [wbnbAddress, tokenAddress], senderAddress, Math.round(new Date(new Date().getTime() + (transactionDeadline * 1000)).getTime() / 1000)).estimateGas({from: senderAddress, gas: gasLimit, value: web3.utils.toHex(web3.utils.toWei(buyingBnbAmount, 'ether'))}, function(gasEstimateError, gasAmount) {
                                                                if (!gasEstimateError) {
                                                                    projectData.utils.createLog('Method executeTransaction, params: {executed: ' + executed  + ',  amountOut: ' + amountOut  + ', wbnbAddress: ' + wbnbAddress  + ', tokenAddress: ' + tokenAddress  + ', senderAddress: ' + senderAddress + '}');
                                                                    sendLog('Method executeTransaction, params: {executed: ' + executed  + ',  amountOut: ' + amountOut  + ', wbnbAddress: ' + wbnbAddress  + ', tokenAddress: ' + tokenAddress  + ', senderAddress: ' + senderAddress + '}', false);
                                                                    txParams.data = pancakeContract.methods.swapExactETHForTokens(amountOut, [wbnbAddress, tokenAddress], senderAddress, Math.round(new Date(new Date().getTime() + (transactionDeadline * 1000)).getTime() / 1000)).encodeABI();

                                                                    web3.eth.accounts.signTransaction(txParams, senderPrivateKey, function (signTransactionErr, signedTx) {
                                                                        if (!signTransactionErr) {
                                                                            nonce += 1;
                                                                            txParams.nonce = web3.utils.toHex(nonce);

                                                                            web3.eth.sendSignedTransaction(signedTx.rawTransaction, function (sendSignedTransactionErr, transactionHash) {
                                                                                if (!sendSignedTransactionErr) {

                                                                                    executed += 1;
                                                                                    getProfitAndLoss();
                                                                                    
                                                                                    if(targetProfit > 0) {
                                                                                        if(targetProfit > currentProfitByPercent) {
                                                                                            return executeTransaction(executed);
                                                                                        } else {
                                                                                            projectData.utils.createLog('Achieved target profit.');

                                                                                            sendLog('👌Achieved target profit.', false);
                                                                                            stopWork();
                                                                                            job.stop();
                                                                                        }
                                                                                    }

                                                                                    if (transactionIterations != 1) {
                                                                                        projectData.utils.createLog('Buying order N: ' + executed + '. Transaction hash: ' + transactionHash);
                                                                                        sendLog('👌Buying order N: ' + executed + '. Transaction hash: ' + transactionHash, false);
                                                                                        if (transactionIterations != executed) {
                                                                                            return executeTransaction(executed);
                                                                                        } else {
                                                                                            stopWork();
                                                                                            job.stop();
                                                                                        }
                                                                                    } else {
                                                                                        projectData.utils.createLog('First and only buying order. Transaction hash: ' + transactionHash)
                                                                                        sendLog('First and only buying order. Transaction hash: ' + transactionHash, false);
                                                                                        stopWork();
                                                                                        job.stop();
                                                                                    }
                                                                                } else {
                                                                                    executeBuy = true;
                                                                                    if (sendSignedTransactionErr.message) {
                                                                                        projectData.utils.createLog('Method web3.eth.sendSignedTransaction failed. Message: ' + sendSignedTransactionErr.message);
                                                                                    } else {
                                                                                        projectData.utils.createLog('Method web3.eth.sendSignedTransaction failed. Message: ' + sendSignedTransactionErr.toString());
                                                                                    }
                                                                                }
                                                                            });
                                                                        } else {
                                                                            executeBuy = true;
                                                                            if (signTransactionErr.message) {
                                                                                projectData.utils.createLog('Method web3.eth.accounts.signTransaction failed. Message: ' + signTransactionErr.message);
                                                                            } else {
                                                                                projectData.utils.createLog('Method web3.eth.accounts.signTransaction failed. Message: ' + signTransactionErr.toString());
                                                                            }
                                                                        }
                                                                    });
                                                                } else {
                                                                    executeBuy = true;
                                                                    if (gasEstimateError.message) {
                                                                        projectData.utils.createLog('Method pancakeContract.methods.swapExactETHForTokens.estimateGas() failed. Message: ' + gasEstimateError.message);
                                                                    } else {
                                                                        projectData.utils.createLog('Method pancakeContract.methods.swapExactETHForTokens.estimateGas() failed. Message: ' + gasEstimateError.toString());
                                                                    }
                                                                }
                                                            });
                                                        } else {
                                                            executeBuy = true;
                                                            projectData.utils.createLog('Trading pair active. amountOut smaller or equal to 0.');
                                                        }
                                                    } else {
                                                        executeBuy = true;
                                                        projectData.utils.createLog('Trading pair not active yet.');
                                                    }
                                                });
                                            }

                                            function getProfitAndLoss() {
                                                pancakeContract.methods.getAmountsOut(web3.utils.toWei(buyingBnbAmount, 'ether'), [wbnbAddress, tokenAddress]).call({}, function(amountsOutError, amountsOutResult)   {
                                                    if(!amountsOutError && executed > 0) {
                                                        var compareResult = amountsOutResult[1] - preAmountOut;
                                                        if(compareResult > 0) {
                                                            currentProfit = compareResult;
                                                            currentLoss = 0;
                                                            currentProfitByPercent = (currentProfit / amountsOutResult[1]) * 100;
                                                            projectData.utils.createLog(`\n\nProfit!!! Current prefit is ${currentProfit}(${currentProfitByPercent}%)\n\n`);
                                                        } else {
                                                            currentLoss = compareResult;
                                                            currentProfit = 0;
                                                            currentLossByPercent = (currentLoss / amountsOutResult[1]) * 100;
                                                            projectData.utils.createLog(`\n\nLoss!!! Current loss is ${currentProfit}(${currentLossByPercent})\n\n`);    
                                                        }
                                                        preAmountOut = amountsOutResult[1];
                                                    }
                                                });
                                            }
                                        }
                                    }, {});
                                    job.start();
                                });
                            } else {
                                projectData.utils.createLog('Invalid tokenAddress parameter. tokenAddress must be contract address.');
                                sendLog('😥Invalid tokenAddress parameter. tokenAddress must be contract address.', true)
                                return false;
                            }
                        } else {
                            projectData.utils.createLog('Reading token address code failed.');
                            sendLog('Reading token address code failed.', true);
                            return false;
                        }
                    });
                } else {
                    executeBuy = true;
                    projectData.utils.createLog('Sender address does not have enough BNB balance to execute the transaction. Current balance: ' + web3.utils.fromWei(getBalanceResponse.toString(), 'ether') + ' BNB.');
                    sendLog('😥Sender address does not have enough BNB balance to execute the transaction. Current balance: ' + web3.utils.fromWei(getBalanceResponse.toString(), 'ether') + ' BNB.', true);
                    return false;
                }
            } else {
                projectData.utils.createLog('Reading sender address balance failed.');
                sendLog('😥Reading sender address balance failed.', true);
                return false;
            }
        });
    }, botInitialDelay);
}

function sendLog (message, exit) {
    bot.sendMessage(currentUser, message);
    if(exit) {
        bot.sendMessage(currentUser, "😥Sorry, I fhinished work without any success.");
        currentUser = null;
        args = {};
    }
}

function stopWork() {
    currentUser = null;
    args = {};
}

bot.onText(/\/start/, async (msg) => {
    await bot.sendPhoto(msg.chat.id,"./assets/banner.jpg");
    await bot.sendMessage(msg.chat.id,"👋Hello, I am TG-Pancake Snipe Bot.");
    await bot.sendMessage(msg.chat.id, "😎Enter /usebot command to make me ready.");
    console.log(msg.chat.id, "Started the bot.");
});

bot.onText(/\/usebot/, async (msg) => {
    await bot.sendMessage(msg.chat.id, "I am ready to start.\nPlease input parameters with /params command and -- operator.\n");
    await bot.sendMessage(msg.chat.id, "<b>Required Parameters:</b> \n\n<b>tokenAddress:</b> contract address of the token\n<b>buyingBnbAmount:</b> amount of BNB which you are willing to use to execute the buying transaction\n<b>senderPrivateKey:</b> private key of the wallet address which will be used to execute the buying transaction\n\n<b>Optional Parameters:</b> \n\n<b>gasLimit:</b> the maximum amount of gas you are willing to consume on a transaction, default value is 500000\n<b>gasPrice:</b> the transaction gas price in Gwei, default value is 10 Gwei\n<b>transactionIterations:</b> how many times you want the transaction to be executed. Some fairlaunch projects have smart contract conditions to not buy big amounts of tokens for single transaction, so in the case that you want to buy bigger amount and to bypass the contract condition you can execute many transactions buying same amount. Setting transactionIterations to 3 will execute 3 different buying transactions with the same transaction parameters. Default value is 1\n<b>transactionSlippage:</b> the difference ( in percents ) between the expected price of a trade and the executed price of that trade. Default value is 15 percents, integer\n<b>transactionDeadline:</b>  your transaction will revert if it is pending for more than this long. Default value is 1200 seconds, integer\n<b>bscNetwork:</b> accepts only mainnet and testnet values. Defines to which network should the bot submit blockchain transactions. Default value is mainnet\n<b>cronTime:</b> how often should the bot try to buy the particular token. Default is */100 * * * * * * aka every 100 milliseconds\n<b>botInitialDelay:</b> by default when starting the bot for first time it has 10 seconds delay to double check what parameters have been passed. Setting this parameter to 0 will remove the delay if needed\n<b>targetProfit:</b> Profit percent to achieve", {parse_mode: 'HTML'});
    await bot.sendMessage(msg.chat.id, "<b>Example:</b> \n<code>/params --  tokenAddress=0xc9849e6fdb743d08faee3e34dd2d1bc69ea11a51 buyingBnbAmount=1.05 senderPrivateKey=0x8da4ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f createLogs=true gasPrice=25 transactionSlippage=30 bscNetwork=mainnet</code>", {parse_mode: 'HTML'});
    // botUsers[msg.chat.id] = true;
    currentUser = msg.chat.id;
})

bot.onText(/\/params/, (msg) => {
    if(currentUser == null) {
        bot.sendMessage(msg.chat.id, "I am  not ready for you. Please enter /usebot command to make me ready.");
        return false;
    } else if (currentUser!== null && currentUser !== msg.chat.id) {
        bot.sendMessage(msg.chat.id, "Now I am working for the other guy :)\nPlease wait till the end of processing.");
        return false;
    }
    var params = msg.text.toString().split(" -- ")[1].split(" ");
    if(params.length == 0) {
        sendLog(params.toString(), false);
        sendLog("😯Oops... Missed parameters.", true);
        return false;
    }
    for (var i = 0; i < params.length; i++) {
        var key_value = params[i].split('=');
        args[key_value[0]] = key_value[1];
    }
    // axios.get(`https://honeypotchecker.org/?address=${args.tokenAddress}`).then(res => {
    //     bot.send(msg.chat.id, res, {parse_mode: 'HTML'});
    // }).catch(res => {
    //     bot.sendMessage(msg.chat.id, "😥Sorry...Didn't fetch honeypot checker.");
    // })
    initPancakeswapSniperBot();
})

bot.on('message', msg => {
    var Hi = "hi";
    if (msg.text.toString().toLowerCase().indexOf(Hi) === 0) {
        bot.sendMessage(msg.chat.id, "Hello dear user");
    }
})