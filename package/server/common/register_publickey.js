'use strict'
require('log-timestamp');
const config = require('config');
const ldap = require('ldapjs');

const ldap_server_host = config.get('ldap_server_host');
const ldap_server_port = config.get('ldap_server_port');
const ldap_base_dn = config.get('ldap_base_dn');

function registerPublickey(userName, passWord, publickey, callback){

    const ldap_options = {
        'rejectUnauthorized': false, 
    };
    
    const client = ldap.createClient({
    
        url: ldap_server_host+':'+ldap_server_port,
        reconnect: true,
        tlsOptions: ldap_options
    
    });

    const dn = "uid=" + userName + "," + ldap_base_dn;

    client.bind(dn, passWord, function (err, res) {
        
        if(err){
            
            console.log(userName + ":Error Reason:" + err);
            client.destroy();
            callback({ code: -1, message: 'パスワードが一致しません'});

        }
        else{
            
            //console.log(userName + ":publickey:" + publickey);

            const change = {
                operation: 'replace',
                modification: {
                    sshPublicKey: publickey
                }
            };
            
            client.modify(dn, change, function (err) {

                if(err){
                    console.log(userName + ":Error Reason:" + err);
                    client.destroy();
                    callback({ code: -1, message: '公開鍵の設定に失敗しました 管理者にお問い合わせください' + err});

                }
                else{
                    console.log(userName + ":Registered PublicKey.");
                    client.destroy();
                    callback({ code: 0, message: '公開鍵の設定が完了しました'});
                }
        
            });

        }

    });

}

exports.registerPublickey = registerPublickey;