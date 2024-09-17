(function () {
  'use strict';

  const ReferenceIdPrefix = "#";
  const AccessPathSeparator = ".";

  class AccessPathsClass {
    /**
     * Checks if the is a reference identifier.
     * @param {string} accessPath
     * @returns {boolean}
     */
    isReferenceId(accessPath) {
      return !!accessPath && accessPath.startsWith(ReferenceIdPrefix);
    }

    /**
     * Gets the reference identifier from the access path.
     * @param {string} accessPath
     * @returns {string}
     */
    getReferenceId(accessPath) {
      return accessPath?.substring(ReferenceIdPrefix.length);
    }

    /**
     * Get access path from the specified reference identifier.
     * @param {string} referenceId The object reference identifier.
     * @returns {string} The access path.
     */
    fromReferenceId(referenceId) {
      return ReferenceIdPrefix + referenceId;
    }

    /**
     * Combine multiple access paths.
     * @param {string[]} accessPaths
     * @returns {string}
     */
    combine(...accessPaths) {
      return accessPaths?.filter(accessPath => typeof accessPath === "string" && accessPath.length)?.join(AccessPathSeparator);
    }

    /**
     * Splits the access path based on the access path separator.
     * @param {string} accessPath
     * @returns {string[]}
     */
    split(accessPath) {
      return accessPath?.split(AccessPathSeparator);
    }
  }

  const AccessPaths = new AccessPathsClass();

  class GuidClass {
    /**
     * Generate a new GUID.
     * @returns {string}
     */
    newGuid() {
      if (globalThis.crypto.randomUUID) {
        return globalThis.crypto.randomUUID();
      }

      return (1e7.toString() + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (parseInt(c) ^ globalThis.crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> parseInt(c) / 4).toString(16)
      );
    }
  }

  const Guid = new GuidClass();

  class JsBindError extends Error {
    /**
     * Creates a new instance of JsBindError.
     * @param {string} message
     * @param {string} [stackTrace]
     */
    constructor(message, stackTrace) {
      super(message);

      // Check if the stack trace is in the message
      let currentStackTrace = "";
      if (this.stack) {
        currentStackTrace = this.stack;
      } else {
        let stackTraceIndex = this.message.indexOf(message) + message.length;
        if (this.message.length > stackTraceIndex) {
          currentStackTrace = this.message.substring(stackTraceIndex);
          this.message = this.message.substring(0, stackTraceIndex);
        }
      }

      stackTrace = stackTrace || "";
      currentStackTrace = currentStackTrace ? "JavaScript stack trace: \n" + currentStackTrace : "";
      if (stackTrace && currentStackTrace) {
        this.stack = stackTrace + "\n\n" + currentStackTrace;
      } else {
        this.stack = stackTrace || currentStackTrace;
      }
    }
  }

  class JsObjectHandlerClass {
    constructor() {
      this._objectReferences = {};
      this._objectReferencesCount = 0;
    }

    /**
     * Get an object from access path.
     * @param {string} accessPath The access path.
     * @returns {any} The object reference.
     */
    getObjectFromAccessPath(accessPath) {
      if (!accessPath) {
        return globalThis;
      }

      let targetObject = globalThis;
      const accessPaths = AccessPaths.split(accessPath);

      for (let i = 0; i < accessPaths.length; i++) {
        if (i === 0 && AccessPaths.isReferenceId(accessPaths[i])) {
          const referenceId = AccessPaths.getReferenceId(accessPaths[i]);
          targetObject = this._objectReferences[referenceId];
        } else {
          targetObject = targetObject?.[accessPaths[i]];
        }
      }

      return targetObject;
    }

    /**
     * Add an object reference with the specified identifier.
     * @param {string} referenceId The object reference identifier.
     * @param {any} objectReference The object reference.
     */
    addObjectReference(referenceId, objectReference) {
      if (!this._objectReferences[referenceId]) {
        this._objectReferencesCount++;
      }
      this._objectReferences[referenceId] = objectReference;
    }

    /**
     * Gets an object reference from the reference identifier.
     * @param {string} referenceId The object reference identifier.
     */
    getObjectReference(referenceId) {
      return this._objectReferences[referenceId];
    }

    /**
     * Checks if an object reference is stored.
     * @param {string} referenceId The object reference identifier.
     */
    containsObjectReference(referenceId) {
      return this._objectReferences[referenceId] !== null && typeof this._objectReferences[referenceId] !== "undefined";
    }

    /**
     * Remove object reference.
     * @param {string} referenceId The object reference identifier.
     */
    removeObjectReference(referenceId) {
      if (this._objectReferences[referenceId]) {
        this._objectReferencesCount--;
        this._objectReferences[referenceId] = null;
        try {
          delete this._objectReferences[referenceId];
        } catch { }
      }
    }

    /**
     * Remove all the object references.
     */
    clearObjectReferences() {
      this._objectReferences = {};
      this._objectReferencesCount = 0;
    }

    /**
     * Get the object references.
     * @returns {object} The object references.
     */
    getObjectReferences() { return this._objectReferences; }

    /**
     * Get the count of the object references.
     * @returns {number} The count of the object references.
     */
    getObjectReferencesCount() { return this._objectReferencesCount; }
  }

  const JsObjectHandler = new JsObjectHandlerClass();

  const AccessPathPropertyName = "__jsBindAccessPath";
  const JsRuntimePropertyName = "__jsBindJsRuntime";

  /**
   * @typedef {import("./InvokeOptions/ObjectBindingConfiguration.js").default} ObjectBindingConfiguration
   * @typedef {import("./DotNetDelegateProxy.js").default} DotNetDelegateProxy
   */

  /**
   * Checks if the binding configuration should be processed.
   * @param {ObjectBindingConfiguration} binding
   * @returns {Boolean}
   */
  function shouldProcessBinding(binding) {
    return !!binding.arrayItemBinding || (binding.include && binding.include.length > 0) || (binding.exclude && binding.exclude.length > 0);
  }

  /**
   * Checks if the object should be processed.
   * @param {any} obj 
   * @returns {Boolean}
   */
  function shouldProcessObject(obj) {
    return obj && typeof obj === "object";
  }

  /**
   * Get all the keys in the object.
   * @param {any} value
   * @returns {string[]}
   */
  function getObjectKeys(value) {
    const objectPrototype = Object.getPrototypeOf(value);
    if (objectPrototype) {
      return [...Object.keys(value), ...getObjectKeys(objectPrototype)];
    }
    return Object.keys(value);
  }

  /**
   * Get the array value from array item binding.
   * @param {any} value
   * @param {ObjectBindingConfiguration} arrayItemBinding
   * @param {string} [accessPath]
   * @returns {any[]}
   */
  function getArrayValueFromBinding(value, arrayItemBinding, accessPath) {
    if (value && typeof value[Symbol.iterator] === "function") {
      return [...value].map((arrayItem, index) => {
        const arrayItemAccessPath = AccessPaths.combine(accessPath, index.toString());
        return getValueFromBinding(arrayItem, arrayItemBinding, arrayItemAccessPath);
      });
    }
    return [];
  }

  /**
   * Get the object for a JS function.
   * @param {any} value
   * @param {string} [accessPath]
   * @returns {any}
   */
  function getFunctionValue(value, accessPath) {
    if (IsProxyFunction(value)) {
      return {
        delegateId: value.delegateProxy.delegateReference.delegateId
      };
    }

    return {
      accessPath: accessPath
    };
  }

  /**
   * Check if the value should be returned without binding.
   * @param {any} value
   * @param {ObjectBindingConfiguration} binding
   * @param {string} [accessPath]
   * @returns {boolean}
   */
  function shouldReturnValueWithoutBinding(value, binding, accessPath) {
    if (!shouldProcessObject(value) || !binding) {
      return true;
    }

    if (!shouldProcessBinding(binding)) {
      if (binding.isBindingBase) {
        value[AccessPathPropertyName] = accessPath;
        value[JsRuntimePropertyName] = 0;
      }
      return true;
    }

    return false;
  }

  /**
   * Get the value based on the binding configuration.
   * @param {any} value
   * @param {ObjectBindingConfiguration} binding
   * @param {string} [accessPath]
   * @returns {any}
   */
  function getValueFromBinding(value, binding, accessPath) {
    if (value instanceof Function) {
      return getFunctionValue(value, accessPath);
    }

    if (shouldReturnValueWithoutBinding(value, binding, accessPath)) {
      return value;
    }

    if (binding.arrayItemBinding) {
      return getArrayValueFromBinding(value, binding.arrayItemBinding, accessPath);
    }

    const includeAllProperties = binding.include?.some(includeProperty => includeProperty === "*");
    const excludeProperties = binding.exclude?.map(excludeProperty => excludeProperty.toUpperCase());
    const getPropertyBinding = (propertyName) => {
      return binding.propertyBindings?.[propertyName.toUpperCase()];
    };

    const boundValue = {
    };

    if (binding.isBindingBase) {
      boundValue[AccessPathPropertyName] = accessPath;
      boundValue[JsRuntimePropertyName] = 0;
    }

    if (binding.include && !includeAllProperties) {
      // Fast path: The include properties are known
      binding.include.forEach(property => {
        boundValue[property] = getValueFromBinding(value[property], getPropertyBinding(property), AccessPaths.combine(accessPath, property));
      });
      return boundValue;
    }

    // Slow path: Include all properties or only the exclude properties are known
    getObjectKeys(value).forEach(property => {
      if (includeAllProperties) {
        boundValue[property] = getValueFromBinding(value[property], getPropertyBinding(property), AccessPaths.combine(accessPath, property));
      } else if (excludeProperties) {
        const upperCasePropertyName = property.toUpperCase();
        if (excludeProperties.every(excludeProperty => excludeProperty !== upperCasePropertyName)) {
          boundValue[property] = getValueFromBinding(value[property], getPropertyBinding(property), AccessPaths.combine(accessPath, property));
        }
      }
    });
    return boundValue;
  }

  class ObjectBindingHandlerClass {
    /**
     * Get the value based on the binding configuration.
     * @param {any} value
     * @param {ObjectBindingConfiguration} binding
     * @param {string} [accessPath]
     * @returns {any}
     */
    getValueFromBinding(value, binding, accessPath) { return getValueFromBinding(value, binding, accessPath); }
  }

  const ObjectBindingHandler = new ObjectBindingHandlerClass();

  /**
   * @typedef {import("./References/DelegateReference.js").default} DelegateReference
   * @typedef {import("./References/DelegateReference.js").TaskInvokeResult} TaskInvokeResult
   * @typedef {import("./InvokeResult.js").default} InvokeResult
   */

  /**
   * @typedef {Object} ProxyFunction
   * @property {DotNetDelegateProxy} delegateProxy
   */

  /**
   * Checks if an object is TaskInvokeResult.
   * @param {any} obj
   * @returns {obj is TaskInvokeResult}
   */
  function isTaskInvokeResult(obj) {
    return obj && !obj.hasOwnProperty("isError") && obj.hasOwnProperty("result");
  }

  /**
   * Unwrap the result if it is contained in a Task object.
   * @param {InvokeResult | TaskInvokeResult} asyncResult
   * @returns {InvokeResult}
   */
  function unwrapAsyncResult(asyncResult) {
    if (isTaskInvokeResult(asyncResult)) {
      // unwrap from a Task object
      return asyncResult.result;
    }
    return asyncResult;
  }

  /**
   * A DotNet delegate proxy to be invoked in JS.
   */
  class DotNetDelegateProxy {
    /**
     * Creates a new instance of the DotNetDelegateProxy class.
     * @param {DelegateReference} delegateReference The delegate reference.
     */
    constructor(delegateReference) {
      this.delegateReference = delegateReference;
      /** @type {ProxyFunction} A function, when invoked executes the DotNet delegate. */
      this.proxyFunction = this._dynamicInvoke.bind(this);
      this.proxyFunction.delegateProxy = this;
    }

    /**
     * Dynamically invoke the DotNet delegate synchronously.
     * @param  {any[]} invokeArgs JSON-serializable arguments.
     * @returns {object} An object obtained by JSON-deserializing the return value.
     */
    _dynamicInvoke(...invokeArgs) {
      const processedInvokeArgs = this._processInvokeArgs(invokeArgs);
      if (this.delegateReference.isAsync) {
        return this._invokeDelegateAsyncInternal(this.delegateReference.delegateId, processedInvokeArgs);
      } else {
        return this._invokeDelegateInternal(this.delegateReference.delegateId, processedInvokeArgs);
      }
    }

    /**
     * Invoke the DotNet delegate synchronously.
     * @param {string} delegateId
     * @param {any[]} invokeArgs
     * @returns {any} 
     */
    _invokeDelegateInternal(delegateId, invokeArgs) {
      const invokeResult = globalThis.DotNet.invokeMethod("JsBind.Net", "InvokeDelegateFromJs", delegateId, invokeArgs);
      if (invokeResult?.isError && invokeResult.errorMessage) {
        throw new JsBindError(invokeResult.errorMessage, invokeResult.stackTrace);
      }

      return invokeResult?.value;
    }

    /**
     * Invoke the DotNet delegate asynchronously.
     * @param {string} delegateId
     * @param {any[]} invokeArgs
     * @returns {Promise<any>} 
     */
    async _invokeDelegateAsyncInternal(delegateId, invokeArgs) {
      let invokeAsyncResult = await globalThis.DotNet.invokeMethodAsync("JsBind.Net", "InvokeDelegateFromJsAsync", delegateId, invokeArgs);
      let invokeResult = unwrapAsyncResult(invokeAsyncResult);

      if (invokeResult?.isError && invokeResult.errorMessage) {
        throw new JsBindError(invokeResult.errorMessage, invokeResult.stackTrace);
      }

      return invokeResult?.value;
    }

    /**
     * Process delegate invocation arguments.
     * @param {any[]} invokeArgs
     */
    _processInvokeArgs(invokeArgs) {
      const bindings = this.delegateReference.argumentBindings;
      if (!invokeArgs?.length || !bindings?.length) {
        return invokeArgs;
      }

      return invokeArgs.map((invokeArg, index) => {
        let invokeArgAccessPath = null;

        if (this.delegateReference.storeArgumentsAsReferences[index]) {
          let referenceId = this.delegateReference.argumentsReferenceIds[index];
          if (JsObjectHandler.containsObjectReference(referenceId) && JsObjectHandler.getObjectReference(referenceId) !== invokeArg) {
            referenceId = Guid.newGuid();
          }

          invokeArgAccessPath = AccessPaths.fromReferenceId(referenceId);
          JsObjectHandler.addObjectReference(referenceId, invokeArg);
        }

        return ObjectBindingHandler.getValueFromBinding(invokeArg, bindings[index], invokeArgAccessPath);
      });
    }
  }

  /**
   * Checks if a value is a ProxyFunction.
   * @param {any} value
   * @returns {value is ProxyFunction}
   */
   function IsProxyFunction(value) {
    return value && /** @type {ProxyFunction} */(value).delegateProxy?.proxyFunction === value;
  }

  /**
   * @typedef {import("./References/DelegateReference.js").default} DelegateReference
   */

  class DelegateReferenceHandlerClass {
    constructor() {
      /** @type {Object<string, DotNetDelegateProxy>} */
      this._delegateReferences = {};
      this._delegateReferencesCount = 0;
    }

    /**
     * Get or create the delegate proxy from the delegate reference.
     * @param {DelegateReference} delegateReference
     * @returns {DotNetDelegateProxy}
     */
    getOrCreateDelegateProxy(delegateReference) {
      if (this._delegateReferences[delegateReference.delegateId]) {
        return this._delegateReferences[delegateReference.delegateId];
      }

      this._delegateReferencesCount++;
      const delegateProxy = new DotNetDelegateProxy(delegateReference);
      this._delegateReferences[delegateReference.delegateId] = delegateProxy;
      return delegateProxy;
    }

    /**
     * Remove the delegate reference by delegate ID.
     * @param {string} delegateId 
     */
    removeDelegateReference(delegateId) {
      if (this._delegateReferences[delegateId]) {
        this._delegateReferencesCount--;
        this._delegateReferences[delegateId] = null;
        try {
          delete this._delegateReferences[delegateId];
        } catch { }
      }
    }

    /**
     * Remove all the delegate references.
     */
    clearDelegateReferences() {
      this._delegateReferences = {};
      this._delegateReferencesCount = 0;
    }

    /**
     * Get the delegate references.
     * @returns {object} The delegate references.
     */
    getDelegateReferences() { return this._delegateReferences; }

    /**
     * Get the count of the delegate references.
     * @returns {number} The count of the delegate references.
     */
    getDelegateReferencesCount() { return this._delegateReferencesCount; }
  }

  const DelegateReferenceHandler = new DelegateReferenceHandlerClass();

  class InvokeResult {
    /** @type {any} */
    value;
    /** @type {boolean} */
    isError;
    /** @type {string} */
    errorMessage;
    /** @type {string} */
    stackTrace;

    /**
     * Creates a new instance of InvokeResult.
     * @param {any} value
     * @param {boolean} [isError]
     * @param {string} [errorMessage]
     * @param {string} [stackTrace]
     */
    constructor(value, isError, errorMessage, stackTrace) {
      this.value = value;
      this.isError = isError;
      this.errorMessage = errorMessage;
      this.stackTrace = stackTrace;
    }
  }

  /**
   * @typedef {import("./ReferenceType.js").ReferenceTypeEnumValue} ReferenceTypeEnumValue
   */


  /**
   * Checks if a value is a ReferenceBase.
   * @param {any} value
   * @returns {value is ReferenceBase}
   */
  function IsReferenceBase(value) {
    return value &&
      typeof value === "object" &&
      /** @type {ReferenceBase} */(value).__isJsBindReference === true;
  }

  /** 
   * @typedef {"Object" | "Delegate"} ReferenceTypeEnumValue
   */

  /**
   * @typedef ReferenceTypeEnum
   * @property {ReferenceTypeEnumValue} Object
   * @property {ReferenceTypeEnumValue} Delegate
   */

  /**
   * @type {ReferenceTypeEnum}
   */
  const ReferenceType = {
    Object: "Object",
    Delegate: "Delegate"
  };

  /**
   * Checks if a value is a DelegateReference.
   * @param {any} value
   * @returns {value is DelegateReference}
   */
  function IsDelegateReference(value) {
    return IsReferenceBase(value) && value.__referenceType === ReferenceType.Delegate;
  }

  class DelegateReferenceReviverClass {
    /**
     * Converts a DelegateReference JSON object to a proxy function.
     * @param {any} _key
     * @param {any} value
     */
    revive(_key, value) {
      if (IsDelegateReference(value)) {
        return DelegateReferenceHandler.getOrCreateDelegateProxy(value).proxyFunction;
      }

      return value;
    }
  }

  const DelegateReferenceReviver = new DelegateReferenceReviverClass();

  /**
   * Checks if a value is a ObjectBindingConfiguration.
   * @param {any} value
   * @returns {value is ObjectBindingConfiguration}
   */
  function IsObjectBindingConfiguration(value) {
    return value &&
      typeof value === "object" &&
      /** @type {ObjectBindingConfiguration} */(value).__isObjectBindingConfiguration === true;
  }

  /**
   * @typedef {import("../InvokeOptions/ObjectBindingConfiguration.js").default} ObjectBindingConfiguration
   */

  /**
   * @callback FoundBindingCallback
   * @param {ObjectBindingConfiguration} binding
   */

  class ObjectBindingConfigurationReviverClass {
    constructor() {
      /** @type {Object<string, ObjectBindingConfiguration>} */
      this.references = {};
      /** @type {Object<string, FoundBindingCallback[]>} */
      this.referenceCallbacks = {};
    }

    /**
     * Revives reference binding configuration.
     * @param {any} _key
     * @param {any} value
     */
    revive(_key, value) {
      if (IsObjectBindingConfiguration(value)) {
        if (value.id) {
          this.foundObject(value);
        } else if (value.referenceId) {
          this.trackReference(value);
        }
      }

      return value;
    }

    /**
     * Called when an object with id is found.
     * @param {ObjectBindingConfiguration} obj 
     */
    foundObject(obj) {
      this.references[obj.id] = obj;
      if (this.referenceCallbacks.hasOwnProperty(obj.id)) {
        this.referenceCallbacks[obj.id].forEach(callback => callback(obj));
        this.referenceCallbacks[obj.id] = [];
        try {
          delete this.referenceCallbacks[obj.id];
        } catch { }
      }
    }

    /**
     * Track a reference object with reference id to be initialized when the referenced object is found.
     * @param {any} referenceObject 
     */
    trackReference(referenceObject) {
      const foundBinding = (/** @type {ObjectBindingConfiguration} */ binding) => {
        referenceObject.include = binding.include;
        referenceObject.exclude = binding.exclude;
        referenceObject.propertyBindings = binding.propertyBindings;
        referenceObject.isBindingBase = binding.isBindingBase;
        referenceObject.arrayItemBinding = binding.arrayItemBinding;
      };
      if (this.references.hasOwnProperty(referenceObject.referenceId)) {
        foundBinding(this.references[referenceObject.referenceId]);
      } else {
        if (!this.referenceCallbacks.hasOwnProperty(referenceObject.referenceId)) {
          this.referenceCallbacks[referenceObject.referenceId] = [];
        }
        this.referenceCallbacks[referenceObject.referenceId].push(foundBinding);
      }
    }
  }

  const ObjectBindingConfigurationReviver = new ObjectBindingConfigurationReviverClass();

  /**
   * Checks if a value is an ObjectReference.
   * @param {any} value
   * @returns {value is ObjectReference}
   */
  function IsObjectReference(value) {
    return IsReferenceBase(value) && value.__referenceType === ReferenceType.Object;
  }

  class ObjectReferenceReviverClass {
    /**
     * Converts an ObjectReference JSON object to an object.
     * @param {any} _key
     * @param {any} value
     */
    revive(_key, value) {
      if (IsObjectReference(value)) {
        return JsObjectHandler.getObjectFromAccessPath(value.accessPath);
      }

      return value;
    }
  }

  const ObjectReferenceReviver = new ObjectReferenceReviverClass();

  /**
   * @typedef {import("./InvokeOptions/InvokeOption.js").default} InvokeOption
   * @typedef {import("./InvokeOptions/CompareObjectOption.js").default} CompareObjectOption
   * @typedef {import("./InvokeOptions/ConvertObjectTypeOption.js").default} ConvertObjectTypeOption
   * @typedef {import("./InvokeOptions/DisposeDelegateOption.js").default} DisposeDelegateOption
   * @typedef {import("./InvokeOptions/DisposeObjectOption.js").default} DisposeObjectOption
   * @typedef {import("./InvokeOptions/GetPropertyOption.js").default} GetPropertyOption
   * @typedef {import("./InvokeOptions/InvokeFunctionOption.js").default} InvokeFunctionOption
   * @typedef {import("./InvokeOptions/SetPropertyOption.js").default} SetPropertyOption
   */

  function attachDotNetRevivers() {
    if (typeof globalThis.DotNet === "undefined") {
      setTimeout(attachDotNetRevivers, 10);
      return;
    }
    globalThis.DotNet.attachReviver(DelegateReferenceReviver.revive.bind(DelegateReferenceReviver));
    globalThis.DotNet.attachReviver(ObjectBindingConfigurationReviver.revive.bind(ObjectBindingConfigurationReviver));
    globalThis.DotNet.attachReviver(ObjectReferenceReviver.revive.bind(ObjectReferenceReviver));
  }

  class JsBindNet {
    constructor() {
      attachDotNetRevivers();
    }

    /**
     * Compare objects.
     * @param {CompareObjectOption} compareObjectOption
     * @returns {InvokeResult}
     */
    CompareObject(compareObjectOption) {
      const obj1 = JsObjectHandler.getObjectFromAccessPath(compareObjectOption.object1AccessPath);
      const obj2 = JsObjectHandler.getObjectFromAccessPath(compareObjectOption.object2AccessPath);
      return this._getReturnValue(obj1 === obj2, compareObjectOption);
    }

    /**
     * Convert object type.
     * @param {ConvertObjectTypeOption} convertObjectTypeOption
     * @returns {InvokeResult}
     */
    ConvertObjectType(convertObjectTypeOption) {
      const obj = JsObjectHandler.getObjectFromAccessPath(convertObjectTypeOption.accessPath);
      return this._getReturnValue(obj, convertObjectTypeOption);
    }

    /**
     * Dispose delegate reference.
     * @param {DisposeDelegateOption} disposeDelegateOption
     */
    DisposeDelegate(disposeDelegateOption) {
      DelegateReferenceHandler.removeDelegateReference(disposeDelegateOption.delegateId);
    }

    /**
     * Dispose object reference.
     * @param {DisposeObjectOption} disposeObjectOption
     */
    DisposeObject(disposeObjectOption) {
      JsObjectHandler.removeObjectReference(disposeObjectOption.referenceId);
    }

    /**
     * Dispose session.
     */
    DisposeSession() {
      JsObjectHandler.clearObjectReferences();
      DelegateReferenceHandler.clearDelegateReferences();
    }

    /**
     * Get the property value of an object.
     * @param {GetPropertyOption} getPropertyOption
     * @returns {InvokeResult}
     */
    GetProperty(getPropertyOption) {
      const targetObject = JsObjectHandler.getObjectFromAccessPath(getPropertyOption.accessPath);
      if (targetObject === undefined || targetObject === null) {
        return this._getErrorReturnValue(`Target object '${getPropertyOption.accessPath}' is null or undefined.`);
      }
      const returnValue = targetObject[getPropertyOption.propertyName];
      getPropertyOption.getReturnValueAccessPath = function () {
        return AccessPaths.combine(getPropertyOption.accessPath, getPropertyOption.propertyName);
      };
      return this._getReturnValue(returnValue, getPropertyOption);
    }

    /**
     * Set the property value of an object.
     * @param {SetPropertyOption} setPropertyOption
     * @returns {InvokeResult}
     */
    SetProperty(setPropertyOption) {
      const targetObject = JsObjectHandler.getObjectFromAccessPath(setPropertyOption.accessPath);
      if (targetObject === undefined || targetObject === null) {
        return this._getErrorReturnValue(`Target object '${setPropertyOption.accessPath}' is null or undefined.`);
      }
      targetObject[setPropertyOption.propertyName] = setPropertyOption.propertyValue;
      return null;
    }

    /**
     * Invoke a function on an object.
     * @param {InvokeFunctionOption} invokeFunctionOption
     * @returns {InvokeResult}
     */
    InvokeFunction(invokeFunctionOption) {
      try {
        const returnValue = this._invokeFunctionInternal(invokeFunctionOption);
        if (invokeFunctionOption.hasReturnValue) {
          invokeFunctionOption.getReturnValueAccessPath = function () {
            return AccessPaths.fromReferenceId(invokeFunctionOption.returnValueReferenceId);
          };
        }
        return this._getReturnValue(returnValue, invokeFunctionOption);
      } catch (error) {
        console.error(error);
        return this._getErrorReturnValue(error.message, error.stack);
      }
    }

    /**
     * Invoke a function on an object asynchronously.
     * @param {InvokeFunctionOption} invokeFunctionOption
     * @returns {Promise<InvokeResult>}
     */
    async InvokeFunctionAsync(invokeFunctionOption) {
      try {
        let returnValue = this._invokeFunctionInternal(invokeFunctionOption);
        if (returnValue instanceof Promise) {
          returnValue = await returnValue;
        }
        if (invokeFunctionOption.hasReturnValue) {
          invokeFunctionOption.getReturnValueAccessPath = function () {
            return AccessPaths.fromReferenceId(this.returnValueReferenceId);
          };
        }
        return this._getReturnValue(returnValue, invokeFunctionOption);
      } catch (error) {
        console.error(error);
        return this._getErrorReturnValue(error.message, error.stack);
      }
    }

    /**
     * Get the object references.
     * @returns {object} The object references.
     */
    getObjectReferences() { return JsObjectHandler.getObjectReferences(); }

    /**
     * Get the count of the object references.
     * @returns {number} The count of the object references.
     */
    getObjectReferencesCount() { return JsObjectHandler.getObjectReferencesCount(); }

    /**
     * Get the delegate references.
     * @returns {object} The delegate references.
     */
    getDelegateReferences() { return DelegateReferenceHandler.getDelegateReferences(); }

    /**
     * Get the count of the delegate references.
     * @returns {number} The count of the delegate references.
     */
    getDelegateReferencesCount() { return DelegateReferenceHandler.getDelegateReferencesCount(); }

    /**
     * Get the return value wrapped in InvokeResult.
     * @param {any} returnValue
     * @param {InvokeOption} invokeOption
     * @returns {InvokeResult}
     */
    _getReturnValue(returnValue, invokeOption) {
      if (invokeOption.hasReturnValue) {
        if (returnValue === null || returnValue === undefined) {
          return new InvokeResult(null);
        }

        if (invokeOption.returnValueIsReference) {
          JsObjectHandler.addObjectReference(invokeOption.returnValueReferenceId, returnValue);
        }

        const returnValueAccessPath = invokeOption.getReturnValueAccessPath ? invokeOption.getReturnValueAccessPath() : null;
        const value = ObjectBindingHandler.getValueFromBinding(returnValue, invokeOption.returnValueBinding, returnValueAccessPath);
        return new InvokeResult(value);
      }
      return null;
    }

    /**
     * Get the error wrapped in InvokeResult.
     * @param {string} errorMessage
     * @param {string} [stackTrace]
     * @returns {InvokeResult}
     */
    _getErrorReturnValue(errorMessage, stackTrace) {
      return new InvokeResult(null, true, errorMessage, stackTrace);
    }

    /**
     * Invoke a function on an object.
     * @param {InvokeFunctionOption} invokeFunctionOption
     */
    _invokeFunctionInternal(invokeFunctionOption) {
      const targetObject = JsObjectHandler.getObjectFromAccessPath(invokeFunctionOption.accessPath);
      if (targetObject === undefined || targetObject === null) {
        throw new Error("Target object is null or undefined.");
      }

      const targetFunction = invokeFunctionOption.functionName ? targetObject[invokeFunctionOption.functionName] : targetObject;
      if (!targetFunction || !(targetFunction instanceof Function)) {
        if (invokeFunctionOption.functionName) {
          throw new Error(`Member ${invokeFunctionOption.functionName} on target object is not a function.`);
        } else {
          throw new Error(`Target object is not a function.`);
        }
      }

      return targetFunction.apply(targetObject, invokeFunctionOption.functionArguments);
    }
  }

  globalThis.JsBindNet = new JsBindNet();

})();
