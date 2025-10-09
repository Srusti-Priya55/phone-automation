// ui/server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');        // ^2.x
const schedule = require('node-schedule');  // scheduling

const app = express();
const PORT = Number(process.env.PORT || 3000);

// -------- ENV (accept your current names too) --------
const JENKINS_URL   = process.env.JENKINS_URL;
const JENKINS_USER  = process.env.JENKINS_USER;
const JENKINS_TOKEN = process.env.JENKINS_TOKEN || process.env.JENKINS_API_TOKEN;
const JOB_NAME      = process.env.JOB_NAME || process.env.JENKINS_JOB || 'Mobile_Sanity_Suite_SingleHTML';

// Serve UI + JSON
app.use(express.json({ limit: '2mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ---- helpers ----
function requireJenkinsConfig() {
  if (!JENKINS_URL || !JENKINS_USER || !JENKINS_TOKEN) {
    throw new Error('Server missing JENKINS_URL/JENKINS_USER/JENKINS_TOKEN');
  }
}
function basicAuthHeader() {
  const pair = Buffer.from(`${JENKINS_USER}:${JENKINS_TOKEN}`).toString('base64');
  return { Authorization: `Basic ${pair}` };
}
async function getCrumb() {
  const r = await fetch(`${JENKINS_URL}/crumbIssuer/api/json`, { headers: basicAuthHeader() });
  if (!r.ok) {
    const txt = await r.text().catch(()=>'');
    throw new Error(`Crumb fetch failed: ${r.status} ${txt}`);
  }
  return r.json();
}

// Map UI suite names -> Jenkins parameter names (same in your Jenkinsfile)
const SUITE_PARAM_MAP = {
  install_adb: 'install_adb',
  install_play: 'install_play',
  aggregation_check: 'aggregation_check',
  tnd_check: 'tnd_check',
  collection_mode_all: 'collection_mode_all',
  collection_mode_trusted: 'collection_mode_trusted',
  collection_mode_untrusted: 'collection_mode_untrusted',
  interface_info: 'interface_info',
  ipfix_disable: 'ipfix_disable',
  ipfix_zero: 'ipfix_zero',
  parent_process_check: 'parent_process_check',
  template_caching_untrusted: 'template_caching_untrusted',
  before_after_reboot: 'before_after_reboot',
  aup_should_displayed: 'aup_should_displayed',
  aup_should_not_displayed: 'aup_should_not_displayed',
  eula_not_accepted: 'eula_not_accepted',
  negatives: 'negatives',
};

// Build the Jenkins form body from UI payload
function buildFormFromPayload(payload) {
  const suites = payload.suites || {};
  const runAll = !!suites.RUN_ALL;
  const emails = Array.isArray(payload.emails) ? payload.emails : [];

  if (emails.length === 0) throw new Error('Add at least one recipient');

  const form = new URLSearchParams();
  form.append('RUN_ALL', runAll ? 'true' : 'false');
  form.append('EMAILS', emails.join(','));

  if (!runAll) {
    let any = false;
    for (const [uiName, jenkinsName] of Object.entries(SUITE_PARAM_MAP)) {
      if (suites[uiName]) {
        form.append(jenkinsName, 'true');
        any = true;
      }
    }
    if (!any) throw new Error('Pick at least one suite or enable RUN_ALL');
  }
  return form;
}

// Actually queue the Jenkins build
async function queueBuild(form) {
  requireJenkinsConfig();
  const crumb = await getCrumb();

  const r = await fetch(
    `${JENKINS_URL}/job/${encodeURIComponent(JOB_NAME)}/buildWithParameters`,
    {
      method: 'POST',
      headers: {
        ...basicAuthHeader(),
        [crumb.crumbRequestField]: crumb.crumb,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString(),
    }
  );

  if (r.status !== 201) {
    const txt = await r.text().catch(()=> '');
    throw new Error(`Jenkins refused build: ${r.status} ${txt}`);
  }
  return r.headers.get('location') || '(no queue url)';
}

// In-memory scheduled jobs (non-persistent)
const scheduled = new Map(); // id -> { job, meta }

// ---- time utilities (server local time) ----
function parseHHMM(hhmm) {
  // "19:00" -> {hour:19, minute:0}
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!m) throw new Error('Time must be HH:MM');
  const hour = Number(m[1]), minute = Number(m[2]);
  if (hour<0 || hour>23 || minute<0 || minute>59) throw new Error('Time out of range');
  return { hour, minute };
}
function weekdayToNumber(name) {
  // node-schedule: 0=Sunday ... 6=Saturday
  const map = {
    sunday:0, monday:1, tuesday:2, wednesday:3,
    thursday:4, friday:5, saturday:6
  };
  const n = map[String(name||'').toLowerCase()];
  if (n===undefined) throw new Error(`Bad weekday: ${name}`);
  return n;
}

// -------- main endpoint used by the UI --------
app.post('/trigger', async (req, res) => {
  try {
    const payload = req.body || {};
    const mode = payload.mode || 'now';

    if (mode === 'now') {
      const form = buildFormFromPayload(payload);
      const queueUrl = await queueBuild(form);
      return res.status(200).send(`Build queued: ${queueUrl}`);
    }

    if (mode === 'schedule') {
      const sch = payload.schedule || {};
      const form = buildFormFromPayload(payload);

      // 1) Run Once (ISO date string in sch.at)
      if (sch.type === 'once') {
        if (!sch.at) return res.status(400).send('Missing schedule.at');
        const when = new Date(sch.at);
        if (isNaN(when.getTime())) return res.status(400).send('schedule.at is not a valid date');
        if (when.getTime() <= Date.now() + 5_000) return res.status(400).send('Pick a time in the future');

        const id = `once-${Date.now()}-${Math.floor(Math.random()*1e6)}`;
        const job = schedule.scheduleJob(id, when, async () => {
          try { console.log(`[${id}] firing once`); await queueBuild(form); }
          catch (e) { console.error(`[${id}] error:`, e?.message || e); }
          finally { scheduled.delete(id); }
        });
        scheduled.set(id, { job, meta: { type:'once', when: when.toISOString() } });
        return res.status(200).send(`Scheduled once for ${when.toISOString()} (id: ${id})`);
      }

      // 2) Daily at time (sch.time = "HH:MM")
      if (sch.type === 'daily') {
        if (!sch.time) return res.status(400).send('Missing schedule.time');
        const { hour, minute } = parseHHMM(sch.time);

        const id = `daily-${hour}-${minute}-${Date.now()}`;
        const rule = new schedule.RecurrenceRule();
        rule.tz = undefined;         // server local time
        rule.hour = hour;
        rule.minute = minute;

        const job = schedule.scheduleJob(id, rule, async () => {
          try { console.log(`[${id}] firing daily`); await queueBuild(form); }
          catch (e) { console.error(`[${id}] error:`, e?.message || e); }
        });

        scheduled.set(id, { job, meta: { type:'daily', time: sch.time } });
        return res.status(200).send(`Scheduled daily at ${sch.time} (id: ${id})`);
      }

      // 3) Weekly at time on specific days (sch.time + sch.days[]) 
      if (sch.type === 'weekly') {
        if (!sch.time) return res.status(400).send('Missing schedule.time');
        const days = Array.isArray(sch.days) ? sch.days : [];
        if (days.length === 0) return res.status(400).send('Pick at least one day');
        const { hour, minute } = parseHHMM(sch.time);
        const dayNumbers = days.map(weekdayToNumber); // e.g. ['Monday','Wednesday']

        const id = `weekly-${hour}-${minute}-${Date.now()}`;
        const rule = new schedule.RecurrenceRule();
        rule.tz = undefined; // server local time
        rule.dayOfWeek = dayNumbers; // array accepted
        rule.hour = hour;
        rule.minute = minute;

        const job = schedule.scheduleJob(id, rule, async () => {
          try { console.log(`[${id}] firing weekly`); await queueBuild(form); }
          catch (e) { console.error(`[${id}] error:`, e?.message || e); }
        });

        scheduled.set(id, { job, meta: { type:'weekly', time: sch.time, days } });
        return res.status(200).send(`Scheduled weekly ${days.join(', ')} at ${sch.time} (id: ${id})`);
      }

      return res.status(400).send('Unknown schedule.type (use once|daily|weekly)');
    }

    return res.status(400).send('mode must be "now" or "schedule"');
  } catch (err) {
    return res.status(500).send(String(err?.message || err));
  }
});

// (optional) quick health & debug
app.get('/health', (_, res) => res.send('OK'));
app.get('/_scheduled', (_, res) => res.json({
  now: new Date().toISOString(),
  items: Array.from(scheduled.entries()).map(([id, v]) => ({ id, meta: v.meta }))
}));

app.listen(PORT, () => {
  console.log(`UI listening at http://localhost:${PORT}`);
});
