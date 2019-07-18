import ObjectSchema = Realm.ObjectSchema;

export const EventSchema: ObjectSchema = {
  name: 'Event',
  primaryKey: 'id',
  properties: {
    id: {type: 'string'},
    title: {type: 'string'},
    location: {type: 'string'},
    startDatetime: {type: 'date'},
    endDatetime: {type: 'date'},
    description: {type: 'string'},
    viewPublic: {type: 'bool'},
  }
};
