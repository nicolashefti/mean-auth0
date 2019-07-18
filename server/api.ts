import Event from './models/Event';
import Rsvp from './models/Rsvp';
import Order from './models/Order';
import * as jwt from 'express-jwt';
import * as jwks from 'jwks-rsa';
import * as  request from 'request';
import * as express from 'express';
import * as Realm from 'realm';
import {EventSchema} from './models/event-schema';
import {RsvpSchema} from './models/rsvp-schema';
import {OrderSchema} from './models/order-schema';

const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const cors = require('cors');
// Config
const config = require('./config');

const realm = new Realm({
  schema: [
    EventSchema,
    RsvpSchema,
    OrderSchema
  ],
  path: './data/mean.realm'
});

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(cors());

// Set port
const port = process.env.PORT || '8083';
app.set('port', port);

// Set static path to Angular app in dist
// Don't run in dev
if (process.env.NODE_ENV !== 'dev') {
  app.use('/', express.static(path.join(__dirname, './dist')));
}

// Authentication middleware
const jwtCheck = jwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${config.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: config.AUTH0_API_AUDIENCE,
  issuer: `https://${config.AUTH0_DOMAIN}/`,
  algorithm: 'RS256'
});

// Check for an authenticated admin user
const adminCheck = (req, res, next) => {
  const roles = req.user[config.NAMESPACE] || [];
  console.log(roles, req.user, config.NAMESPACE);
  if (roles.indexOf('admin') > -1) {
    next();
  } else {
    res.status(401).send({message: 'Not authorized for admin access'});
  }
};


const _eventListProjection = 'title startDatetime endDatetime viewPublic';

// GET API root
app.get('/api/', (req, res) => {
  res.send('API works');
});

app.get('/api/events', (req, res) => {
  const events = realm.objects('Event');
  const eventsArr = [];
  events.forEach(event => {
    eventsArr.push(event);
  });

  res.send(eventsArr);
});

// GET list of all events, public and private (admin only)
app.get('/api/events/admin', jwtCheck, adminCheck, (req, res) => {
  Event.find({}, _eventListProjection, (err, events) => {
      const eventsArr = [];
      if (err) {
        return res.status(500).send({message: err.message});
      }
      if (events) {
        events.forEach(event => {
          eventsArr.push(event);
        });
      }
      res.send(eventsArr);
    }
  );
});

// GET event by event ID
app.get('/api/event/:id', jwtCheck, (req, res) => {
  const event = realm.objects('Event').filtered(`id='${req.params.id}'`);

  if (!event) {
    return res.status(400).send({message: 'Event not found.'});
  }
  res.send(event);
});

// GET RSVPs by event ID
app.get('/api/event/:eventId/rsvps', jwtCheck, (req, res) => {
  Rsvp.find({eventId: req.params.eventId}, (err, rsvps) => {
    let rsvpsArr = [];
    if (err) {
      return res.status(500).send({message: err.message});
    }
    if (rsvps) {
      rsvps.forEach(rsvp => {
        rsvpsArr.push(rsvp);
      });
    }
    res.send(rsvpsArr);
  });
});

// GET list of upcoming events user has RSVPed to
app.get('/api/events/:userId', jwtCheck, (req, res) => {
  Rsvp.find({userId: req.params.userId}, 'eventId', (err, rsvps) => {
    const _eventIdsArr = rsvps.map(rsvp => rsvp.eventId);
    const _rsvpEventsProjection = 'title startDatetime endDatetime';
    let eventsArr = [];

    if (err) {
      return res.status(500).send({message: err.message});
    }
    if (rsvps) {
      Event.find(
        {_id: {$in: _eventIdsArr}, startDatetime: {$gte: new Date()}},
        _rsvpEventsProjection, (err, events) => {
          if (err) {
            return res.status(500).send({message: err.message});
          }
          if (events) {
            events.forEach(event => {
              eventsArr.push(event);
            });
          }
          res.send(eventsArr);
        });
    }
  });
});

// POST a new event
app.post('/api/event/new', jwtCheck, adminCheck, (req, res) => {
  Event.findOne({
    title: req.body.title,
    location: req.body.location,
    startDatetime: req.body.startDatetime
  }, (err, existingEvent) => {
    if (err) {
      return res.status(500).send({message: err.message});
    }
    if (existingEvent) {
      return res.status(409).send({message: 'You have already created an event with this title, location, and start date/time.'});
    }
    const event = new Event({
      title: req.body.title,
      location: req.body.location,
      startDatetime: req.body.startDatetime,
      endDatetime: req.body.endDatetime,
      description: req.body.description,
      viewPublic: req.body.viewPublic
    });
    event.save((err) => {
      if (err) {
        return res.status(500).send({message: err.message});
      }
      res.send(event);
    });
  });
});

