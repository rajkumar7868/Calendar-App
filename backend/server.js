const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const eventRoutes = require('./routes/events');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const store = {
  events: [
    // sample:
    // { id: 'evt1', title: 'Standup', start: '2025-10-02T10:00:00.000Z', end: '2025-10-02T11:00:00.000Z', participants: ['user1'], color:'#4caf50' }
  ]
};
app.use((req,res,next)=>{ req.store = store; next(); });

app.use('/', eventRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
