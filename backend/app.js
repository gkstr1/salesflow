require('dotenv').config();
const express = require('express');
const leadsRouter = require('./routes/leads');
const companiesRouter = require('./routes/companies');
const pipelineRouter = require('./routes/pipeline');
const outreachRouter = require('./routes/outreach');
const activityRouter = require('./routes/activity');
const aiRouter = require('./routes/ai');
const sequencesRouter = require('./routes/sequences');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.use('/api/leads', leadsRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/pipeline', pipelineRouter);
app.use('/api/outreach', outreachRouter);
app.use('/api/activity', activityRouter);
app.use('/api/ai', aiRouter);
app.use('/api/sequences', sequencesRouter);

app.use(errorHandler);

module.exports = app;
