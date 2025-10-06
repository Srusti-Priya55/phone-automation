// Simple form server that will later call Jenkins
const path = require('path');
const express = require('express');
const fetch = require('node-fetch'); // Node 16/18 compatible
require('dotenv').config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Basic auth header for Jenkins
function jenkinsAuth() {
  const u = process.env.JENKINS_USER || '';
  const t = process.env.JENKINS_API_TOKEN || '';
  return 'Basic ' + Buffer.from(`${u}:${t}`).toString('base64');
}

// (We’ll wire this in Step 2)
app.post('/trigger', async (req, res) => {
  res.status(200).send('UI is up. We will hook this to Jenkins in Step 2.');
});

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`UI running at http://localhost:${port}`)
);