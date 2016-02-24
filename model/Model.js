Ext.define('App.model.Base', {
    extend: 'Ext.data.Model',
    requires: [
        'Ext.Deferred'
    ],

    /**
     * @localdoc Loads the model instance using the configured proxy.  The load action
     * is asynchronous.  Any processing of the loaded record should be done in assigned
     * callbacks.
     *
     *     Ext.define('MyApp.model.User', {
     *         extend: 'Ext.data.Model',
     *         fields: [
     *             {name: 'id', type: 'int'},
     *             {name: 'name', type: 'string'}
     *         ],
     *         proxy: {
     *             type: 'ajax',
     *             url: 'server.url'
     *         }
     *     });
     *
     *     var user = new MyApp.model.User();
     *
     *     user.load({ scope: someScope })
     *      .then(function(){
     *          // do something if the load succeeded
     *      }, function(){
     *          // do something if the load failed
     *      })
     *      .always(function(){
     *          // do something whether the load succeeded or failed
     *      });
     *
     * The options param is an {@link Ext.data.operation.Read} config object optional scope.
     *
     * @param {Object} [options] Options to pass to the proxy.
     *
     * @param {Object} options.scope The scope in which to execute the callback
     * functions.  Defaults to the model instance.
     *
     * @return {Ext.promise.Deferred} The deferred
     */
    load: function(options) {
        options = Ext.apply({}, options);

        var deferred = new Ext.Deferred(),
            me = this,
            scope = options.scope || me,
            proxy = me.getProxy(),
            operation = me.loadOperation,
            id = me.getId();

        if (operation) {
            // Already loading
            return deferred;
        }

        //<debug>
        var doIdCheck = true;
        if (me.phantom) {
            doIdCheck = false;
        }
        //</debug>

        options.id = id;

        // Always set the recordCreator. If we have a session, we're already
        // part of said session, so we don't need to handle that.
        options.recordCreator = function(data, type, readOptions) {
            // Important to change this here, because we might be loading associations,
            // so we do not want this to propagate down. If we have a session, use that
            // so that we end up getting the same record. Otherwise, just remove it.
            var session = me.session;
            if (readOptions) {
                readOptions.recordCreator = session ? session.recordCreator : null;
            }
            me.set(data, me._commitOptions);
            //<debug>
            // Do the id check after set since converters may have run
            if (doIdCheck && me.getId() !== id) {
                Ext.raise('Invalid record id returned for ' + id + '@' + me.entityName);
            }
            //</debug>
            return me;
        };

        options.internalCallback = function(operation) {
            var success = operation.wasSuccessful() && operation.getRecords().length > 0,
                successFailArgs = [me, operation];

            me.loadOperation = null;

            if (success) {
                deferred.resolveWith(scope, successFailArgs);
            } else {
                deferred.rejectWith(scope, successFailArgs);
            }

            me.callJoined('afterLoad');
        };


        me.loadOperation = operation = proxy.createOperation('read', options);
        operation.execute();

        return deferred;
    },

    /**
     * @localdoc Saves the model instance using the configured proxy.  The save action
     * is asynchronous.  Any processing of the saved record should be done in assigned callbacks.
     *
     *
     * Create example:
     *
     *     Ext.define('MyApp.model.User', {
     *         extend: 'Ext.data.Model',
     *         fields: [
     *             {name: 'id', type: 'int'},
     *             {name: 'name', type: 'string'}
     *         ],
     *         proxy: {
     *             type: 'ajax',
     *             url: 'server.url'
     *         }
     *     });
     *
     *     var user = new MyApp.model.User({
     *         name: 'Foo'
     *     });
     *     user.save
     *      .then(function(record, operation){
     *          record.set('name', 'Bar');
     *      });
     *
     *
     * @inheritdoc #method-load
     * @return {Ext.promise.Deferred} deferred
     */
    save: function(options) {
        options = Ext.apply({}, options);

        var deferred = new Ext.Deferred(),
            me = this,
            phantom = me.phantom,
            dropped = me.dropped,
            action = dropped ? 'destroy' : (phantom ? 'create' : 'update'),
            scope  = options.scope || me,
            proxy = me.getProxy(),
            operation;

        options.records = [me];
        options.internalCallback = function(operation) {
            var args = [me, operation],
                success = operation.wasSuccessful();

            if (success) {
                deferred.resolveWith(scope, args);
            } else {
                deferred.rejectWith(scope, args);
            }
        };

        operation = proxy.createOperation(action, options);

        // Not a phantom, then we must perform this operation on the remote datasource.
        // Record will be removed from the store in the callback upon a success response
        if (dropped && phantom) {
            // If it's a phantom, then call the callback directly with a dummy successful ResultSet
            operation.setResultSet(Ext.data.reader.Reader.prototype.nullResultSet);
            me.setErased();
            operation.setSuccessful(true);
        } else {
            operation.execute();
        }
        return deferred;
    },

    inheritableStatics: {
        /**
         * Asynchronously loads a model instance by id. Any processing of the loaded
         * record should be done in then.
         *
         * Sample usage:
         *
         *     Ext.define('MyApp.User', {
         *         extend: 'Ext.data.Model',
         *         fields: [
         *             {name: 'id', type: 'int'},
         *             {name: 'name', type: 'string'}
         *         ]
         *     });
         *
         *     MyApp.User.load(10, { scope: someScope })
         *      .then(function(){
         *          // do something if the load succeeded
         *      }, function(){
         *          // do something if the load failed
         *      })
         *      .always(function(){
         *          // do something whether the load succeeded or failed
         *      });
         *
         * @param {Number/String} id The ID of the model to load.
         * **NOTE:** The model returned must have an ID matching the param in the load
         * request.
         *
         * The options param is an {@link Ext.data.operation.Read} config object optional scope.
         *
         * @param {Object} [options] Options to pass to the proxy.
         *
         * @param {Object} options.scope The scope in which to execute the callback
         * functions.  Defaults to the model instance.
         *
         * @return {Ext.promise.Deferred} The deferred
         *
         * @static
         * @inheritable
         */
        load: function(id, options, session) {
            var data = {},
                rec,
                deferred;

            data[this.prototype.idProperty] = id;
            rec = new this(data, session);

            deferred = rec.load(options);

            return deferred;
        }
    }
});
