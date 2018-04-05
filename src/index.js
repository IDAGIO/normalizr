import EntitySchema from './EntitySchema';
import IterableSchema from './IterableSchema';
import isObject from 'lodash/lang/isObject';
import isEqual from 'lodash/lang/isEqual';
import mapValues from 'lodash/object/mapValues';

function defaultAssignEntity(normalized, key, entity) {
  normalized[key] = entity;
}

function visitObject(obj, schema, bag, options) {
  const { assignEntity = defaultAssignEntity } = options;

  let normalized = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      const entity = visit(obj[key], obj, schema[key], bag, options);
      assignEntity.call(null, normalized, key, entity);
    }
  }
  return normalized;
}

function defaultMapper(iterableSchema, itemSchema, bag, options, parent) {
  return (obj) => visit(obj, parent, itemSchema, bag, options);
}

function polymorphicMapper(iterableSchema, itemSchema, bag, options, parent) {
  return (obj) => {
    const schemaKey = iterableSchema.getSchemaKey(obj);
    const result = visit(obj, parent, itemSchema[schemaKey], bag, options);
    return { id: result, schema: schemaKey };
  };
}

function visitIterable(obj, parent, iterableSchema, bag, options) {
  const isPolymorphicSchema = iterableSchema.isPolymorphicSchema();
  const itemSchema = iterableSchema.getItemSchema();
  const itemMapper = isPolymorphicSchema ? polymorphicMapper : defaultMapper;
  const curriedItemMapper = itemMapper(iterableSchema, itemSchema, bag, options, parent);

  if (Array.isArray(obj)) {
    return obj.map(curriedItemMapper);
  } else {
    return mapValues(obj, curriedItemMapper);
  }
}


function mergeIntoEntity(entityA, entityB, entityKey) {
  for (let key in entityB) {
    if (!entityB.hasOwnProperty(key)) {
      continue;
    }

    if (!entityA.hasOwnProperty(key) || isEqual(entityA[key], entityB[key])) {
      entityA[key] = entityB[key];
      continue;
    }

    console.warn(
      'When merging two ' + entityKey + ', found unequal data in their "' + key + '" values. Using the earlier value.',
      entityA[key], entityB[key]
    );
  }
}

function visitEntity(entity, parent, entitySchema, bag, options) {
  const entityKey = entitySchema.getKey();
  const id = entitySchema.getId(entity, parent);

  if (!bag[entityKey]) {
    bag[entityKey] = {};
  }

  if (!bag[entityKey][id]) {
    bag[entityKey][id] = {};
  }

  let stored = bag[entityKey][id];
  let normalized = visitObject(entity, entitySchema, bag, options);
  mergeIntoEntity(stored, normalized, entityKey);

  return id;
}

function visit(obj, parent, schema, bag, options) {
  if (!isObject(obj) || !isObject(schema)) {
    return obj;
  }

  if (schema instanceof EntitySchema) {
    return visitEntity(obj, parent, schema, bag, options);
  } else if (schema instanceof IterableSchema) {
    return visitIterable(obj, parent, schema, bag, options);
  } else {
    return visitObject(obj, schema, bag, options);
  }
}

export function arrayOf(schema, options) {
  return new IterableSchema(schema, options);
}

export function valuesOf(schema, options) {
  return new IterableSchema(schema, options);
}

export { EntitySchema as Schema };

export function normalize(obj, schema, options = {}) {
  if (!isObject(obj) && !Array.isArray(obj)) {
    throw new Error('Normalize accepts an object or an array as its input.');
  }

  if (!isObject(schema) || Array.isArray(schema)) {
    throw new Error('Normalize accepts an object for schema.');
  }

  let bag = {};
  let result = visit(obj, obj, schema, bag, options);

  return {
    entities: bag,
    result
  };
}
