Ext.define('App.overrides.promise.Consequence', {
    override: 'Ext.promise.Consequence',

    /**
     * Trigger this Consequence with the specified action and value.
     *
     * @param {String} action Completion action (i.e. fulfill or reject).
     * @param {Object} context Scope to resolve with
     * @param {Mixed} value Fulfillment value or rejection reason.
     */
    trigger: function(action, context, value) {
        var me = this,
            deferred = me.deferred;

        switch (action) {
            case 'fulfill':
                me.propagate(context, value, me.onFulfilled, deferred, deferred.resolve);
                break;

            case 'reject':
                me.propagate(context, value, me.onRejected, deferred, deferred.reject);
                break;
        }
    },

    /**
     * Transform and propagate the specified value using the
     * optional callback and propagate the transformed result.
     *
     * @param {Object} context Scope to resolve with
     * @param {Mixed} value Value to transform and/or propagate.
     * @param {Function} [callback] Callback to use to transform the value.
     * @param {Function} deferred Deferred to use to propagate the value, if no callback
     * was specified.
     * @param {Function} deferredMethod Deferred method to call to propagate the value,
     * if no callback was specified.
     *
     * @private
     */
    propagate: function(context, value, callback, deferred, deferredMethod) {
        if (Ext.isFunction(callback)) {
            this.schedule(function() {
                try {
                    deferred.resolve(Ext.callback(callback, context, value));
                }
                catch (e) {
                    deferred.reject(e);
                }
            });
        }
        else {
            deferredMethod.call(this.deferred, value);
        }
    }
});
