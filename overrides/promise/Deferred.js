Ext.define('App.overrides.promise.Deferred', {
    override: 'Ext.promise.Deferred',

    /**
     * Resolve this Deferred with the (optional) specified value.
     *
     * Once a Deferred has been fulfilled or rejected, it is considered to be complete
     * and subsequent calls to `resolve` or `reject` are ignored.
     *
     * @param {Object} context Scope to resolve with
     * @param {Array} values Value to resolve as either a fulfillment value or rejection
     * reason.
     */
    resolveWith: function(context, values){
        if (this.completed) {
            return;
        }

        this.complete('fulfill', context || {}, values);
    },

    /**
     * Reject this Deferred with the specified context and reason.
     *
     * Once a Deferred has been rejected, it is considered to be complete
     * and subsequent calls to `resolve` or `reject` are ignored.
     *
     * @param {Object} context Scope to resolve with
     * @param {Error} reason Rejection reason.
     */
    rejectWith: function(context, reason) {
        if (this.completed) {
            return;
        }

        this.complete('reject', context || {}, reason);
    },

    /**
     * Complete this Deferred with the specified action and value.
     *
     * @param {String} action Completion action (i.e. 'fufill' or 'reject').
     * @param {Object} context Scope to resolve with
     * @param {Mixed} value Fulfillment value or rejection reason.
     *
     * @private
     */
    complete: function(action, context, value) {
        var me = this,
            consequences = me.consequences,
            consequence, i, len;

        if(arguments.length === 2){
            value = context;
            context = {};
        }

        me.completionAction = action;
        me.completionValue = value;
        me.completed = true;

        for (i = 0, len = consequences.length; i < len; i++) {
            consequence = consequences[i];
            consequence.trigger(me.completionAction, context, me.completionValue);
        }

        me.consequences = null;
    }
});
