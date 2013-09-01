if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(['./mixins/pop3'], function(pop3){
    
    var mixin = {
        pop3: pop3
    };
    
    return mixin;
});