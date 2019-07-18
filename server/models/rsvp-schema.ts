import ObjectSchema = Realm.ObjectSchema;

export const RsvpSchema: ObjectSchema = {
  name: 'Rsvp',
  primaryKey: 'id',
  properties: {
    id: {type: 'string'},
    userId: {type: 'string'},
    name: {type: 'date'},
    eventId: {type: 'string'},
    attending: {type: 'bool'},
    guests: {type: 'int'},
    comments: {type: 'string'}
  }
};