// PUT (edit) an existing event
app.put('/api/event/:id', jwtCheck, adminCheck, (req, res) => {
  Event.findById(req.params.id, (err, event) => {
    if (err) {
      return res.status(500).send({message: err.message});
    }
    if (!event) {
      return res.status(400).send({message: 'Event not found.'});
    }
    event.title = req.body.title;
    event.location = req.body.location;
    event.startDatetime = req.body.startDatetime;
    event.endDatetime = req.body.endDatetime;
    event.viewPublic = req.body.viewPublic;
    event.description = req.body.description;

    event.save(err => {
      if (err) {
        return res.status(500).send({message: err.message});
      }
      res.send(event);
    });
  });
});

// DELETE an event and all associated RSVPs
app.delete('/api/event/:id', jwtCheck, adminCheck, (req, res) => {
  Event.findById(req.params.id, (err, event) => {
    if (err) {
      return res.status(500).send({message: err.message});
    }
    if (!event) {
      return res.status(400).send({message: 'Event not found.'});
    }
    Rsvp.find({eventId: req.params.id}, (err, rsvps) => {
      if (rsvps) {
        rsvps.forEach(rsvp => {
          rsvp.remove();
        });
      }
      event.remove(err => {
        if (err) {
          return res.status(500).send({message: err.message});
        }
        res.status(200).send({message: 'Event and RSVPs successfully deleted.'});
      });
    });
  });
});

// POST a new RSVP
app.post('/api/rsvp/new', jwtCheck, (req, res) => {
  Rsvp.findOne({eventId: req.body.eventId, userId: req.body.userId}, (err, existingRsvp) => {
    if (err) {
      return res.status(500).send({message: err.message});
    }
    if (existingRsvp) {
      return res.status(409).send({message: 'You have already RSVPed to this event.'});
    }
    const rsvp = new Rsvp({
      userId: req.body.userId,
      name: req.body.name,
      eventId: req.body.eventId,
      attending: req.body.attending,
      guests: req.body.guests,
      comments: req.body.comments
    });
    rsvp.save((err) => {
      if (err) {
        return res.status(500).send({message: err.message});
      }
      res.send(rsvp);
    });
  });
});

// PUT (edit) an existing RSVP
app.put('/api/rsvp/:id', jwtCheck, (req, res) => {
  Rsvp.findById(req.params.id, (err, rsvp) => {
    if (err) {
      return res.status(500).send({message: err.message});
    }
    if (!rsvp) {
      return res.status(400).send({message: 'RSVP not found.'});
    }
    if (rsvp.userId !== req.user.sub) {
      return res.status(401).send({message: 'You cannot edit someone else\'s RSVP.'});
    }
    rsvp.name = req.body.name;
    rsvp.attending = req.body.attending;
    rsvp.guests = req.body.guests;
    rsvp.comments = req.body.comments;

    rsvp.save(err => {
      if (err) {
        return res.status(500).send({message: err.message});
      }
      res.send(rsvp);
    });
  });
});

app.get('/api/orders', (req, res) => {
  const username = config.FS_API_USERNAME;
  const password = config.FS_API_PASSWORD;
  const url = 'https://' + username + ':' + password + '@api.fastspring.com/orders';

  request.get(url, {
      headers: {
        'User-Agent': 'APPIZY Backend'
      }
    },
    function (error, response, body) {
      if (error) {
        return console.error('upload failed:', error);
      }

      console.log('error:', error); // Print the error if one occurred
      console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received

      res.send(JSON.parse(body));
    });
});

app.post('/api/order-validate', (req, res) => {
  Order.findOne({
    fsId: req.body.orderId
  }, (err, existingEvent) => {
    if (err) {
      return res.status(500).send({message: err.message});
    }
    if (existingEvent) {
      return res.status(409).send({message: 'You have already created an event with this title, location, and start date/time.'});
    }
    const event = new Order({
      fsId: req.body.orderId,
      // userId: req.user.sub
      userId: 'userId'
    });
    event.save((err) => {
      if (err) {
        return res.status(500).send({message: err.message});
      }
      res.send(event);
    });
  });
});
app.listen(port, () => console.log(`Server running on localhost:${port}`));

