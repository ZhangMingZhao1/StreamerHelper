import * as express from 'express';
import * as cors from 'cors';

import anchor from './anchor';

const app = express();
app.use(cors());

const port = 2333;

app.get('/', (req, res) => {
  res.send('666');
});

app.use('/anchor', anchor);

app.listen(port, () => {
  console.log('2333');
});
