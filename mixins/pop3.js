if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(['poplib', 'mailparser'], function(POP3Client, MailParser){
    

    var mixin = {
        init: function(cfg, callback){
            var self = this;

            var errs = [];
            
            for(var key in cfg){
                self.set(key, cfg[key]);
            }
            
            var host = self.get('host');
            var port = self.get('port');
            var username = self.get('username');
            var password = self.get('password');

            var enabletls = self.get('enabletls');
            var debug = self.get('debug');

            var auto = self.get('auto')!==false;

            self.client = new POP3Client(port, host, {
                tlserrs: false,
                enabletls: true,
                debug: false
            });

            self.client.on('error', function(err){
                self.emit('Pop3.error', {
                    err: err
                });
            });

            self.client.on("connect", function() {
                self.emit('Pop3.connected', {
                    time: new Date()
                });

                if(auto){
                    self.publish('login', {});
                }
            });

            self.client.on("invalid-state", function(cmd) {
                self.emit('Pop3.invalid-state', {
                    cmd: cmd
                });
            });

            self.client.on("locked", function(cmd) {
                self.emit('Pop3.locked', {
                    cmd: cmd
                });
            });

            self.client.on("login", function(status, rawdata) {
                self.emit('Pop3.login', {
                    status: status,
                    rawdata: rawdata
                });

                if(auto){
                    self.client.list();
                    self.publish('list', {});
                }
            });

            // Data is a 1-based index of messages, if there are any messages
            self.client.on("list", function(status, msgcount, msgnumber, data, rawdata) {
                self.emit('Pop3.list', {
                    status: status,
                    msgcount: msgcount,
                    msgnumber: msgnumber,
                    data: data,
                    rawdata: rawdata
                });

                if(auto){
                    if(msgcount>0){
                        self.publish('retrieve', {});
                    }
                }
            });

            self.client.on("retr", function(status, msgnumber, data, rawdata) {
                self.emit('Pop3.retr', {
                    status: status,
                    msgnumber: msgnumber,
                    data: data,
                    rawdata: rawdata
                });

                if(status===true){
                    var mailparser = new MailParser.MailParser();
                    
                    mailparser.on("end", function(mail){
                        self.emit('Pop3.mail', {
                            message: mail
                        });
                    });

                    mailparser.write(data);
                    mailparser.end();    
                }
                
            });

            self.client.on("dele", function(status, msgnumber, data, rawdata) {
                self.emit('Pop3.dele', {
                    status: status,
                    msgnumber: msgnumber,
                    data: data,
                    rawdata: rawdata
                });
            });

            self.client.on("quit", function(status, rawdata) {
                self.emit('Pop3.quit', {
                    status: status,
                    rawdata: rawdata
                });
            });

            if(callback){
                if(errs.length===0){
                    errs = false;
                }
            
                callback(errs, cfg);
            }
        },
        publish: function(topic, data, callback){
            var self = this;
            var errs = [];
            
            switch(topic){
                case 'login':
                    var username = data.username || self.get('username');
                    var password = data.password || self.get('password');

                    self.client.login(username, password);
                    break;
                case 'list':
                    self.client.list();
                    break;
                case 'retrieve':
                    var msgnumber = data.msgnumber || 1;
                    self.client.retr(msgnumber);
                    break;
                case 'delete':
                    var msgnumber = data.msgnumber || 1;
                    self.client.dele(msgnumber);
                    break;
            }
            
            if(callback){
                if(errs.length===0){
                    errs = false;
                }

                callback(errs, {
                    topic: topic,
                    data: data
                });
            }

        }
    };
    
    return mixin;
});