'use strict';

exports.__esModule = true;
exports.arrayOf = arrayOf;
exports.valuesOf = valuesOf;
exports.normalize = normalize;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _EntitySchema = require('./EntitySchema');

var _EntitySchema2 = _interopRequireDefault(_EntitySchema);

var _IterableSchema = require('./IterableSchema');

var _IterableSchema2 = _interopRequireDefault(_IterableSchema);

var _lodashLangIsObject = require('lodash/lang/isObject');

var _lodashLangIsObject2 = _interopRequireDefault(_lodashLangIsObject);

var _lodashLangIsEqual = require('lodash/lang/isEqual');

var _lodashLangIsEqual2 = _interopRequireDefault(_lodashLangIsEqual);

var _lodashObjectMapValues = require('lodash/object/mapValues');

var _lodashObjectMapValues2 = _interopRequireDefault(_lodashObjectMapValues);

function defaultAssignEntity(normalized, key, entity) {
  normalized[key] = entity;
}

function visitObject(obj, schema, bag, options) {
  var _options$assignEntity = options.assignEntity;
  var assignEntity = _options$assignEntity === undefined ? defaultAssignEntity : _options$assignEntity;

  var normalized = {};
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      var entity = visit(obj[key], obj, schema[key], bag, options);
      assignEntity.call(null, normalized, key, entity);
    }
  }
  return normalized;
}

function defaultMapper(iterableSchema, itemSchema, bag, options, parent) {
  return function (obj) {
    return visit(obj, parent, itemSchema, bag, options);
  };
}

function polymorphicMapper(iterableSchema, itemSchema, bag, options, parent) {
  return function (obj) {
    var schemaKey = iterableSchema.getSchemaKey(obj);
    var result = visit(obj, parent, itemSchema[schemaKey], bag, options);
    return { id: result, schema: schemaKey };
  };
}

function visitIterable(obj, parent, iterableSchema, bag, options) {
  var isPolymorphicSchema = iterableSchema.isPolymorphicSchema();
  var itemSchema = iterableSchema.getItemSchema();
  var itemMapper = isPolymorphicSchema ? polymorphicMapper : defaultMapper;
  var curriedItemMapper = itemMapper(iterableSchema, itemSchema, bag, options, parent);

  if (Array.isArray(obj)) {
    return obj.map(curriedItemMapper);
  } else {
    return _lodashObjectMapValues2['default'](obj, curriedItemMapper);
  }
}

function mergeIntoEntity(entityA, entityB, entityKey) {
  for (var key in entityB) {
    if (!entityB.hasOwnProperty(key)) {
      continue;
    }

    if (!entityA.hasOwnProperty(key) || _lodashLangIsEqual2['default'](entityA[key], entityB[key])) {
      entityA[key] = entityB[key];
      continue;
    }

    console.warn('When merging two ' + entityKey + ', found unequal data in their "' + key + '" values. Using the earlier value.', entityA[key], entityB[key]);
  }
}

function visitEntity(entity, parent, entitySchema, bag, options) {
  var entityKey = entitySchema.getKey();
  var id = entitySchema.getId(entity, parent);

  if (!bag[entityKey]) {
    bag[entityKey] = {};
  }

  if (!bag[entityKey][id]) {
    bag[entityKey][id] = {};
  }

  var stored = bag[entityKey][id];
  var normalized = visitObject(entity, entitySchema, bag, options);
  mergeIntoEntity(stored, normalized, entityKey);

  return id;
}

function visit(obj, parent, schema, bag, options) {
  if (!_lodashLangIsObject2['default'](obj) || !_lodashLangIsObject2['default'](schema)) {
    return obj;
  }

  if (schema instanceof _EntitySchema2['default']) {
    return visitEntity(obj, parent, schema, bag, options);
  } else if (schema instanceof _IterableSchema2['default']) {
    return visitIterable(obj, parent, schema, bag, options);
  } else {
    return visitObject(obj, schema, bag, options);
  }
}

function arrayOf(schema, options) {
  return new _IterableSchema2['default'](schema, options);
}

function valuesOf(schema, options) {
  return new _IterableSchema2['default'](schema, options);
}

exports.Schema = _EntitySchema2['default'];

function normalize(obj, schema) {
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

  if (!_lodashLangIsObject2['default'](obj) && !Array.isArray(obj)) {
    throw new Error('Normalize accepts an object or an array as its input.');
  }

  if (!_lodashLangIsObject2['default'](schema) || Array.isArray(schema)) {
    throw new Error('Normalize accepts an object for schema.');
  }

  var bag = {};
  var result = visit(obj, obj, schema, bag, options);

  return {
    entities: bag,
    result: result
  };
}