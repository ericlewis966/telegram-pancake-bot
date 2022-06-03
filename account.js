const fs = require('fs');
const Web3 = require('web3');

var params = process.argv.slice(2);
var args = {};
for (var i = 0, len = params.length; i < len; i+=1) {
    var key_value = params[i].split('=');
    args[key_value[0]] = key_value[1];
}

const web3 = new Web3();

function addAccount () {
    fs.readFile('./accounts.json', "utf-8", (err, data) => {
        if(err) {
            console.log(err);
            return;
        }
        var accounts = JSON.parse(data);
        const account = web3.eth.accounts.privateKeyToAccount(args.key);
        if(args.del && !!accounts[args.key]) {
            delete accounts[args.key];
        } else {
            accounts[account.privateKey] = account.address;
        }
        fs.writeFile('./accounts.json', JSON.stringify(accounts), err => {
            if(err) {
                console.log(err);
            }
        })
        console.log('Success\n');
        console.log(accounts);
    })
}

addAccount();