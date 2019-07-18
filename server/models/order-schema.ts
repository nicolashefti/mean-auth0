import ObjectSchema = Realm.ObjectSchema;

export const OrderSchema: ObjectSchema = {
  name: 'Order',
  primaryKey: 'id',
  properties: {
    id: {type: 'string'},
    fsId: {type: 'string'},
    userId: {type: 'string'}
  }
};
